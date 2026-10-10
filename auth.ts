import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { findUserByEmail, findUserById } from './db.ts';

const SESSION_SECRET = process.env.SESSION_SECRET || 'campuscraft-session-secret-salt-2026-min-length';
export const SESSION_COOKIE_NAME = 'cc_admin_session';

interface SessionPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  exp: number;
}

// In-memory rate limiting and lockout tables
interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
}

const loginAttempts = new Map<string, AttemptRecord>();
const submissionLimits = new Map<string, { count: number; resetAt: number }>();

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

/**
 * Signs a payload into a secure HMAC token
 */
export function signSession(payload: Omit<SessionPayload, 'exp'>): string {
  const exp = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const data: SessionPayload = { ...payload, exp };
  const encodedData = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(encodedData).digest('base64url');
  return `${encodedData}.${signature}`;
}

/**
 * Verifies and decodes a session token
 */
export function verifySession(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedData, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encodedData).digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expSigBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expSigBuf.length || !crypto.timingSafeEqual(sigBuf, expSigBuf)) {
    return null;
  }

  try {
    const payload: SessionPayload = JSON.parse(Buffer.from(encodedData, 'base64url').toString('utf8'));
    if (Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Login Rate Limiting: 5 attempts per 15 min with lockout
 */
export function checkLoginRateLimit(ip: string): { allowed: boolean; waitMinutes?: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record) return { allowed: true };

  if (record.lockedUntil && now < record.lockedUntil) {
    const waitMinutes = Math.ceil((record.lockedUntil - now) / (60 * 1000));
    return { allowed: false, waitMinutes };
  }

  // If window expired (15 mins), reset
  if (now - record.firstAttempt > 15 * 60 * 1000) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, firstAttempt: now };

  record.count += 1;
  if (record.count >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000; // Lock for 15 minutes
  }
  loginAttempts.set(ip, record);
}

export function recordSuccessfulLogin(ip: string): void {
  loginAttempts.delete(ip);
}

/**
 * Submission rate limit: 5 submissions per hour per IP
 */
export function checkSubmissionRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = submissionLimits.get(ip);

  if (!record || now > record.resetAt) {
    submissionLimits.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return { allowed: true, remaining: 4 };
  }

  if (record.count >= 5) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: 5 - record.count };
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'ADMIN' | 'SUPER_ADMIN';
  };
}

/**
 * Middleware: Verify Admin session
 */
export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Check cookie or Bearer header
  const token = req.cookies?.[SESSION_COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/, '');

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Admin authentication required to access this resource.',
      },
    });
  }

  const payload = verifySession(token);
  if (!payload) {
    return res.status(401).json({
      error: {
        code: 'INVALID_SESSION',
        message: 'Your session has expired or is invalid. Please sign in again.',
      },
    });
  }

  const user = await findUserById(payload.userId);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Insufficient privileges. Admin access is required.',
      },
    });
  }

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  next();
}
