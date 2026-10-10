import { describe, it, expect } from 'vitest';
import {
  signSession,
  verifySession,
  checkLoginRateLimit,
  recordFailedLogin,
  recordSuccessfulLogin,
  checkSubmissionRateLimit,
} from '../src/server/auth.ts';

describe('Authentication & Session Security', () => {
  it('signs and verifies valid HMAC session tokens', () => {
    const payload = {
      userId: 'test-admin-uuid',
      email: 'admin@campuscraft.edu',
      role: 'ADMIN' as const,
    };

    const token = signSession(payload);
    expect(token).toBeTypeOf('string');
    expect(token).toContain('.');

    const verified = verifySession(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(payload.userId);
    expect(verified?.email).toBe(payload.email);
    expect(verified?.role).toBe(payload.role);
  });

  it('rejects tampered tokens', () => {
    const token = signSession({
      userId: 'admin-1',
      email: 'admin@campuscraft.edu',
      role: 'ADMIN',
    });

    const [data, sig] = token.split('.');
    // Tamper with data payload
    const tamperedData = Buffer.from(
      JSON.stringify({ userId: 'hacker', role: 'SUPER_ADMIN', exp: Date.now() + 100000 })
    ).toString('base64url');

    const tamperedToken = `${tamperedData}.${sig}`;
    expect(verifySession(tamperedToken)).toBeNull();
  });

  it('enforces login rate limit and locks out after 5 failures', () => {
    const testIp = '198.51.100.99';

    // First 4 attempts should be allowed
    for (let i = 0; i < 4; i++) {
      expect(checkLoginRateLimit(testIp).allowed).toBe(true);
      recordFailedLogin(testIp);
    }

    // 5th failed attempt triggers lockout
    recordFailedLogin(testIp);
    const locked = checkLoginRateLimit(testIp);
    expect(locked.allowed).toBe(false);
    expect(locked.waitMinutes).toBeGreaterThan(0);

    // Successful login resets tracker
    recordSuccessfulLogin(testIp);
    expect(checkLoginRateLimit(testIp).allowed).toBe(true);
  });

  it('enforces submission rate limit (5 per hour)', () => {
    const testIp = '203.0.113.45';

    // First 5 submissions allowed
    for (let i = 0; i < 5; i++) {
      const res = checkSubmissionRateLimit(testIp);
      expect(res.allowed).toBe(true);
    }

    // 6th submission blocked
    const blocked = checkSubmissionRateLimit(testIp);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });
});
