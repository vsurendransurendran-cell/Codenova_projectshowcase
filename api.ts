import {
  ProjectPublic,
  TagWithCount,
  ProjectAdminView,
  AdminUser,
  AdminActionRecord,
  StatusProjectDetails,
} from '../types.js';
import { ProjectSubmissionInput, ProjectModerationInput, BulkModerationInput } from '../shared/schema.js';

export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const json = await res.json();
    return json;
  } catch (err: any) {
    return {
      error: {
        code: 'NETWORK_ERROR',
        message: err.message || 'Network communication error',
      },
    };
  }
}

export const api = {
  // Public
  getProjects: async (params?: { q?: string; tags?: string[]; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set('q', params.q);
    if (params?.tags && params.tags.length > 0) searchParams.set('tags', params.tags.join(','));
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const qs = searchParams.toString();
    return request<{ projects: ProjectPublic[]; total: number; page: number; totalPages: number }>(
      `/api/projects${qs ? `?${qs}` : ''}`
    );
  },

  getTags: async () => {
    return request<TagWithCount[]>('/api/tags');
  },

  submitProject: async (input: ProjectSubmissionInput) => {
    return request<{
      id: string;
      trackingToken: string;
      trackingUrl: string;
      message: string;
    }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  validateLinks: async (githubUrl: string, liveUrl: string) => {
    return request<{
      github?: { valid: boolean; error?: string };
      live?: { valid: boolean; error?: string };
    }>('/api/validate-links', {
      method: 'POST',
      body: JSON.stringify({ githubUrl, liveUrl }),
    });
  },

  getProjectStatus: async (token: string) => {
    return request<StatusProjectDetails>(`/api/status/${encodeURIComponent(token)}`);
  },

  // Admin Auth
  adminLogin: async (credentials: { email: string; password: string }) => {
    return request<{ token: string; user: AdminUser }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  adminLogout: async () => {
    return request<{ message: string }>('/api/admin/logout', {
      method: 'POST',
    });
  },

  getAdminMe: async () => {
    return request<{ user: AdminUser }>('/api/admin/me');
  },

  // Admin Moderation
  getAdminStats: async () => {
    return request<{ PENDING: number; APPROVED: number; REJECTED: number; TOTAL: number }>(
      '/api/admin/stats'
    );
  },

  getAdminProjects: async (params?: { status?: string; q?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.q) searchParams.set('q', params.q);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const qs = searchParams.toString();
    return request<{ projects: ProjectAdminView[]; total: number; page: number; totalPages: number }>(
      `/api/admin/projects${qs ? `?${qs}` : ''}`
    );
  },

  moderateProject: async (id: string, payload: ProjectModerationInput) => {
    return request<{ success: boolean; id: string; status: string }>(`/api/admin/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteProject: async (id: string, note?: string) => {
    return request<{ success: boolean; id: string }>(`/api/admin/projects/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ note }),
    });
  },

  bulkModerate: async (payload: BulkModerationInput) => {
    return request<{ count: number; items: any[] }>('/api/admin/projects/bulk', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getAuditLogs: async () => {
    return request<AdminActionRecord[]>('/api/admin/audit-logs');
  },

  recheckLinks: async (id: string) => {
    return request<{
      github: { valid: boolean; error?: string };
      live: { valid: boolean; error?: string };
    }>(`/api/admin/recheck-links/${id}`, {
      method: 'POST',
    });
  },
};
