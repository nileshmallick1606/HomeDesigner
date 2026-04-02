# SPEC-002 — Database Schema & Authentication

**Parent Feature:** InteriorScience MVP
**Spec Number:** 002 of 9
**Prerequisites:** SPEC-001

## Status: Not Started

### 1. Objective

Implement the complete PostgreSQL database schema via Prisma ORM covering all MVP entities (users, organizations, projects, rooms, designs, visualizations, budgets, comments, notifications), and the full authentication system (JWT + Google OAuth, registration, login, email verification, RBAC with platform and project roles).

- **Before:** Scaffolded monorepo with empty database, no auth
- **After:** Full database schema with migrations, seeded demo data, working registration/login (email+password and Google OAuth), JWT access/refresh tokens, role-based guards, user profile CRUD
- **Success criteria:** User can register, verify email, login, receive JWT, access protected endpoints based on role. All database tables created with proper indexes and RLS policies.

### 2. Architecture

```
Registration Flow:
  Client → POST /api/auth/register (email, password, name, profileType)
    → Validate DTO → Hash password (bcrypt) → Create User record
    → Send verification email (Resend) → Return { message: "Check email" }

  Client → GET /api/auth/verify-email?token=xxx
    → Validate token → Set user.emailVerified = true → Redirect to login

Login Flow:
  Client → POST /api/auth/login (email, password)
    → Validate credentials → Generate JWT access token (15min)
    → Set refresh token in httpOnly cookie (7 days)
    → Return { accessToken, user }

  Client → POST /api/auth/refresh
    → Validate refresh token from cookie → Issue new access + refresh tokens

Google OAuth Flow:
  Client → GET /api/auth/google → Redirect to Google consent
  Google → GET /api/auth/google/callback?code=xxx
    → Exchange code for profile → Find or create user → Issue tokens → Redirect to frontend

Protected Endpoint:
  Client → GET /api/users/me (Authorization: Bearer <token>)
    → JwtAuthGuard validates token → RolesGuard checks role → Controller handles request
```

### 3. Design Constraints

- DC-7: User data deletion MUST cascade completely: account → projects → rooms → photos → visualizations → canvas states → comments. Deletion irreversible, complete within 30 days.
- DC-9: ALL database queries for user data MUST be scoped by user_id or organization_id. Enforce via PostgreSQL RLS policies AND application-level middleware.
- DC-14: All API endpoints MUST validate input via class-validator DTOs. Rate limiting on auth endpoints (10 req/min per IP).
- TRD §9: JWT access token (15min) + refresh token (7 days, httpOnly cookie). Password: bcrypt salt rounds = 12.
- TRD §9: RBAC with platform roles (Free User, Pro User, Architect Individual, Architect Org Admin, Architect Org Member, Platform Admin) and project roles (Owner, Editor, Viewer).
- TRD §4: UUIDs v7 for primary keys. snake_case DB columns, camelCase in app.
- TRD §4: Prisma Migrate for version-controlled migrations.
- TRD §9: Sensitive fields (email, personal data) encrypted at application level (AES-256-GCM).
- TRD E2: Guided onboarding for new users, sample project pre-loaded.

### 4. Detailed Design

#### 4a. Database / Schema Changes

**File: `apps/api/prisma/schema.prisma`**

Complete Prisma schema with ALL MVP entities:

**User model:** id (UUID v7), email (unique, encrypted), passwordHash, name, avatarUrl, profileType (enum: HOMEOWNER, ARCHITECT_INDIVIDUAL, ARCHITECT_ORG), platformRole (enum: FREE_USER, PRO_USER, ARCHITECT, ORG_ADMIN, ORG_MEMBER, PLATFORM_ADMIN), emailVerified (boolean), googleId (optional), preferences (Json), createdAt, updatedAt, deletedAt (soft delete).

**Organization model:** id, name, slug (unique), logoUrl, settings (Json), createdAt, updatedAt, deletedAt.

**OrgMember model:** id, userId, orgId, role (enum: ADMIN, MEMBER), joinedAt. Unique constraint on [userId, orgId].

**Project model:** id, name, description, status (enum: DRAFT, ACTIVE, COMPLETED, ARCHIVED), overallBudget (Decimal), timelineStart, timelineEnd, ownerId, orgId (optional), createdAt, updatedAt, deletedAt.

**ProjectMember model:** id, projectId, userId, role (enum: OWNER, EDITOR, VIEWER), joinedAt. Unique constraint on [projectId, userId].

**Room model:** id, projectId, name, type (enum: BATHROOM, KITCHEN, BEDROOM, LIVING_ROOM, DINING_ROOM, BALCONY, UTILITY, CUSTOM), dimensions (Json), budget (Decimal), notes, sortOrder, createdAt, updatedAt, deletedAt.

**RoomPhoto model:** id, roomId, originalUrl (R2), thumbnailUrl (R2), width, height, sizeBytes, mimeType, metadata (Json — stripped EXIF), createdAt.

**Segmentation model:** id, roomPhotoId, maskUrl (R2), elements (Json — detected elements with labels and boundaries), modelVersion, status (enum: PENDING, PROCESSING, COMPLETED, FAILED), createdAt.

**Design model:** id, roomId, name, category (enum: CIVIL, FURNISHINGS, BATHROOM, KITCHEN, ELECTRICAL, OTHER), subCategory, status (enum: DRAFT, FINAL), canvasState (Json — Fabric.js serialization), createdAt, updatedAt.

**Visualization model:** id, designId, imageUrl (R2), thumbnailUrl (R2), prompt, modelVersion, generationParams (Json), status (enum: PENDING, PROCESSING, COMPLETED, FAILED), createdAt.

**DesignVersion model:** id, designId, versionNumber, canvasState (Json), thumbnailUrl, createdAt.

**Template model:** id, name, description, category, subCategory, roomType, thumbnailUrl, canvasState (Json), isSystem (boolean), createdById (optional), tags (String[]), sortOrder, createdAt.

**ProjectBudget model:** id, projectId, category, estimatedAmount (Decimal), actualAmount (Decimal), notes, createdAt, updatedAt.

**RoomBudget model:** id, roomId, category, estimatedAmount (Decimal), actualAmount (Decimal), notes, createdAt, updatedAt.

**Comment model:** id, content, authorId, projectId, roomId (optional), designId (optional), visualizationId (optional), parentId (optional — for replies), createdAt, updatedAt, deletedAt.

**Notification model:** id, userId, type (enum: SHARE_INVITE, COMMENT, AI_COMPLETE, PROJECT_UPDATE), title, body, data (Json), read (boolean), createdAt.

**ShareLink model:** id, projectId, token (unique), role (VIEWER/EDITOR), expiresAt (optional), createdAt, createdById.

**AiJob model:** id, type (enum: SEGMENTATION, VISUALIZATION), status (enum: QUEUED, PROCESSING, COMPLETED, FAILED), priority (int), userId, roomPhotoId (optional), designId (optional), attempts, maxAttempts (default 3), result (Json), error, startedAt, completedAt, createdAt.

**Indexes:** Composite on [userId, status] for projects. [projectId, userId] for members. [roomId, category] for designs. [designId, status] for visualizations. GIN on Json columns. Partial indexes WHERE deletedAt IS NULL.

**RLS Policies:** Enable RLS on User, Project, Room, Design, Visualization, Comment tables. Policies scope reads/writes by authenticated user's ID or organization membership.

**Seed data:** Demo user, sample project "My Dream Home" with 2 rooms (bathroom, kitchen), sample room photos, sample template entries.

#### 4b. Backend / API Changes

**File: `apps/api/src/auth/auth.module.ts`**
- Imports: JwtModule, PassportModule, UsersModule, ConfigModule
- Providers: AuthService, JwtStrategy, GoogleStrategy, LocalStrategy
- Controllers: AuthController

**File: `apps/api/src/auth/auth.controller.ts`**
- POST /api/auth/register — RegisterDto { email (valid email format), password (min 8 chars, must contain uppercase + lowercase + number), name (2-100 chars), profileType (HOMEOWNER | ARCHITECT) }
- POST /api/auth/login — LoginDto { email, password }
- POST /api/auth/refresh — Reads refresh token from httpOnly cookie
- POST /api/auth/logout — Clears refresh token cookie
- GET /api/auth/google — Initiates Google OAuth
- GET /api/auth/google/callback — Google OAuth callback
- GET /api/auth/verify-email — Email verification with token
- POST /api/auth/forgot-password — ForgotPasswordDto { email }
- POST /api/auth/reset-password — ResetPasswordDto { token, newPassword }

**File: `apps/api/src/auth/auth.service.ts`**
- register(): Validate uniqueness, hash password, create user, send verification email
- login(): Validate credentials, generate tokens
- refreshTokens(): Validate refresh token, issue new pair
- googleLogin(): Find or create user from Google profile
- verifyEmail(): Validate token, mark user verified

**File: `apps/api/src/auth/strategies/jwt.strategy.ts`**
- Passport JWT strategy extracting Bearer token from Authorization header
- Validates token, attaches user to request

**File: `apps/api/src/auth/strategies/google.strategy.ts`**
- Passport Google OAuth 2.0 strategy
- Scopes: profile, email

**File: `apps/api/src/auth/guards/jwt-auth.guard.ts`**
- Guard that requires valid JWT on protected endpoints

**File: `apps/api/src/auth/guards/roles.guard.ts`**
- Guard that checks platform role (e.g., @Roles('ARCHITECT', 'PLATFORM_ADMIN'))

**File: `apps/api/src/auth/guards/project-role.guard.ts`**
- Guard that checks project-level role (e.g., @ProjectRole('OWNER', 'EDITOR'))

**File: `apps/api/src/users/users.module.ts`**
- Imports: PrismaModule
- Providers: UsersService
- Controllers: UsersController

**File: `apps/api/src/users/users.controller.ts`**
- GET /api/users/me — Get current user profile (requires JWT)
- PATCH /api/users/me — Update profile (UpdateProfileDto)
- DELETE /api/users/me — Request account deletion (DC-7 cascade)
- GET /api/users/:id — Get user by ID (admin only)

**File: `apps/api/src/users/users.service.ts`**
- findById(), findByEmail(), create(), update(), softDelete()
- deleteAccountWithCascade(): Implements DC-7 — cascading deletion of all user data

**File: `apps/api/src/prisma/prisma.module.ts`**
- Global module providing PrismaService

**File: `apps/api/src/prisma/prisma.service.ts`**
- Extends PrismaClient, implements OnModuleInit
- Middleware for soft delete filtering, RLS context setting
- Logging in development mode

**File: `apps/api/src/email/email.module.ts`**
- Wraps Resend SDK for transactional emails

**File: `apps/api/src/email/email.service.ts`**
- sendVerificationEmail(), sendPasswordResetEmail(), sendShareInviteEmail()

**File: `apps/api/src/crypto/crypto.service.ts`**
- AES-256-GCM encryption/decryption for sensitive fields (email, personal data)
- Key from environment variable

#### 4c. Frontend / UI Changes

**File: `apps/web/app/(auth)/login/page.tsx`**
- Login form: email + password fields, "Login" button, "Login with Google" button
- Link to register page
- MUI components, mobile-first layout

**File: `apps/web/app/(auth)/register/page.tsx`**
- Registration form: name, email, password, confirm password, profile type selector (Homeowner / Architect Individual / Architect Organization) — maps to User.profileType enum (HOMEOWNER, ARCHITECT_INDIVIDUAL, ARCHITECT_ORG). Selecting "Architect Organization" shows an additional "Organization Name" field and creates both User and Organization records on submit.
- "Register" button, "Sign up with Google" button (Google OAuth defaults to HOMEOWNER profileType; user can change in profile settings after login)
- Password strength indicator (visual bar: weak/medium/strong based on length + character variety)

**File: `apps/web/app/(auth)/verify-email/page.tsx`**
- Token validation on mount, success/error states
- Link to login

**File: `apps/web/app/(auth)/layout.tsx`**
- Auth layout: centered card, branding header, clean background

**File: `apps/web/lib/api-client.ts`**
- Axios-based API client with interceptors for JWT attachment, token refresh on 401, error handling
- Base URL from environment variable

**File: `apps/web/lib/auth-context.tsx`**
- React context providing: user, isAuthenticated, login(), register(), logout()
- Persists auth state across page loads via token refresh

**File: `apps/web/app/(auth)/forgot-password/page.tsx`**
- Email input, submit button, success message

**File: `apps/web/app/(auth)/reset-password/page.tsx`**
- New password + confirm password, submit

#### 4d. Shared / Cross-cutting Changes

**File: `packages/shared/src/types/user.ts`**
- ProfileType enum, PlatformRole enum, ProjectRole enum
- UserDto, RegisterDto, LoginDto, AuthResponse interfaces

**File: `packages/shared/src/types/api.ts`**
- ApiResponse<T>, PaginatedResponse<T>, ErrorResponse interfaces

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| CREATE | apps/api/prisma/schema.prisma | Complete database schema | High |
| CREATE | apps/api/prisma/seed.ts | Seed data for demo | Low |
| CREATE | apps/api/src/prisma/prisma.module.ts | Prisma global module | Low |
| CREATE | apps/api/src/prisma/prisma.service.ts | Prisma service with middleware | Med |
| CREATE | apps/api/src/auth/auth.module.ts | Auth module | Med |
| CREATE | apps/api/src/auth/auth.controller.ts | Auth endpoints | Med |
| CREATE | apps/api/src/auth/auth.service.ts | Auth business logic | High |
| CREATE | apps/api/src/auth/strategies/jwt.strategy.ts | JWT validation | Med |
| CREATE | apps/api/src/auth/strategies/google.strategy.ts | Google OAuth | Med |
| CREATE | apps/api/src/auth/guards/jwt-auth.guard.ts | JWT guard | Low |
| CREATE | apps/api/src/auth/guards/roles.guard.ts | Platform role guard | Low |
| CREATE | apps/api/src/auth/guards/project-role.guard.ts | Project role guard | Med |
| CREATE | apps/api/src/auth/dto/*.ts | Auth DTOs with validation | Low |
| CREATE | apps/api/src/users/users.module.ts | Users module | Low |
| CREATE | apps/api/src/users/users.controller.ts | User endpoints | Low |
| CREATE | apps/api/src/users/users.service.ts | User business logic | Med |
| CREATE | apps/api/src/email/email.module.ts | Email module | Low |
| CREATE | apps/api/src/email/email.service.ts | Email via Resend | Low |
| CREATE | apps/api/src/crypto/crypto.service.ts | AES-256-GCM encryption | Med |
| CREATE | apps/web/app/(auth)/login/page.tsx | Login page | Low |
| CREATE | apps/web/app/(auth)/register/page.tsx | Register page | Low |
| CREATE | apps/web/app/(auth)/verify-email/page.tsx | Email verify page | Low |
| CREATE | apps/web/app/(auth)/forgot-password/page.tsx | Forgot password | Low |
| CREATE | apps/web/app/(auth)/reset-password/page.tsx | Reset password | Low |
| CREATE | apps/web/app/(auth)/layout.tsx | Auth layout | Low |
| CREATE | apps/web/lib/api-client.ts | API client with interceptors | Med |
| CREATE | apps/web/lib/auth-context.tsx | Auth React context | Med |
| CREATE | packages/shared/src/types/user.ts | Shared user types | Low |
| MODIFY | apps/api/src/app.module.ts | Import auth, users, prisma, email modules | Low |
| MODIFY | apps/web/app/layout.tsx | Wrap with AuthProvider | Low |

### 6. Dependency & Reference Check

#### Database Wiring
- First Prisma migration: `npx prisma migrate dev --name init`
- Seed script: `npx prisma db seed`
- PrismaModule registered as global in AppModule

#### Frontend Wiring
- npm packages: axios, @mui/icons-material
- API client created and used by auth context
- Auth layout group (auth) with centered card design
- AuthProvider wrapping root layout

#### Backend Wiring
- npm packages: @nestjs/jwt, @nestjs/passport, passport, passport-jwt, passport-google-oauth20, bcrypt, @nestjs-modules/mailer or resend SDK, uuid (v7)
- AuthModule, UsersModule, PrismaModule, EmailModule registered in AppModule
- JwtAuthGuard set as global guard (with @Public() decorator for open endpoints)
- ThrottlerModule rate limits: 10 req/min on auth endpoints

### 7. Implementation Plan

**Step 1:** Install database dependencies and create Prisma schema
- Files: apps/api/prisma/schema.prisma, apps/api/package.json (add prisma, @prisma/client)
- Action: create
- Details: Complete schema with all models, enums, relations, indexes. UUIDs v7 as PKs. snake_case mapping. Soft delete (deletedAt) on major entities.

**Step 2:** Run initial migration and create seed script
- Files: apps/api/prisma/seed.ts
- Action: create
- Details: Seed demo user, sample project, 2 rooms, template entries. Add seed script to package.json.

**Step 3:** Create PrismaModule and PrismaService
- Files: apps/api/src/prisma/prisma.module.ts, apps/api/src/prisma/prisma.service.ts
- Action: create
- Details: Global module. Service extends PrismaClient, adds soft-delete middleware (filters deletedAt != null by default), logging middleware for dev.

**Step 4:** Create crypto service for field encryption
- Files: apps/api/src/crypto/crypto.service.ts, apps/api/src/crypto/crypto.module.ts
- Action: create
- Details: AES-256-GCM encrypt/decrypt methods. Key from ENCRYPTION_KEY env var. Used for email and personal data encryption.

**Step 5:** Create email service
- Files: apps/api/src/email/email.service.ts, apps/api/src/email/email.module.ts
- Action: create
- Details: Resend SDK wrapper. Methods for verification email, password reset, share invite. Templates with branding.

**Step 6:** Create auth module with JWT and Google OAuth strategies
- Files: apps/api/src/auth/auth.module.ts, auth.service.ts, auth.controller.ts, strategies/*, guards/*, dto/*
- Action: create
- Details: Full auth flow: register, login, refresh, Google OAuth, email verification, password reset. JWT access (15min) + refresh (7 days httpOnly cookie). Guards for JWT, platform roles, project roles.

**Step 7:** Create users module
- Files: apps/api/src/users/users.module.ts, users.controller.ts, users.service.ts, dto/*
- Action: create
- Details: GET/PATCH/DELETE /api/users/me. Account deletion with DC-7 cascade. Profile update validation.

**Step 8:** Register all modules in AppModule
- Files: apps/api/src/app.module.ts
- Action: modify
- Details: Import PrismaModule (global), AuthModule, UsersModule, EmailModule, CryptoModule. Set JwtAuthGuard as global guard.

**Step 9:** Create shared types
- Files: packages/shared/src/types/user.ts, packages/shared/src/types/api.ts
- Action: create
- Details: Shared enums and DTOs for type safety between frontend and backend.

**Step 10:** Create frontend API client and auth context
- Files: apps/web/lib/api-client.ts, apps/web/lib/auth-context.tsx
- Action: create
- Details: Axios client with JWT interceptor, auto-refresh on 401. React context with login/register/logout/user state.

**Step 11:** Create auth pages
- Files: apps/web/app/(auth)/layout.tsx, login/page.tsx, register/page.tsx, verify-email/page.tsx, forgot-password/page.tsx, reset-password/page.tsx
- Action: create
- Details: MUI forms, mobile-first, profile type selector, password strength, error handling.

**Step 12:** Update root layout with AuthProvider
- Files: apps/web/app/layout.tsx
- Action: modify
- Details: Wrap children with AuthProvider from auth-context.

### 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Prisma schema complexity causing migration issues | High | Test migration on clean DB, use prisma migrate reset for dev |
| JWT refresh token rotation vulnerability | Med | Use one-time refresh tokens (invalidate after use), store token family for reuse detection |
| Google OAuth callback URL misconfiguration | Low | Document exact callback URLs in .env.example, test on localhost |
| RLS policies blocking legitimate queries | Med | Thorough integration testing with multiple users/roles, RLS bypass for admin operations |
| Password reset token replay attack | Med | One-time tokens with 1-hour expiry, invalidate on use |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests
- **AuthService.register:** Creates user with hashed password, sends email, returns success
- **AuthService.register:** Rejects duplicate email
- **AuthService.login:** Returns tokens for valid credentials
- **AuthService.login:** Rejects invalid password
- **AuthService.login:** Rejects unverified email
- **AuthService.refreshTokens:** Issues new tokens for valid refresh token
- **AuthService.refreshTokens:** Rejects expired refresh token
- **JwtStrategy:** Extracts and validates JWT from header
- **RolesGuard:** Allows matching role, denies non-matching
- **ProjectRoleGuard:** Allows matching project role, denies non-matching
- **UsersService.deleteAccountWithCascade:** Cascades deletion correctly (DC-7)
- **CryptoService:** Encrypts and decrypts correctly, different ciphertext each time
- **DTOs:** Validation rejects invalid input (missing fields, bad email format, short password)

#### 9b. Integration Tests
- **Auth flow end-to-end:** Register → verify email → login → access protected endpoint → refresh → logout
- **Google OAuth flow:** Mock Google response → user created → tokens issued
- **Database RLS:** User A cannot read User B's data via API
- **Cascade deletion:** Delete user → verify all related data deleted
- **Rate limiting:** Auth endpoints reject after 10 requests/minute

#### 9c. E2E UI Automation Tests
- **Registration flow:** Fill form → submit → verify success message → check email verification page
- **Login flow:** Enter credentials → submit → redirected to dashboard → user name displayed
- **Google OAuth:** Click "Login with Google" → redirected (mock Google) → logged in
- **Protected route:** Access dashboard without login → redirected to login
- **Profile update:** Login → navigate to profile → update name → verify change persisted

### 10. Verification Criteria
- [ ] Prisma migration runs without errors
- [ ] Seed data creates demo user and sample project
- [ ] POST /api/auth/register creates user and sends email
- [ ] POST /api/auth/login returns valid JWT
- [ ] Protected endpoints return 401 without token
- [ ] Protected endpoints return data with valid token
- [ ] Google OAuth flow works end-to-end
- [ ] Refresh token rotation works
- [ ] Platform role guards enforce correctly
- [ ] Project role guards enforce correctly
- [ ] Account deletion cascades completely (DC-7)
- [ ] RLS policies prevent cross-tenant data access (DC-9)
- [ ] All auth DTOs validate input (DC-14)
- [ ] Rate limiting works on auth endpoints
- [ ] Frontend auth pages render correctly on mobile
- [ ] Login/register forms submit and handle errors
