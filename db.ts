import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import type { ProjectPublic, ProjectAdminView, TagWithCount, AdminActionRecord } from '../shared/schema.ts';

let dbInstance: Database | null = null;
const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'showcase.sqlite');
const IP_SALT = process.env.IP_SALT || 'campus-craft-privacy-salt-2026';

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  initSchema(dbInstance);
  saveDb();
  return dbInstance;
}

export function saveDb() {
  if (!dbInstance) return;
  const data = dbInstance.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

function initSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'SUPER_ADMIN')),
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      studentName TEXT NOT NULL,
      description TEXT NOT NULL,
      githubUrl TEXT NOT NULL,
      liveUrl TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
      rejectionReason TEXT,
      trackingToken TEXT UNIQUE NOT NULL,
      submitterIpHash TEXT NOT NULL,
      reviewedById TEXT,
      reviewedAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY(reviewedById) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_tags (
      projectId TEXT NOT NULL,
      tagId TEXT NOT NULL,
      PRIMARY KEY (projectId, tagId),
      FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(tagId) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_actions (
      id TEXT PRIMARY KEY,
      adminId TEXT NOT NULL,
      projectId TEXT NOT NULL,
      action TEXT NOT NULL,
      note TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(adminId) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
    CREATE INDEX IF NOT EXISTS idx_projects_createdAt ON projects(createdAt);
    CREATE INDEX IF NOT EXISTS idx_projects_trackingToken ON projects(trackingToken);
    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
  `);
}

export function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip + IP_SALT).digest('hex');
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ----------------- USER OPERATIONS -----------------
export async function findUserByEmail(email: string) {
  const db = await getDb();
  const stmt = db.prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
  stmt.bind({ ':email': email.toLowerCase().trim() });
  let user: any = null;
  if (stmt.step()) {
    user = stmt.getAsObject();
  }
  stmt.free();
  return user;
}

export async function findUserById(id: string) {
  const db = await getDb();
  const stmt = db.prepare('SELECT id, email, role, createdAt FROM users WHERE id = :id LIMIT 1');
  stmt.bind({ ':id': id });
  let user: any = null;
  if (stmt.step()) {
    user = stmt.getAsObject();
  }
  stmt.free();
  return user;
}

export async function createUser(email: string, passwordPlain: string, role: 'ADMIN' | 'SUPER_ADMIN' = 'ADMIN') {
  const db = await getDb();
  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(passwordPlain, 10);
  const now = new Date().toISOString();

  db.run(
    'INSERT INTO users (id, email, passwordHash, role, createdAt) VALUES (?, ?, ?, ?, ?)',
    [id, email.toLowerCase().trim(), passwordHash, role, now]
  );
  saveDb();
  return { id, email, role, createdAt: now };
}

// ----------------- TAG OPERATIONS -----------------
export async function getOrCreateTag(name: string): Promise<string> {
  const db = await getDb();
  const cleanName = name.toLowerCase().trim();
  const check = db.prepare('SELECT id FROM tags WHERE name = :name LIMIT 1');
  check.bind({ ':name': cleanName });
  if (check.step()) {
    const row = check.getAsObject();
    check.free();
    return row.id as string;
  }
  check.free();

  const id = crypto.randomUUID();
  db.run('INSERT INTO tags (id, name) VALUES (?, ?)', [id, cleanName]);
  saveDb();
  return id;
}

export async function getTagsWithCounts(): Promise<TagWithCount[]> {
  const db = await getDb();
  // Count only from APPROVED projects
  const sql = `
    SELECT t.id, t.name, COUNT(pt.projectId) as count
    FROM tags t
    LEFT JOIN project_tags pt ON t.id = pt.tagId
    LEFT JOIN projects p ON pt.projectId = p.id AND p.status = 'APPROVED'
    GROUP BY t.id, t.name
    HAVING count > 0
    ORDER BY count DESC, t.name ASC
  `;
  const stmt = db.prepare(sql);
  const results: TagWithCount[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push({
      id: row.id as string,
      name: row.name as string,
      count: Number(row.count),
    });
  }
  stmt.free();
  return results;
}

// ----------------- PUBLIC PROJECT OPERATIONS -----------------

/**
 * Strictly returns APPROVED projects only (acceptance criterion: enforced in database query)
 */
export async function getApprovedProjects(options: {
  q?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}): Promise<{ projects: ProjectPublic[]; total: number; page: number; totalPages: number }> {
  const db = await getDb();
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(50, Math.max(1, options.limit || 12));
  const offset = (page - 1) * limit;

  let whereClauses = ["p.status = 'APPROVED'"];
  const params: any[] = [];

  if (options.q && options.q.trim()) {
    const queryTerm = `%${options.q.trim().toLowerCase()}%`;
    whereClauses.push(
      '(LOWER(p.title) LIKE ? OR LOWER(p.studentName) LIKE ? OR LOWER(p.description) LIKE ? OR p.id IN (SELECT pt.projectId FROM project_tags pt JOIN tags t ON pt.tagId = t.id WHERE LOWER(t.name) LIKE ?))'
    );
    params.push(queryTerm, queryTerm, queryTerm, queryTerm);
  }

  if (options.tags && options.tags.length > 0) {
    const tagPlaceholders = options.tags.map(() => '?').join(',');
    whereClauses.push(`
      p.id IN (
        SELECT pt.projectId 
        FROM project_tags pt 
        JOIN tags t ON pt.tagId = t.id 
        WHERE LOWER(t.name) IN (${tagPlaceholders})
        GROUP BY pt.projectId
        HAVING COUNT(DISTINCT t.name) = ${options.tags.length}
      )
    `);
    params.push(...options.tags.map((t) => t.toLowerCase().trim()));
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  // Total count
  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM projects p ${whereSql}`);
  countStmt.bind(params);
  let total = 0;
  if (countStmt.step()) {
    total = Number(countStmt.getAsObject().total);
  }
  countStmt.free();

  // Query projects
  const queryStmt = db.prepare(`
    SELECT p.id, p.title, p.studentName, p.description, p.githubUrl, p.liveUrl, p.createdAt
    FROM projects p
    ${whereSql}
    ORDER BY p.createdAt DESC
    LIMIT ? OFFSET ?
  `);
  queryStmt.bind([...params, limit, offset]);

  const projects: ProjectPublic[] = [];
  while (queryStmt.step()) {
    const row = queryStmt.getAsObject();
    projects.push({
      id: row.id as string,
      title: row.title as string,
      studentName: row.studentName as string,
      description: row.description as string,
      githubUrl: row.githubUrl as string,
      liveUrl: row.liveUrl as string,
      createdAt: row.createdAt as string,
      tags: [],
    });
  }
  queryStmt.free();

  // Attach tags
  for (const proj of projects) {
    const tagStmt = db.prepare(`
      SELECT t.name FROM tags t
      JOIN project_tags pt ON t.id = pt.tagId
      WHERE pt.projectId = ?
      ORDER BY t.name ASC
    `);
    tagStmt.bind([proj.id]);
    while (tagStmt.step()) {
      proj.tags.push(tagStmt.getAsObject().name as string);
    }
    tagStmt.free();
  }

  return {
    projects,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function createProject(data: {
  title: string;
  studentName: string;
  description: string;
  githubUrl: string;
  liveUrl: string;
  tags: string[];
  ip: string;
}): Promise<{ id: string; trackingToken: string }> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const trackingToken = generateToken();
  const submitterIpHash = hashIp(data.ip);
  const now = new Date().toISOString();

  // Enforce PENDING status on creation regardless of client input
  db.run(
    `INSERT INTO projects 
      (id, title, studentName, description, githubUrl, liveUrl, status, trackingToken, submitterIpHash, createdAt, updatedAt) 
     VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?)`,
    [
      id,
      data.title.trim(),
      data.studentName.trim(),
      data.description.trim(),
      data.githubUrl.trim(),
      data.liveUrl.trim(),
      trackingToken,
      submitterIpHash,
      now,
      now,
    ]
  );

  // Link tags
  for (const tagName of data.tags) {
    const tagId = await getOrCreateTag(tagName);
    db.run('INSERT OR IGNORE INTO project_tags (projectId, tagId) VALUES (?, ?)', [id, tagId]);
  }

  saveDb();
  return { id, trackingToken };
}

export async function getProjectByToken(token: string): Promise<{
  id: string;
  title: string;
  studentName: string;
  description: string;
  githubUrl: string;
  liveUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  tags: string[];
} | null> {
  const db = await getDb();
  const stmt = db.prepare(`
    SELECT id, title, studentName, description, githubUrl, liveUrl, status, rejectionReason, createdAt, reviewedAt
    FROM projects
    WHERE trackingToken = :token
    LIMIT 1
  `);
  stmt.bind({ ':token': token });

  if (!stmt.step()) {
    stmt.free();
    return null;
  }

  const row = stmt.getAsObject() as any;
  stmt.free();

  // Load tags
  const tags: string[] = [];
  const tagStmt = db.prepare(`
    SELECT t.name FROM tags t
    JOIN project_tags pt ON t.id = pt.tagId
    WHERE pt.projectId = ?
    ORDER BY t.name ASC
  `);
  tagStmt.bind([row.id as string]);
  while (tagStmt.step()) {
    tags.push(tagStmt.getAsObject().name as string);
  }
  tagStmt.free();

  return {
    id: row.id,
    title: row.title,
    studentName: row.studentName,
    description: row.description,
    githubUrl: row.githubUrl,
    liveUrl: row.liveUrl,
    status: row.status,
    rejectionReason: row.rejectionReason || null,
    createdAt: row.createdAt,
    reviewedAt: row.reviewedAt || null,
    tags,
  };
}

// ----------------- ADMIN OPERATIONS -----------------

export async function getProjectStats() {
  const db = await getDb();
  const stmt = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM projects
    GROUP BY status
  `);
  const counts: Record<string, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0, TOTAL: 0 };
  while (stmt.step()) {
    const row = stmt.getAsObject();
    const st = row.status as string;
    const cnt = Number(row.count);
    counts[st] = cnt;
    counts.TOTAL += cnt;
  }
  stmt.free();
  return counts;
}

export async function getAdminProjects(options: {
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<{ projects: ProjectAdminView[]; total: number; page: number; totalPages: number }> {
  const db = await getDb();
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const offset = (page - 1) * limit;

  let whereClauses: string[] = [];
  const params: any[] = [];

  if (options.status && ['PENDING', 'APPROVED', 'REJECTED'].includes(options.status)) {
    whereClauses.push('p.status = ?');
    params.push(options.status);
  }

  if (options.q && options.q.trim()) {
    const queryTerm = `%${options.q.trim().toLowerCase()}%`;
    whereClauses.push(
      '(LOWER(p.title) LIKE ? OR LOWER(p.studentName) LIKE ? OR LOWER(p.description) LIKE ?)'
    );
    params.push(queryTerm, queryTerm, queryTerm);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM projects p ${whereSql}`);
  countStmt.bind(params);
  let total = 0;
  if (countStmt.step()) {
    total = Number(countStmt.getAsObject().total);
  }
  countStmt.free();

  const queryStmt = db.prepare(`
    SELECT p.*, u.email as reviewedByEmail
    FROM projects p
    LEFT JOIN users u ON p.reviewedById = u.id
    ${whereSql}
    ORDER BY 
      CASE WHEN p.status = 'PENDING' THEN 0 ELSE 1 END,
      p.createdAt DESC
    LIMIT ? OFFSET ?
  `);
  queryStmt.bind([...params, limit, offset]);

  const projects: ProjectAdminView[] = [];
  while (queryStmt.step()) {
    const row = queryStmt.getAsObject();
    projects.push({
      id: row.id as string,
      title: row.title as string,
      studentName: row.studentName as string,
      description: row.description as string,
      githubUrl: row.githubUrl as string,
      liveUrl: row.liveUrl as string,
      status: row.status as 'PENDING' | 'APPROVED' | 'REJECTED',
      rejectionReason: (row.rejectionReason as string) || null,
      trackingToken: row.trackingToken as string,
      submitterIpHash: row.submitterIpHash as string,
      reviewedById: (row.reviewedById as string) || null,
      reviewedByEmail: (row.reviewedByEmail as string) || null,
      reviewedAt: (row.reviewedAt as string) || null,
      createdAt: row.createdAt as string,
      updatedAt: row.updatedAt as string,
      tags: [],
    });
  }
  queryStmt.free();

  for (const proj of projects) {
    const tagStmt = db.prepare(`
      SELECT t.name FROM tags t
      JOIN project_tags pt ON t.id = pt.tagId
      WHERE pt.projectId = ?
      ORDER BY t.name ASC
    `);
    tagStmt.bind([proj.id]);
    while (tagStmt.step()) {
      proj.tags.push(tagStmt.getAsObject().name as string);
    }
    tagStmt.free();
  }

  return {
    projects,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function moderateProject(
  projectId: string,
  adminId: string,
  status: 'PENDING' | 'APPROVED' | 'REJECTED',
  rejectionReason?: string,
  note?: string
) {
  const db = await getDb();
  const now = new Date().toISOString();

  // Check project exists
  const checkStmt = db.prepare('SELECT id, title, status FROM projects WHERE id = :id');
  checkStmt.bind({ ':id': projectId });
  if (!checkStmt.step()) {
    checkStmt.free();
    throw new Error('Project not found');
  }
  const project = checkStmt.getAsObject();
  checkStmt.free();

  const finalRejectionReason = status === 'REJECTED' ? rejectionReason || 'Does not meet current guidelines.' : null;

  db.run(
    `UPDATE projects 
     SET status = ?, rejectionReason = ?, reviewedById = ?, reviewedAt = ?, updatedAt = ?
     WHERE id = ?`,
    [status, finalRejectionReason, adminId, now, now, projectId]
  );

  // Record audit log
  const actionId = crypto.randomUUID();
  const actionText = status === 'APPROVED' ? 'APPROVE' : status === 'REJECTED' ? 'REJECT' : 'REVERT_PENDING';
  const actionNote = note || (status === 'REJECTED' ? `Reason: ${finalRejectionReason}` : null);

  db.run(
    `INSERT INTO admin_actions (id, adminId, projectId, action, note, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [actionId, adminId, projectId, actionText, actionNote, now]
  );

  saveDb();
  return { success: true, id: projectId, status };
}

export async function deleteProject(projectId: string, adminId: string, note?: string) {
  const db = await getDb();
  const now = new Date().toISOString();

  const checkStmt = db.prepare('SELECT id, title FROM projects WHERE id = :id');
  checkStmt.bind({ ':id': projectId });
  if (!checkStmt.step()) {
    checkStmt.free();
    throw new Error('Project not found');
  }
  const project = checkStmt.getAsObject();
  checkStmt.free();

  // Record audit log
  const actionId = crypto.randomUUID();
  db.run(
    `INSERT INTO admin_actions (id, adminId, projectId, action, note, createdAt)
     VALUES (?, ?, ?, 'DELETE', ?, ?)`,
    [actionId, adminId, projectId, note || `Deleted project "${project.title}"`, now]
  );

  db.run('DELETE FROM project_tags WHERE projectId = ?', [projectId]);
  db.run('DELETE FROM projects WHERE id = ?', [projectId]);

  saveDb();
  return { success: true, id: projectId };
}

export async function bulkModerate(
  adminId: string,
  projectIds: string[],
  action: 'APPROVE' | 'REJECT' | 'DELETE',
  rejectionReason?: string,
  note?: string
) {
  const results = [];
  for (const id of projectIds) {
    if (action === 'DELETE') {
      await deleteProject(id, adminId, note);
      results.push({ id, action: 'DELETE', status: 'DELETED' });
    } else {
      const targetStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      await moderateProject(id, adminId, targetStatus, rejectionReason, note);
      results.push({ id, action, status: targetStatus });
    }
  }
  return results;
}

export async function getAdminAuditLogs(limit = 50): Promise<AdminActionRecord[]> {
  const db = await getDb();
  const stmt = db.prepare(`
    SELECT a.id, a.adminId, a.projectId, a.action, a.note, a.createdAt,
           u.email as adminEmail,
           COALESCE(p.title, '[Deleted Project]') as projectTitle
    FROM admin_actions a
    LEFT JOIN users u ON a.adminId = u.id
    LEFT JOIN projects p ON a.projectId = p.id
    ORDER BY a.createdAt DESC
    LIMIT ?
  `);
  stmt.bind([limit]);

  const logs: AdminActionRecord[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    logs.push({
      id: row.id as string,
      adminId: row.adminId as string,
      adminEmail: (row.adminEmail as string) || 'Admin',
      projectId: row.projectId as string,
      projectTitle: row.projectTitle as string,
      action: row.action as string,
      note: (row.note as string) || null,
      createdAt: row.createdAt as string,
    });
  }
  stmt.free();
  return logs;
}

export async function countSubmissionsByIpInLastHour(ip: string): Promise<number> {
  const db = await getDb();
  const ipHash = hashIp(ip);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const stmt = db.prepare(`
    SELECT COUNT(*) as cnt 
    FROM projects 
    WHERE submitterIpHash = ? AND createdAt >= ?
  `);
  stmt.bind([ipHash, oneHourAgo]);

  let count = 0;
  if (stmt.step()) {
    count = Number(stmt.getAsObject().cnt);
  }
  stmt.free();
  return count;
}
