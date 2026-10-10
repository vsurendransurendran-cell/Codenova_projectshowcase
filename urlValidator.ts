import dns from 'dns/promises';
import http from 'http';
import https from 'https';
import { URL } from 'url';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  statusCode?: number;
  ip?: string;
}

/**
 * Checks if an IPv4 address is in private, link-local, or loopback ranges
 */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  const [a, b] = parts;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 10.0.0.0/8 (Private)
  if (a === 10) return true;
  // 172.16.0.0/12 (Private)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (Link-local / Cloud metadata)
  if (a === 169 && b === 254) return true;
  // 0.0.0.0/8
  if (a === 0) return true;
  // 100.64.0.0/10 (Shared address space)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // Broadcast
  if (a === 255) return true;

  return false;
}

/**
 * Checks if an IPv6 address is in loopback, unique local, or link-local ranges
 */
export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // Unique local (fc00::/7)
  if (normalized.startsWith('fe80:')) return true; // Link-local
  if (normalized.startsWith('::ffff:')) {
    const v4part = normalized.replace('::ffff:', '');
    return isPrivateIPv4(v4part);
  }
  return false;
}

export function isPrivateIP(ip: string): boolean {
  if (ip.includes(':')) {
    return isPrivateIPv6(ip);
  }
  return isPrivateIPv4(ip);
}

/**
 * Validate GitHub repository URL and ensure it points to a real public repo
 */
export async function validateGitHubUrl(rawUrl: string): Promise<ValidationResult> {
  const trimmed = (rawUrl || '').trim();
  const githubRegex = /^https:\/\/github\.com\/([a-zA-Z0-9_\-\.]+)\/([a-zA-Z0-9_\-\.]+)\/?$/;
  const match = trimmed.match(githubRegex);

  if (!match) {
    return {
      valid: false,
      error: 'GitHub URL must follow the format https://github.com/owner/repository',
    };
  }

  const [, owner, repo] = match;
  const cleanRepo = repo.replace(/\.git$/, '');
  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(cleanRepo)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'CampusCraft-Showcase-Bot/1.0 (Educational Project Showcase)',
        Accept: 'application/vnd.github.v3+json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.status === 200) {
      return { valid: true, statusCode: 200 };
    } else if (res.status === 404) {
      return {
        valid: false,
        error: `GitHub repository "${owner}/${cleanRepo}" was not found or is private.`,
        statusCode: 404,
      };
    } else if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
      // Fallback: If GitHub API is rate limited, check public html page
      const htmlCheck = await fetch(`https://github.com/${owner}/${cleanRepo}`, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      if (htmlCheck.status < 400) {
        return { valid: true, statusCode: htmlCheck.status };
      }
      return {
        valid: false,
        error: `GitHub repository "${owner}/${cleanRepo}" could not be confirmed (HTTP ${htmlCheck.status}).`,
        statusCode: htmlCheck.status,
      };
    } else {
      return {
        valid: false,
        error: `GitHub repository check returned status ${res.status}.`,
        statusCode: res.status,
      };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { valid: false, error: 'Verification timed out while contacting GitHub.' };
    }
    return { valid: false, error: `Could not reach GitHub: ${err.message || 'Network error'}` };
  }
}

/**
 * Validate Live Demo URL with strict SSRF protection, DNS re-verification,
 * https scheme check, 5s timeout, and max 3 redirects.
 */
export async function validateLiveUrl(rawUrl: string, maxRedirects = 3): Promise<ValidationResult> {
  let currentUrl = (rawUrl || '').trim();

  for (let hop = 0; hop <= maxRedirects; hop++) {
    let parsed: URL;
    try {
      parsed = new URL(currentUrl);
    } catch {
      return { valid: false, error: 'Demo URL must be a valid, well-formed URL.' };
    }

    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Demo URL must use secure HTTPS protocol (https://).' };
    }

    const hostname = parsed.hostname;
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
      return { valid: false, error: 'Demo URL cannot point to localhost or local network addresses.' };
    }

    // DNS Resolution to check IP against SSRF private ranges
    let addresses: { address: string; family: number }[];
    try {
      addresses = await dns.lookup(hostname, { all: true });
    } catch (dnsErr: any) {
      return { valid: false, error: `Demo URL hostname "${hostname}" could not be resolved in DNS.` };
    }

    if (!addresses || addresses.length === 0) {
      return { valid: false, error: `No DNS records found for host "${hostname}".` };
    }

    for (const record of addresses) {
      if (isPrivateIP(record.address)) {
        return {
          valid: false,
          error: `Security violation: URL resolves to private or reserved IP address (${record.address}).`,
          ip: record.address,
        };
      }
    }

    const primaryIp = addresses[0].address;

    // Perform HTTP HEAD/GET request with timeout
    try {
      const response = await fetchWithTimeout(currentUrl, 5000);

      // Check redirect
      if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
        const redirectLocation = response.headers.get('location')!;
        const nextUrl = new URL(redirectLocation, currentUrl).toString();
        if (hop === maxRedirects) {
          return { valid: false, error: 'Demo URL exceeded maximum allowable redirects (3).' };
        }
        currentUrl = nextUrl;
        continue;
      }

      if (response.status >= 400) {
        return {
          valid: false,
          error: `Demo URL responded with HTTP error status ${response.status}.`,
          statusCode: response.status,
          ip: primaryIp,
        };
      }

      return {
        valid: true,
        statusCode: response.status,
        ip: primaryIp,
      };
    } catch (fetchErr: any) {
      if (fetchErr.name === 'AbortError') {
        return { valid: false, error: 'Demo URL verification timed out after 5 seconds.' };
      }
      return {
        valid: false,
        error: `Demo URL is unreachable: ${fetchErr.message || 'Connection failed'}`,
      };
    }
  }

  return { valid: false, error: 'Too many redirects.' };
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Try HEAD first to save bandwidth
    const res = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'CampusCraft-Showcase-Bot/1.0',
        Accept: 'text/html,*/*',
      },
      redirect: 'manual',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res;
  } catch (err: any) {
    clearTimeout(timer);
    // Some servers reject HEAD requests with 405 or 403, fallback to GET with range
    const getController = new AbortController();
    const getTimer = setTimeout(() => getController.abort(), timeoutMs);
    try {
      const getRes = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'CampusCraft-Showcase-Bot/1.0',
          Accept: 'text/html,*/*',
          Range: 'bytes=0-1024',
        },
        redirect: 'manual',
        signal: getController.signal,
      });
      clearTimeout(getTimer);
      return getRes;
    } catch (fallbackErr) {
      clearTimeout(getTimer);
      throw fallbackErr;
    }
  }
}
