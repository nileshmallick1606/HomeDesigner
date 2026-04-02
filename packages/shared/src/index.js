"use strict";
// ============================================================
// Shared types and constants for InteriorScience
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROJECT_LOCK_TIMEOUT_MS = exports.AI_RATE_LIMITS = exports.ALLOWED_IMAGE_MIME_TYPES = exports.MAX_FILE_SIZE_BYTES = exports.ERROR_CODES = exports.API_ROUTES = void 0;
// --- API Routes ---
exports.API_ROUTES = {
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
};
// --- Error Codes ---
exports.ERROR_CODES = {
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
};
// --- Common Constants ---
exports.MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
exports.ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
exports.AI_RATE_LIMITS = {
    FREE_DAILY: 10,
    PAID_DAILY: 50,
};
exports.PROJECT_LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
//# sourceMappingURL=index.js.map