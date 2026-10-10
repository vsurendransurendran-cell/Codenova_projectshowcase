import { z } from 'zod';

export const GITHUB_URL_REGEX = /^https:\/\/github\.com\/[a-zA-Z0-9_\-\.]+\/[a-zA-Z0-9_\-\.]+\/?$/;

export const ProjectSubmissionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(80, 'Title cannot exceed 80 characters'),
  studentName: z
    .string()
    .trim()
    .min(2, 'Student / Team name must be at least 2 characters')
    .max(60, 'Student name cannot exceed 60 characters'),
  description: z
    .string()
    .trim()
    .min(20, 'Description must be at least 20 characters')
    .max(1000, 'Description cannot exceed 1000 characters'),
  tags: z
    .array(
      z
        .string()
        .trim()
        .toLowerCase()
        .min(2, 'Tag must be at least 2 characters')
        .max(30, 'Tag cannot exceed 30 characters')
        .regex(/^[a-z0-9\-#\+\.]+$/, 'Tags should only contain alphanumeric characters and hyphens')
    )
    .min(1, 'Please specify at least 1 tag')
    .max(6, 'You can add up to 6 tags'),
  githubUrl: z
    .string()
    .trim()
    .regex(GITHUB_URL_REGEX, 'GitHub link must follow https://github.com/username/repository'),
  liveUrl: z
    .string()
    .trim()
    .url('Live URL must be a valid web address')
    .refine((url) => url.startsWith('https://'), 'Live URL must start with https:// for security'),
  honeypot: z.string().optional().default(''),
});

export type ProjectSubmissionInput = z.infer<typeof ProjectSubmissionSchema>;

export const ProjectModerationSchema = z
  .object({
    status: z.enum(['APPROVED', 'REJECTED', 'PENDING']),
    rejectionReason: z.string().trim().optional(),
    note: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.status === 'REJECTED') {
        return !!data.rejectionReason && data.rejectionReason.length >= 5;
      }
      return true;
    },
    {
      message: 'A rejection reason of at least 5 characters is required when rejecting a submission',
      path: ['rejectionReason'],
    }
  );

export type ProjectModerationInput = z.infer<typeof ProjectModerationSchema>;

export const BulkModerationSchema = z.object({
  projectIds: z.array(z.string().min(1)).min(1, 'Select at least one project'),
  action: z.enum(['APPROVE', 'REJECT', 'DELETE']),
  rejectionReason: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export type BulkModerationInput = z.infer<typeof BulkModerationSchema>;

export const AdminLoginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type AdminLoginInput = z.infer<typeof AdminLoginSchema>;

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

export interface TagWithCount {
  id: string;
  name: string;
  count: number;
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
