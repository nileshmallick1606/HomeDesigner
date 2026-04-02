// ============================================================
// Shared types and constants for InteriorScience
// ============================================================

// --- API Response Types ---

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
}

// --- API Routes ---

export const API_ROUTES = {
  HEALTH: '/api/health',
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
    GOOGLE: '/api/auth/google',
    VERIFY_EMAIL: '/api/auth/verify-email',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
  },
  USERS: {
    ME: '/api/users/me',
  },
  PROJECTS: '/api/projects',
  ROOMS: '/api/rooms',
  MEDIA: '/api/media',
  AI: {
    SEGMENTATION: '/api/ai/segmentation',
    VISUALIZATION: '/api/ai/visualization',
    JOBS: '/api/ai/jobs',
  },
  DESIGNS: '/api/designs',
  TEMPLATES: '/api/templates',
  BUDGETS: '/api/budgets',
  COMMENTS: '/api/comments',
  NOTIFICATIONS: '/api/notifications',
  SHARE: '/api/share',
  EXPORT: '/api/export',
} as const;

// --- Error Codes ---

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  AI_PROCESSING_FAILED: 'AI_PROCESSING_FAILED',
  AI_QUEUE_FULL: 'AI_QUEUE_FULL',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  PROJECT_LOCKED: 'PROJECT_LOCKED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// --- Common Constants ---

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AI_RATE_LIMITS = {
  FREE_DAILY: 10,
  PAID_DAILY: 50,
} as const;
export const PROJECT_LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
