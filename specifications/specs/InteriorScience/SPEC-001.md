# SPEC-001 — Project Scaffolding & Infrastructure

**Parent Feature:** InteriorScience MVP
**Spec Number:** 001 of 9
**Prerequisites:** None

## Status: Not Started

### 1. Objective

Set up the complete project infrastructure from scratch: pnpm monorepo with frontend (Next.js 14+ PWA) and backend (NestJS) apps, shared TypeScript types package, Docker Compose for local development (PostgreSQL, Redis, Nginx), CI/CD pipeline via GitHub Actions, and all configuration files (TypeScript, ESLint, Prettier, environment variables).

- **Before:** Empty repository with only specification documents
- **After:** Fully scaffolded monorepo with both apps running locally via Docker Compose, CI pipeline passing, PWA foundations in place
- **Success criteria:** `pnpm install` works, `docker compose up` starts all services, frontend accessible at localhost:3000, API accessible at localhost:4000/api/health, GitHub Actions CI passes on push

### 2. Architecture

```
HomeDesigner/
├── .github/
│   └── workflows/
│       └── ci.yml                    # Lint + type-check + test + build
├── apps/
│   ├── web/                          # Next.js 14+ PWA (App Router)
│   │   ├── app/                      # App Router pages
│   │   │   ├── layout.tsx            # Root layout with MUI theme
│   │   │   ├── page.tsx              # Landing/dashboard
│   │   │   └── manifest.ts           # PWA manifest
│   │   ├── public/
│   │   │   ├── icons/                # PWA icons
│   │   │   └── sw.js                 # Service worker stub
│   │   ├── next.config.js
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── ai-worker/                    # AI Worker (BullMQ consumer, ONNX Runtime)
│   │   ├── src/
│   │   │   ├── main.ts              # Worker entry point
│   │   │   ├── processors/          # Job processors (segmentation, visualization)
│   │   │   └── models/              # ONNX model wrappers (SAM, SD 1.5)
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── api/                          # NestJS API
│       ├── src/
│       │   ├── main.ts               # Bootstrap + Swagger
│       │   ├── app.module.ts          # Root module
│       │   ├── health/
│       │   │   ├── health.controller.ts
│       │   │   └── health.module.ts
│       │   └── common/
│       │       ├── filters/           # Exception filters
│       │       ├── interceptors/      # Logging, transform
│       │       └── guards/            # Auth guard stubs
│       ├── test/
│       ├── nest-cli.json
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   └── shared/                       # Shared TypeScript types
│       ├── src/
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
├── docker/
│   ├── nginx/
│   │   └── nginx.conf                # Reverse proxy config
│   ├── Dockerfile.web                # Next.js production build
│   └── Dockerfile.api                # NestJS production build
├── docker-compose.yml                # Full local dev stack
├── docker-compose.override.yml       # Dev overrides (hot reload)
├── .env.example                      # Environment variable template
├── .gitignore
├── .prettierrc.json
├── .eslintrc.json
├── pnpm-workspace.yaml
├── package.json                      # Root package.json
└── tsconfig.base.json                # Shared TS config
```

Data flow for dev environment:
```
Browser → Nginx (:80) → /api/* → NestJS (:4000)
                       → /*    → Next.js (:3000)

NestJS → PostgreSQL (:5432)
       → Redis (:6379)
```

### 3. Design Constraints

- DC-12: Application MUST be a valid PWA with service worker, web app manifest, installable on Android. Lighthouse PWA score >90.
- DC-13: Time to Interactive <3 seconds on mid-range Android on 4G. Bundle size <500KB gzipped initial load.
- DC-14: All API endpoints MUST validate input via class-validator DTOs.
- TRD: TypeScript everywhere — shared types between frontend and backend.
- TRD: pnpm workspaces for monorepo (AI-DECIDED, Decision #1).
- TRD: Next.js App Router (AI-DECIDED, Decision #17).
- TRD: Single-server Docker Compose architecture for MVP.
- TRD: GitHub Actions CI/CD with lint + type-check + test + build.
- English-only for MVP (AI-DECIDED, Decision #12), but i18n-ready architecture.

### 4. Detailed Design

#### 4a. Database / Schema Changes
- No schema changes in this spec (database container only)
- PostgreSQL 16 Docker image configured with volume persistence
- Redis 7 Docker image configured

#### 4b. Backend / API Changes

**File: `apps/api/src/main.ts`**
- NestJS bootstrap with global pipes (ValidationPipe with class-validator), exception filters, CORS configuration
- Swagger/OpenAPI setup at /api/docs
- Port 4000

**File: `apps/api/src/app.module.ts`**
- Root module importing HealthModule, ConfigModule (@nestjs/config)
- ThrottlerModule for rate limiting (DC-14)
- Global ValidationPipe configuration

**File: `apps/api/src/health/health.controller.ts`**
- GET /api/health — returns { status: 'ok', timestamp, version }
- Basic readiness check (can connect to DB and Redis)

**File: `apps/api/src/common/filters/http-exception.filter.ts`**
- Global exception filter returning consistent error shape: { statusCode, message, error, timestamp, path }

**File: `apps/api/src/common/interceptors/logging.interceptor.ts`**
- Request/response logging interceptor with duration tracking

#### 4c. Frontend / UI Changes

**File: `apps/web/app/layout.tsx`**
- Root layout with Material UI (MUI) ThemeProvider
- Custom theme with neutral palette + accent colors per PRD §7
- Metadata for PWA (title, description, theme-color)
- Viewport meta for mobile-first

**File: `apps/web/app/page.tsx`**
- Minimal landing page with "InteriorScience" branding
- "Get Started" CTA (placeholder — wired in SPEC-002)

**File: `apps/web/app/manifest.ts`**
- Dynamic PWA manifest: name, short_name, icons, start_url, display: standalone, theme_color, background_color

**File: `apps/web/public/sw.js`**
- Minimal service worker: cache app shell (HTML, CSS, JS bundles), network-first for API calls
- Foundation for offline support (expanded in later specs)

**File: `apps/web/next.config.js`**
- Output: standalone (for Docker)
- PWA headers configuration
- API proxy rewrite: /api/* → http://api:4000/api/*

#### 4d. Shared / Cross-cutting Changes

**File: `packages/shared/src/index.ts`**
- Export shared constants (API routes, error codes)
- Export shared TypeScript interfaces (ApiResponse<T>, PaginatedResponse<T>, ErrorResponse)

**File: `docker-compose.yml`**
- Services: web (Next.js :3000), api (NestJS :4000), ai-worker (BullMQ consumer), postgres (:5432), redis (:6379), nginx (:80)
- Volumes: postgres-data, redis-data, model-cache (for ONNX models)
- Networks: interior-network
- Environment variables from .env

**File: `docker/nginx/nginx.conf`**
- Reverse proxy: / → web:3000, /api → api:4000
- WebSocket upgrade support (for future real-time features)
- Gzip compression, security headers (CSP, X-Frame-Options, etc. per TRD §9)

**File: `.github/workflows/ci.yml`**
- Trigger: push to main, PR to main
- Jobs: lint, type-check, test, build (parallel where possible)
- Uses pnpm/action-setup, node setup

**File: `.env.example`**
- DATABASE_URL, REDIS_URL, R2 credentials, JWT_SECRET, GOOGLE_OAUTH_CLIENT_ID, etc.

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| CREATE | pnpm-workspace.yaml | Monorepo workspace definition | Low |
| CREATE | package.json | Root package.json with scripts | Low |
| CREATE | tsconfig.base.json | Shared TypeScript config | Low |
| CREATE | .gitignore | Git ignore patterns | Low |
| CREATE | .prettierrc.json | Code formatting rules | Low |
| CREATE | .eslintrc.json | Linting rules | Low |
| CREATE | .env.example | Environment variable template | Low |
| CREATE | docker-compose.yml | Full dev stack definition | Med |
| CREATE | docker-compose.override.yml | Dev hot-reload overrides | Low |
| CREATE | docker/nginx/nginx.conf | Reverse proxy config | Med |
| CREATE | docker/Dockerfile.web | Next.js production Docker | Low |
| CREATE | docker/Dockerfile.api | NestJS production Docker | Low |
| CREATE | apps/web/package.json | Frontend dependencies | Low |
| CREATE | apps/web/tsconfig.json | Frontend TS config | Low |
| CREATE | apps/web/next.config.js | Next.js configuration | Low |
| CREATE | apps/web/app/layout.tsx | Root layout + MUI theme | Low |
| CREATE | apps/web/app/page.tsx | Landing page | Low |
| CREATE | apps/web/app/manifest.ts | PWA manifest | Low |
| CREATE | apps/web/public/sw.js | Service worker | Med |
| CREATE | apps/api/package.json | Backend dependencies | Low |
| CREATE | apps/api/tsconfig.json | Backend TS config | Low |
| CREATE | apps/api/nest-cli.json | NestJS CLI config | Low |
| CREATE | apps/api/src/main.ts | NestJS bootstrap | Low |
| CREATE | apps/api/src/app.module.ts | Root module | Low |
| CREATE | apps/api/src/health/health.controller.ts | Health endpoint | Low |
| CREATE | apps/api/src/health/health.module.ts | Health module | Low |
| CREATE | apps/api/src/common/filters/http-exception.filter.ts | Exception filter | Low |
| CREATE | apps/api/src/common/interceptors/logging.interceptor.ts | Logging interceptor | Low |
| CREATE | packages/shared/package.json | Shared types package | Low |
| CREATE | packages/shared/tsconfig.json | Shared TS config | Low |
| CREATE | packages/shared/src/index.ts | Shared types/constants | Low |
| CREATE | .github/workflows/ci.yml | CI pipeline | Low |

### 6. Dependency & Reference Check

#### Frontend Wiring
- npm packages: next@14+, react@18+, @mui/material, @emotion/react, @emotion/styled
- No API client yet (stub in this spec)
- No route registrations yet (only root page)

#### Backend Wiring
- npm packages: @nestjs/core, @nestjs/common, @nestjs/config, @nestjs/platform-express, @nestjs/swagger, @nestjs/throttler, class-validator, class-transformer
- HealthModule registered in AppModule
- Global ValidationPipe, exception filter, logging interceptor in main.ts

#### Infrastructure
- Docker Compose: PostgreSQL 16, Redis 7, Nginx, web, api, ai-worker services
- pnpm workspaces: apps/web, apps/api, apps/ai-worker, packages/shared

### 7. Implementation Plan

**Step 1:** Create root configuration files
- Files: package.json, pnpm-workspace.yaml, tsconfig.base.json, .gitignore, .prettierrc.json, .eslintrc.json, .env.example
- Action: create
- Details: Root package.json with pnpm workspace scripts (dev, build, lint, test). tsconfig.base.json with strict mode, ES2022 target, path aliases. Standard gitignore for Node.js + Next.js + NestJS.

**Step 2:** Create shared types package
- Files: packages/shared/package.json, packages/shared/tsconfig.json, packages/shared/src/index.ts
- Action: create
- Details: Minimal package with shared TypeScript interfaces (ApiResponse, PaginatedResponse, ErrorResponse) and constants (API_ROUTES, ERROR_CODES).

**Step 3:** Scaffold NestJS backend
- Files: apps/api/package.json, apps/api/tsconfig.json, apps/api/nest-cli.json, apps/api/src/main.ts, apps/api/src/app.module.ts
- Action: create
- Details: NestJS app with ConfigModule, ThrottlerModule, global ValidationPipe, Swagger at /api/docs. CORS configured for localhost:3000 and production domain.

**Step 4:** Create backend health module and common utilities
- Files: apps/api/src/health/*, apps/api/src/common/filters/*, apps/api/src/common/interceptors/*
- Action: create
- Details: Health controller with GET /api/health endpoint. Global HTTP exception filter. Request logging interceptor.

**Step 5:** Scaffold Next.js frontend
- Files: apps/web/package.json, apps/web/tsconfig.json, apps/web/next.config.js, apps/web/app/layout.tsx, apps/web/app/page.tsx
- Action: create
- Details: Next.js 14+ with App Router, MUI ThemeProvider in root layout, standalone output for Docker, API proxy rewrite to backend.

**Step 6:** Add PWA support
- Files: apps/web/app/manifest.ts, apps/web/public/sw.js, apps/web/public/icons/*
- Action: create
- Details: PWA manifest with app name, icons, standalone display. Service worker caching app shell. Generate PWA icons (placeholder SVGs).

**Step 7:** Create Docker configuration
- Files: docker-compose.yml, docker-compose.override.yml, docker/nginx/nginx.conf, docker/Dockerfile.web, docker/Dockerfile.api
- Action: create
- Details: Docker Compose with all services (web, api, postgres, redis, nginx). Dev override enables hot reload via volume mounts. Nginx routes / to web, /api to api with WebSocket support.

**Step 8:** Create CI/CD pipeline
- Files: .github/workflows/ci.yml
- Action: create
- Details: GitHub Actions workflow: on PR and push to main. Jobs: install deps (pnpm), lint (eslint), type-check (tsc --noEmit), test (jest/vitest), build (next build + nest build).

### 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| pnpm workspace resolution issues between apps | Med | Use explicit workspace:* protocol in dependencies, test cross-package imports early |
| Docker Compose networking issues between services | Med | Use explicit network names, health checks on postgres/redis before api starts |
| PWA service worker caching stale assets | Low | Version-based cache keys, skipWaiting + clients.claim strategy |
| MUI bundle size exceeding DC-13 limit | Med | Use tree-shaking imports (@mui/material/Button not @mui/material), check bundle with next/bundle-analyzer |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests
- **Health controller:** GET /api/health returns 200 with correct shape
- **Exception filter:** Transforms HttpException to consistent error shape
- **Logging interceptor:** Logs request method, URL, and duration
- **Shared types:** Type exports compile correctly

#### 9b. Integration Tests
- **API → Health endpoint:** HTTP request to running NestJS app returns 200
- **Docker Compose:** All services start and reach healthy state
- **Frontend → API proxy:** Request from Next.js to /api/health proxied correctly

#### 9c. E2E UI Automation Tests
- **Landing page loads:** Navigate to localhost:3000, verify page renders with "InteriorScience" branding
- **PWA installable:** Lighthouse PWA audit passes with score >90
- **API health accessible:** Navigate to /api/health, verify JSON response

### 10. Verification Criteria
- [ ] `pnpm install` completes without errors
- [ ] `pnpm run build` succeeds for all packages
- [ ] `docker compose up` starts all services (postgres, redis, nginx, web, api)
- [ ] Frontend accessible at localhost:3000 (or localhost:80 via nginx)
- [ ] API health check at localhost:4000/api/health returns 200
- [ ] Nginx proxy: localhost:80/api/health routes to API
- [ ] TypeScript strict mode passes for all packages
- [ ] ESLint passes with zero errors
- [ ] PWA manifest served correctly
- [ ] Service worker registers successfully
- [ ] GitHub Actions CI workflow syntax is valid
- [ ] All unit tests pass
- [ ] Bundle size <500KB gzipped (DC-13)
