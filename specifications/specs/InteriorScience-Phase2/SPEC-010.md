# SPEC-010 — Auth Context + Profile

**Parent Feature:** InteriorScience Phase 2
**Spec Number:** 010 of 016 (Phase 2: 1 of 7)
**Prerequisites:** None (Phase 1 complete)

## Status: Not Started

### 1. Objective

Create an AuthProvider React context that protects all authenticated routes, provides user state via useAuth() hook, and build a functional profile page with user data display, name editing, logout, and account deletion.

- **Before:** Unauthenticated users can access /dashboard, /projects, etc. Profile page is a placeholder. No global auth state.
- **After:** All (main) routes protected — redirect to /login if not authenticated. Profile page shows real user data with edit/logout/delete. useAuth() hook available everywhere.
- **Success criteria:** Visiting /dashboard without token → redirected to /login. Profile shows user name/email. Logout clears session. Delete account works with confirmation.

### 2. Architecture

```
AuthProvider (wraps apps/web/app/(main)/layout.tsx)
  ├── On mount: check localStorage for token
  │   ├── Token exists → validate via GET /api/users/me
  │   │   ├── 200 OK → set user state, render children
  │   │   └── 401 → clear token, redirect to /login
  │   └── No token → redirect to /login
  ├── Provides: { user, isAuthenticated, logout() }
  └── On logout: clear token + localStorage, redirect to /

Profile Page (/profile)
  ├── Fetch user data from useAuth() context (already loaded)
  ├── Display: name, email, profile type, platform role
  ├── Edit name → PATCH /api/users/me → update context
  ├── Logout → clear token → redirect to /
  └── Delete Account → confirmation dialog → DELETE /api/users/me → redirect to /
```

### 3. Design Constraints

- P2-DC-2: MUI component patterns, tree-shaking imports, mobile-first, 48x48dp touch targets
- P2-DC-8: Use window.location.hostname for direct API calls
- P2-DC-9: All Phase 1 constraints (DC-1 to DC-14) remain in effect
- P2-E2: Token in localStorage but expired → validate via /api/users/me, clear on 401, show spinner during check

### 4. Detailed Design

#### 4a. Database / Schema Changes
- None — all models exist

#### 4b. Backend / API Changes
- None — GET /api/users/me, PATCH /api/users/me, DELETE /api/users/me already implemented
- Add @Public() decorator to health endpoint (currently returns 401)

**File: `apps/api/src/health/health.controller.ts`**
- Add `@Public()` import and decorator to `getHealth()` method

#### 4c. Frontend / UI Changes

**File: `apps/web/lib/auth-context.tsx`** (CREATE)
- React context with AuthProvider component
- State: user (UserDto | null), isAuthenticated (boolean), loading (boolean)
- On mount: check localStorage token → validate via apiClient.fetch('/users/me')
- If valid: set user, isAuthenticated=true
- If invalid/missing: redirect to /login via router.replace('/login')
- logout(): calls apiClient.setToken(null), redirects to /
- Exports: AuthProvider component, useAuth() hook

**File: `apps/web/app/(main)/layout.tsx`** (MODIFY)
- Wrap children with AuthProvider
- Show loading spinner while auth check runs

**File: `apps/web/app/(main)/profile/page.tsx`** (REWRITE)
- useAuth() to get user data
- Display: Avatar placeholder, name (editable), email (read-only), profile type badge, platform role badge, member since date
- "Edit Name" inline editing with save button → PATCH /api/users/me
- "Logout" button → auth context logout()
- "Delete Account" section with red button → confirmation dialog → DELETE /api/users/me

**File: `apps/web/app/(auth)/login/page.tsx`** (MODIFY)
- After successful login, update auth context (if accessible) or rely on redirect + AuthProvider re-validation

#### 4d. Shared / Cross-cutting Changes
- None

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| CREATE | apps/web/lib/auth-context.tsx | Auth React context + useAuth hook | Med |
| MODIFY | apps/web/app/(main)/layout.tsx | Wrap with AuthProvider | Med |
| REWRITE | apps/web/app/(main)/profile/page.tsx | Full profile page with user data | Med |
| MODIFY | apps/api/src/health/health.controller.ts | Add @Public() decorator | Low |
| MODIFY | apps/web/app/(auth)/login/page.tsx | Minor — ensure redirect works with auth context | Low |

### 6. Dependency & Reference Check

#### Frontend Wiring
- No new npm packages needed
- auth-context.tsx uses existing apiClient from lib/api-client.ts
- Profile page uses existing MUI components

#### Backend Wiring
- Only change: @Public() on health endpoint
- Users module endpoints already exist and work

### 7. Implementation Plan

**Step 1:** Add @Public() to health controller
- File: apps/api/src/health/health.controller.ts
- Action: modify
- Details: Import Public decorator from auth/guards/public.decorator, add @Public() above @Get()

**Step 2:** Create AuthProvider context
- File: apps/web/lib/auth-context.tsx
- Action: create
- Details: React context with provider, useAuth hook. Validates token on mount, manages user state, provides logout.

**Step 3:** Wrap main layout with AuthProvider
- File: apps/web/app/(main)/layout.tsx
- Action: modify
- Details: Import AuthProvider, wrap {children} with it. Show CircularProgress during auth loading.

**Step 4:** Rewrite profile page
- File: apps/web/app/(main)/profile/page.tsx
- Action: rewrite
- Details: Full profile with user data display, inline name edit, logout button, delete account danger zone.

**Step 5:** Verify login flow
- File: apps/web/app/(auth)/login/page.tsx
- Action: verify/minor modify
- Details: Ensure login redirect to /dashboard triggers AuthProvider validation correctly.

### 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Auth check on every (main) page load causes flash | Med | Show loading spinner in AuthProvider, validate only once per mount |
| Token in localStorage but user deleted from DB | Low | /api/users/me returns 404/401, AuthProvider clears token and redirects |
| Circular redirect: /login → /dashboard → /login | Med | AuthProvider only redirects if NOT on auth pages. Login page doesn't wrap with AuthProvider. |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests
- AuthProvider renders children when token valid
- AuthProvider redirects to /login when no token
- AuthProvider redirects to /login when token expired (401 from API)
- useAuth() returns user data when authenticated
- useAuth().logout() clears token and redirects

#### 9b. Integration Tests
- Login → redirect to /dashboard → AuthProvider validates → page renders
- Visit /dashboard without token → redirected to /login
- Visit /profile → shows user data from API
- Logout → token cleared → redirect to landing

#### 9c. E2E UI Automation Tests
- Full auth flow: register → login → dashboard visible → profile shows data
- Logout flow: profile → click logout → landing page shown → /dashboard redirects to /login
- Profile edit: change name → save → name updated
- Delete account: click delete → confirm → account gone → redirected to landing

### 10. Verification Criteria
- [ ] Visiting /dashboard without auth redirects to /login
- [ ] Visiting /projects without auth redirects to /login
- [ ] Login → /dashboard renders with user data
- [ ] Profile page shows real user name, email, profile type
- [ ] Edit name saves via PATCH /api/users/me
- [ ] Logout clears token and redirects to /
- [ ] Delete account removes user and redirects to /
- [ ] Health endpoint returns 200 without auth token
- [ ] No circular redirect loops
