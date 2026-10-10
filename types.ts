export interface ProjectPublic {
  id: string;
  title: string;
  studentName: string;
  description: string;
  githubUrl: string;
  liveUrl: string;
  tags: string[];
  createdAt: string;
}

export interface TagWithCount {
  id: string;
  name: string;
  count: number;
}

export interface ProjectAdminView {
  id: string;
  title: string;
  studentName: string;
  description: string;
  githubUrl: string;
  liveUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  trackingToken: string;
  submitterIpHash: string;
  reviewedById?: string | null;
  reviewedByEmail?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
}

export interface AdminActionRecord {
  id: string;
  adminId: string;
  adminEmail: string;
  projectId: string;
  projectTitle: string;
  action: string;
  note?: string | null;
  createdAt: string;
}

export interface StatusProjectDetails {
  id: string;
  title: string;
  studentName: string;
  description: string;
  githubUrl: string;
  liveUrl: string;
  tags: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
}
