import { describe, it, expect, beforeAll } from 'vitest';
import {
  getDb,
  createProject,
  getApprovedProjects,
  getProjectByToken,
  moderateProject,
  createUser,
  getAdminAuditLogs,
} from '../src/server/db.ts';

describe('Project Query & Moderation Lifecycle', () => {
  let adminId: string;

  beforeAll(async () => {
    await getDb();
    const admin = await createUser(`testadmin-${Date.now()}@campuscraft.edu`, 'AdminPass123!');
    adminId = admin.id;
  });

  it('new submissions always have status PENDING and are hidden from public gallery', async () => {
    const uniqueTitle = `Stealth Project ${Date.now()}`;
    const { id, trackingToken } = await createProject({
      title: uniqueTitle,
      studentName: 'Test Student',
      description: 'Testing that unapproved projects are excluded from public database queries.',
      githubUrl: 'https://github.com/facebook/react',
      liveUrl: 'https://react.dev',
      tags: ['vitest', 'security'],
      ip: '192.0.2.1',
    });

    // Verify token retrieval returns PENDING
    const tracked = await getProjectByToken(trackingToken);
    expect(tracked).not.toBeNull();
    expect(tracked?.status).toBe('PENDING');
    expect(tracked?.title).toBe(uniqueTitle);

    // CRITICAL ACCEPTANCE CHECK: Must NOT appear in getApprovedProjects query
    const publicGallery = await getApprovedProjects({ q: uniqueTitle });
    const foundInPublic = publicGallery.projects.some((p) => p.id === id);
    expect(foundInPublic).toBe(false);

    // Now moderator APPROVES the project
    await moderateProject(id, adminId, 'APPROVED', undefined, 'Passed test review');

    // CRITICAL ACCEPTANCE CHECK: Now it MUST appear in getApprovedProjects query
    const updatedGallery = await getApprovedProjects({ q: uniqueTitle });
    const foundAfterApproval = updatedGallery.projects.some((p) => p.id === id);
    expect(foundAfterApproval).toBe(true);
  });

  it('rejection saves required reason and audit log is created', async () => {
    const { id, trackingToken } = await createProject({
      title: `Substandard Project ${Date.now()}`,
      studentName: 'Substandard Student',
      description: 'Project that fails moderation criteria testing.',
      githubUrl: 'https://github.com/facebook/react',
      liveUrl: 'https://react.dev',
      tags: ['testing'],
      ip: '192.0.2.2',
    });

    const rejectionReason = 'Missing documentation and test suite per campus guidelines.';
    await moderateProject(id, adminId, 'REJECTED', rejectionReason, 'Moderator decline test');

    const tracked = await getProjectByToken(trackingToken);
    expect(tracked?.status).toBe('REJECTED');
    expect(tracked?.rejectionReason).toBe(rejectionReason);

    // Audit logs should record this action
    const logs = await getAdminAuditLogs(10);
    const rejectLog = logs.find((l) => l.projectId === id && l.action === 'REJECT');
    expect(rejectLog).toBeDefined();
    expect(rejectLog?.adminId).toBe(adminId);
  });
});
