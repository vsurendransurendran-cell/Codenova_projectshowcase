import express from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import {
  ProjectSubmissionSchema,
  ProjectModerationSchema,
  BulkModerationSchema,
  AdminLoginSchema,
} from '../shared/schema.ts';
import {
  getApprovedProjects,
  getTagsWithCounts,
  createProject,
  getProjectByToken,
  getAdminProjects,
  moderateProject,
  deleteProject,
  bulkModerate,
  getAdminAuditLogs,
  getProjectStats,
  findUserByEmail,
  getDb,
} from './db.ts';
import { validateGitHubUrl, validateLiveUrl } from './urlValidator.ts';
import {
  getClientIp,
  checkLoginRateLimit,
  recordFailedLogin,
  recordSuccessfulLogin,
  checkSubmissionRateLimit,
  signSession,
  requireAdmin,
  SESSION_COOKIE_NAME,
} from './auth.ts';
import type { AuthenticatedRequest } from './auth.ts';

export const apiRouter = express.Router();

// -------------------------------------------------------------
// PUBLIC API ROUTES
// -------------------------------------------------------------

/**
 * GET /api/projects
 * Public gallery feed. Returns APPROVED projects only (enforced in DB query).
 */
apiRouter.get('/projects', async (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 12;

    let tags: string[] | undefined = undefined;
    if (typeof req.query.tags === 'string' && req.query.tags.trim()) {
      tags = req.query.tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
    }

    const result = await getApprovedProjects({ q, tags, page, limit });
    return res.status(200).json({ data: result });
  } catch (err: any) {
    console.error('Error in GET /api/projects:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to load projects gallery. Please try again.',
      },
    });
  }
});

/**
 * GET /api/tags
 * Returns list of tags and their counts on APPROVED projects.
 */
apiRouter.get('/tags', async (_req: Request, res: Response) => {
  try {
    const tags = await getTagsWithCounts();
    return res.status(200).json({ data: tags });
  } catch (err: any) {
    console.error('Error in GET /api/tags:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to load tags.',
      },
    });
  }
});

/**
 * POST /api/validate-links
 * Helper endpoint for live URL testing on client before submission
 */
apiRouter.post('/validate-links', async (req: Request, res: Response) => {
  const { githubUrl, liveUrl } = req.body || {};
  const results: {
    github?: { valid: boolean; error?: string };
    live?: { valid: boolean; error?: string };
  } = {};

  if (githubUrl) {
    results.github = await validateGitHubUrl(githubUrl);
  }
  if (liveUrl) {
    results.live = await validateLiveUrl(liveUrl);
  }

  return res.status(200).json({ data: results });
});

/**
 * POST /api/projects
 * Student submission endpoint. Validates fields with Zod, checks honeypot,
 * checks IP rate limit, validates URLs with SSRF protection,
 * and records submission with initial status PENDING.
 */
apiRouter.post('/projects', async (req: Request, res: Response) => {
  const clientIp = getClientIp(req);

  // 1. Honeypot check (prevent bot spam)
  if (req.body?.honeypot && String(req.body.honeypot).trim() !== '') {
    // Silently pretend success to mislead bots without storing garbage
    return res.status(201).json({
      data: {
        id: 'mock-bot-id',
        trackingToken: 'mock-token',
        trackingUrl: '/status/mock-token',
        message: 'Submission received.',
      },
    });
  }

  // 2. IP Rate Limit check (5 submissions/hour/IP)
  const rateLimit = checkSubmissionRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Submission rate limit reached (5 submissions/hour). Please try again later.',
      },
    });
  }

  // 3. Zod schema validation
  const parseResult = ProjectSubmissionSchema.safeParse(req.body);
  if (!parseResult.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parseResult.error.issues) {
      const field = issue.path[0] as string;
      if (field && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please resolve form input errors before submitting.',
        fields: fieldErrors,
      },
    });
  }

  const data = parseResult.data;

  // 4. Server-side URL Validation with SSRF & accessibility checks
  const [githubCheck, liveCheck] = await Promise.all([
    validateGitHubUrl(data.githubUrl),
    validateLiveUrl(data.liveUrl),
  ]);

  const urlErrors: Record<string, string> = {};
  if (!githubCheck.valid) {
    urlErrors.githubUrl = githubCheck.error || 'GitHub repository is unreachable or private.';
  }
  if (!liveCheck.valid) {
    urlErrors.liveUrl = liveCheck.error || 'Live demo preview URL is unreachable.';
  }

  if (Object.keys(urlErrors).length > 0) {
    return res.status(400).json({
      error: {
        code: 'URL_VERIFICATION_FAILED',
        message: 'One or more project links could not be verified.',
        fields: urlErrors,
      },
    });
  }

  // 5. Store in database with status PENDING and random 32-byte tracking token
  try {
    const created = await createProject({
      title: data.title,
      studentName: data.studentName,
      description: data.description,
      githubUrl: data.githubUrl,
      liveUrl: data.liveUrl,
      tags: data.tags,
      ip: clientIp,
    });

    return res.status(201).json({
      data: {
        id: created.id,
        trackingToken: created.trackingToken,
        trackingUrl: `/status/${created.trackingToken}`,
        message: 'Project submitted successfully and is pending administrative review.',
      },
    });
  } catch (err: any) {
    console.error('Error saving submission:', err);
    return res.status(500).json({
      error: {
        code: 'STORAGE_ERROR',
        message: 'Could not record your submission. Please try again.',
      },
    });
  }
});

/**
 * GET /api/status/:token
 * Check submission status using private 32-byte token without requiring an account.
 */
apiRouter.get('/status/:token', async (req: Request, res: Response) => {
  const token = req.params.token;
  if (!token || token.length < 16) {
    return res.status(400).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'A valid tracking token is required.',
      },
    });
  }

  try {
    const project = await getProjectByToken(token);
    if (!project) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'No project found for this tracking token. Please verify your link.',
        },
      });
    }

    return res.status(200).json({
      data: {
        id: project.id,
        title: project.title,
        studentName: project.studentName,
        description: project.description,
        githubUrl: project.githubUrl,
        liveUrl: project.liveUrl,
        tags: project.tags,
        status: project.status,
        rejectionReason: project.rejectionReason,
        createdAt: project.createdAt,
        reviewedAt: project.reviewedAt,
      },
    });
  } catch (err: any) {
    console.error('Error in GET /api/status/:token:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve submission status.',
      },
    });
  }
});

// -------------------------------------------------------------
// ADMIN AUTHENTICATION
// -------------------------------------------------------------

/**
 * POST /api/admin/login
 * Rate limited to 5 attempts / 15 minutes per IP with lockout.
 */
apiRouter.post('/admin/login', async (req: Request, res: Response) => {
  const clientIp = getClientIp(req);

  // Check rate limit & lockout
  const limit = checkLoginRateLimit(clientIp);
  if (!limit.allowed) {
    return res.status(429).json({
      error: {
        code: 'TOO_MANY_ATTEMPTS',
        message: `Too many failed login attempts. Please wait ${limit.waitMinutes || 15} minutes before trying again.`,
      },
    });
  }

  const parseResult = AdminLoginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Valid email and password are required.',
      },
    });
  }

  const { email, password } = parseResult.data;

  try {
    const user = await findUserByEmail(email);

    // Constant-time password verification check to prevent user enumeration
    let passwordMatch = false;
    if (user && user.passwordHash) {
      passwordMatch = await bcrypt.compare(password, user.passwordHash);
    } else {
      // Fake compare with identical cost to mitigate timing attacks
      await bcrypt.compare(
        password,
        '$2a$10$N9qo8uLOickgx2ZMRZoMye.I.b8eTcq5vX1bM6m88m2f7823oQo/i'
      );
    }

    if (!user || !passwordMatch) {
      recordFailedLogin(clientIp);
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
    }

    // Success
    recordSuccessfulLogin(clientIp);

    const token = signSession({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Set secure httpOnly cookie
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      data: {
        token, // also return token for convenience in API clients / tests
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err: any) {
    console.error('Error during admin login:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication service encountered an unexpected error.',
      },
    });
  }
});

/**
 * POST /api/admin/logout
 */
apiRouter.post('/admin/logout', (req: Request, res: Response) => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  return res.status(200).json({ data: { message: 'Signed out successfully.' } });
});

/**
 * GET /api/admin/me
 * Returns current authenticated admin session
 */
apiRouter.get('/admin/me', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  return res.status(200).json({
    data: {
      user: req.user,
    },
  });
});

// -------------------------------------------------------------
// ADMIN MODERATION ROUTES (requireAdmin applied to all)
// -------------------------------------------------------------

/**
 * GET /api/admin/stats
 */
apiRouter.get('/admin/stats', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await getProjectStats();
    return res.status(200).json({ data: stats });
  } catch (err: any) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve stats.' },
    });
  }
});

/**
 * GET /api/admin/projects
 */
apiRouter.get('/admin/projects', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const result = await getAdminProjects({ status, q, page, limit });
    return res.status(200).json({ data: result });
  } catch (err: any) {
    console.error('Error in GET /api/admin/projects:', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch admin projects.' },
    });
  }
});

/**
 * PATCH /api/admin/projects/:id
 * Moderate single project: APPROVE, REJECT, or revert to PENDING
 */
apiRouter.patch('/admin/projects/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.params.id;
  const parseResult = ProjectModerationSchema.safeParse(req.body);

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: firstIssue?.message || 'Invalid moderation payload.',
      },
    });
  }

  const { status, rejectionReason, note } = parseResult.data;

  try {
    const updated = await moderateProject(
      projectId,
      req.user!.id,
      status,
      rejectionReason,
      note
    );
    return res.status(200).json({ data: updated });
  } catch (err: any) {
    if (err.message === 'Project not found') {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found.' },
      });
    }
    console.error('Error in PATCH /api/admin/projects/:id:', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update project status.' },
    });
  }
});

/**
 * DELETE /api/admin/projects/:id
 */
apiRouter.delete('/admin/projects/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.params.id;
  const note = typeof req.body?.note === 'string' ? req.body.note : undefined;

  try {
    const result = await deleteProject(projectId, req.user!.id, note);
    return res.status(200).json({ data: result });
  } catch (err: any) {
    if (err.message === 'Project not found') {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found.' },
      });
    }
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete project.' },
    });
  }
});

/**
 * POST /api/admin/projects/bulk
 * Bulk approve, reject, or delete projects
 */
apiRouter.post('/admin/projects/bulk', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const parseResult = BulkModerationSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: parseResult.error.issues[0]?.message || 'Invalid bulk parameters.',
      },
    });
  }

  const { projectIds, action, rejectionReason, note } = parseResult.data;

  try {
    const results = await bulkModerate(
      req.user!.id,
      projectIds,
      action,
      rejectionReason,
      note
    );
    return res.status(200).json({ data: { count: results.length, items: results } });
  } catch (err: any) {
    console.error('Error in bulk moderation:', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Bulk moderation failed.' },
    });
  }
});

/**
 * GET /api/admin/audit-logs
 */
apiRouter.get('/admin/audit-logs', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await getAdminAuditLogs(50);
    return res.status(200).json({ data: logs });
  } catch (err: any) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch audit logs.' },
    });
  }
});

/**
 * POST /api/admin/recheck-links/:id
 * Admin tool to live re-check links for any project in moderation view
 */
apiRouter.post('/admin/recheck-links/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const db = await getDb();
  const stmt = db.prepare('SELECT githubUrl, liveUrl FROM projects WHERE id = :id LIMIT 1');
  stmt.bind({ ':id': req.params.id });

  if (!stmt.step()) {
    stmt.free();
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found.' } });
  }

  const { githubUrl, liveUrl } = stmt.getAsObject() as { githubUrl: string; liveUrl: string };
  stmt.free();

  const [githubResult, liveResult] = await Promise.all([
    validateGitHubUrl(githubUrl),
    validateLiveUrl(liveUrl),
  ]);

  return res.status(200).json({
    data: {
      github: githubResult,
      live: liveResult,
    },
  });
});
