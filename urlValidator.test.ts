import { describe, it, expect } from 'vitest';
import { isPrivateIPv4, isPrivateIPv6, isPrivateIP, validateGitHubUrl, validateLiveUrl } from '../src/server/urlValidator.ts';

describe('SSRF Protection & IP Validation', () => {
  it('detects private IPv4 addresses correctly', () => {
    // Loopback
    expect(isPrivateIPv4('127.0.0.1')).toBe(true);
    expect(isPrivateIPv4('127.255.255.255')).toBe(true);

    // Class A private (10.0.0.0/8)
    expect(isPrivateIPv4('10.0.0.1')).toBe(true);
    expect(isPrivateIPv4('10.254.1.20')).toBe(true);

    // Class B private (172.16.0.0/12)
    expect(isPrivateIPv4('172.16.0.1')).toBe(true);
    expect(isPrivateIPv4('172.31.255.254')).toBe(true);
    expect(isPrivateIPv4('172.32.0.1')).toBe(false); // Public

    // Class C private (192.168.0.0/16)
    expect(isPrivateIPv4('192.168.1.1')).toBe(true);
    expect(isPrivateIPv4('192.168.100.50')).toBe(true);

    // Link-local / AWS / GCP cloud metadata (169.254.169.254)
    expect(isPrivateIPv4('169.254.169.254')).toBe(true);

    // Public IPs should return false
    expect(isPrivateIPv4('8.8.8.8')).toBe(false); // Google DNS
    expect(isPrivateIPv4('1.1.1.1')).toBe(false); // Cloudflare DNS
    expect(isPrivateIPv4('142.250.190.46')).toBe(false); // Google
  });

  it('detects private IPv6 addresses correctly', () => {
    expect(isPrivateIPv6('::1')).toBe(true);
    expect(isPrivateIPv6('fc00::1')).toBe(true);
    expect(isPrivateIPv6('fd12:3456:789a::1')).toBe(true);
    expect(isPrivateIPv6('fe80::1')).toBe(true);
    expect(isPrivateIPv6('2607:f8b0:4005:805::200e')).toBe(false); // Public Google IPv6
  });

  it('blocks non-HTTPS and localhost URLs from live validation', async () => {
    // Non-https
    const httpRes = await validateLiveUrl('http://insecure-site.com');
    expect(httpRes.valid).toBe(false);
    expect(httpRes.error).toContain('HTTPS');

    // Localhost
    const localRes = await validateLiveUrl('https://localhost:3000');
    expect(localRes.valid).toBe(false);
    expect(localRes.error).toContain('localhost');

    // Local loopback IP
    const loopRes = await validateLiveUrl('https://127.0.0.1:8080');
    expect(loopRes.valid).toBe(false);
    expect(loopRes.error).toContain('Security violation');
  });
});

describe('GitHub URL Validation', () => {
  it('enforces https://github.com/owner/repo format', async () => {
    // Invalid patterns
    const res1 = await validateGitHubUrl('https://gitlab.com/owner/repo');
    expect(res1.valid).toBe(false);

    const res2 = await validateGitHubUrl('https://github.com/just-owner');
    expect(res2.valid).toBe(false);

    const res3 = await validateGitHubUrl('https://github.com/owner/repo/pull/12');
    expect(res3.valid).toBe(false);
  });

  it('validates authentic public repositories', async () => {
    // facebook/react is an established public repository
    const res = await validateGitHubUrl('https://github.com/facebook/react');
    expect(res.valid).toBe(true);
  });

  it('rejects non-existent repositories', async () => {
    const res = await validateGitHubUrl('https://github.com/this-is-a-definitely-fake-user-9992384/nonexistent-repo-999');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('not found');
  });
});
