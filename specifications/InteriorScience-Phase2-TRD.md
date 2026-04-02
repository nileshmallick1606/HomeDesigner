# Technical Requirements Document — InteriorScience Phase 2

## 1. Technical Summary

Phase 2 completes the InteriorScience MVP by implementing frontend UI for all backend-ready features, creating the AI worker pipeline in mock mode, adding auth route protection, and building the export module. The existing tech stack (Next.js 15, NestJS 10, Prisma 6, PostgreSQL 16, Redis 7) is unchanged. Phase 2 adds Fabric.js for the design editor, Recharts for budget visualization, Socket.IO client for real-time, and PDFKit for export.

## 2. Existing Technology Stack (Unchanged)

| Layer | Technology | Status |
|-------|-----------|--------|
| Frontend | Next.js 15 (App Router), React 19 | Installed |
| UI Library | MUI 5 (Material Design) | Installed |
| Backend | NestJS 10 | Installed |
| Database | PostgreSQL 16 + Prisma 6 | Running |
| Cache/Queue | Redis 7 + BullMQ 5 | Running |
| Storage | Local filesystem (R2 fallback) | Working |
| Image Processing | Sharp 0.34 | Installed |
| WebSocket (server) | @nestjs/websockets + socket.io | Installed |
| Auth | JWT (Passport.js) | Working |

## 3. New Dependencies (Phase 2)

| Package | App | Purpose | Install Command |
|---------|-----|---------|----------------|
| fabric (v6+) | web | Canvas-based design editor | `pnpm add fabric` in apps/web |
| recharts | web | Budget charts (pie, bar) | `pnpm add recharts` in apps/web |
| socket.io-client | web | Real-time event subscription | `pnpm add socket.io-client` in apps/web |
| pdfkit | api | PDF generation for export | `pnpm add pdfkit` in apps/api |
| @prisma/client | ai-worker | Database access from worker | `pnpm add @prisma/client` in apps/ai-worker |
| sharp | ai-worker | Image processing for mock AI | `pnpm add sharp` in apps/ai-worker |

## 4. Architecture Changes

### 4a. AI Worker Architecture

The AI worker (`apps/ai-worker`) currently has a placeholder `main.ts`. Phase 2 adds:

```
apps/ai-worker/src/
├── main.ts                          # BullMQ worker bootstrap (rewrite)
├── processors/
│   ├── segmentation.processor.ts    # SAM mock: simple edge detection
│   └── visualization.processor.ts   # SD mock: color/style filter
├── models/
│   └── mock-ai.ts                   # Shared mock image transformation utils
└── lib/
    ├── prisma.ts                    # Prisma client instance
    └── r2.ts                        # R2/local storage client
```

**Mock AI Strategy:**
- Segmentation: Use Sharp to detect edges (Canny-like) and generate a labeled mask image. Store as segmentation result.
- Visualization: Use Sharp to apply category-based transformations:
  - CIVIL (wall color): Tint the image with a target color
  - BATHROOM/KITCHEN: Adjust hue/saturation
  - FURNISHINGS: Apply brightness/contrast shift
  - ELECTRICAL: Warm/cool color temperature shift
- This produces visible before/after differences that demonstrate the full pipeline without real ML models.

### 4b. WebSocket Gateway

```
apps/api/src/common/gateways/
└── events.gateway.ts    # Socket.IO gateway for real-time events
```

Events broadcast:
- `job:status` — AI job status changes (QUEUED → PROCESSING → COMPLETED/FAILED)
- `comment:new` — New comment on a project
- `notification:new` — New notification for a user

Authentication: JWT token passed as query param on connection. Gateway validates and associates socket with userId.

### 4c. Export Module

```
apps/api/src/export/
├── export.module.ts
├── export.controller.ts
└── export.service.ts
```

Endpoints:
- `GET /api/export/design/:id/image?format=jpeg|png` — Download visualization image
- `GET /api/export/design/:id/comparison` — Before/after composite image
- `GET /api/export/project/:id/pdf` — Project summary PDF

### 4d. Auth Context (Frontend)

```
apps/web/lib/
└── auth-context.tsx    # React context with useAuth() hook
```

Strategy: Client-side auth check using localStorage token. The `AuthProvider` wraps `(main)/layout.tsx`. On mount, it checks for token existence and optionally validates via `GET /api/users/me`. If no token or validation fails, redirect to `/login`.

## 5. Design Constraints (Phase 2 Specific)

1. **P2-DC-1:** AI Worker mock mode MUST produce visually distinct before/after images. Users should see a clear difference when comparing original vs visualization, even though it's not real AI.

2. **P2-DC-2:** All new frontend components MUST follow the existing MUI component patterns: tree-shaking imports (`@mui/material/Button`), mobile-first responsive design, 48x48dp minimum touch targets.

3. **P2-DC-3:** Fabric.js MUST be loaded via dynamic import (`next/dynamic`) to avoid impacting initial bundle size. It should only load on the editor page.

4. **P2-DC-4:** Budget charts MUST use Recharts with dynamic import. Chart components should only render on budget-related views.

5. **P2-DC-5:** WebSocket connection MUST auto-reconnect on disconnect. Fallback to polling (existing JobStatus component) if WebSocket is unavailable.

6. **P2-DC-6:** Export PDF MUST be generated server-side via PDFKit. Client downloads the completed file. Maximum 50 pages per PDF.

7. **P2-DC-7:** Camera capture MUST request permission explicitly and handle denied state with clear messaging. Fallback to file picker always available.

8. **P2-DC-8:** The `window.location.hostname` pattern for direct API calls (photo upload, delete) MUST be used for all new direct API calls to support mobile testing over LAN.

9. **P2-DC-9:** All existing Phase 1 design constraints (DC-1 through DC-14) remain in effect.

## 6. Edge Case Decisions (Phase 2)

| # | Category | Question | Decision | Rationale |
|---|----------|----------|----------|-----------|
| P2-E1 | AI Mock | What if mock visualization produces identical image to original? | Apply minimum 20% hue shift + overlay text watermark "AI Preview (Mock)" to ensure visible difference | Users need to see the pipeline works even in mock mode |
| P2-E2 | Auth | What if token exists in localStorage but is expired? | AuthProvider validates token via /api/users/me on mount. If 401, clear token and redirect to /login. Show brief loading spinner during check. | Prevents stale sessions showing empty data |
| P2-E3 | Budget | What if user enters negative budget amounts? | Reject negative values with inline validation error. Allow zero. | Negative budgets are nonsensical |
| P2-E4 | Comments | What if user tries to comment on a project they're not a member of? | Backend already enforces project membership via query scoping. Frontend should show "Join project to comment" if comment creation fails with 403. | Defense in depth |
| P2-E5 | Export PDF | What if project has many rooms (50+) with many photos? | Limit PDF to first 50 pages. Show warning if truncated. Each room gets max 2 pages (4 photos + budget). | Prevent memory issues and huge files |
| P2-E6 | Camera | What happens on desktop browsers without camera? | Show file picker fallback only. Hide camera button if getUserMedia is not available. | Desktop users can still upload via file picker |
| P2-E7 | Share Links | What if share link is accessed after project is deleted? | Return 404 with message "This project no longer exists." | Soft-deleted projects shouldn't be joinable |
| P2-E8 | Fabric.js | What if canvas state JSON is corrupt? | Wrap loadFromJSON in try/catch. On failure, start with fresh canvas (photo background only) and log error. Don't lose the background image. | Resilience over perfection |
| P2-E9 | WebSocket | What if Redis is down and WebSocket can't pub/sub? | WebSocket gateway catches connection errors silently. Frontend falls back to polling. Non-critical — app works without real-time. | WebSocket is enhancement, not requirement |
| P2-E10 | Notifications | What if notification count is very high (1000+)? | Paginate notifications list (20 per page). Badge shows "99+" for counts over 99. | UI performance |

## 7. Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Fabric.js bundle too large for mobile | Medium | Medium | Dynamic import, only load on editor page. Test bundle size. |
| Sharp in AI worker crashes on large images | Low | High | Limit input to 4096px max dimension. Process with streams. |
| WebSocket connection unstable on mobile | Medium | Low | Auto-reconnect with backoff. Polling fallback already exists. |
| PDFKit memory usage for large projects | Low | Medium | Stream PDF generation. Limit to 50 pages. |
| Mock AI output looks unconvincing | Medium | Medium | Apply visible transformations (hue shift, overlay). Add "Mock" watermark. |
| Recharts SSR issues with Next.js | Medium | Low | Dynamic import with `ssr: false`. |

## 8. Open Technical Questions (Phase 2)

1. **Real-time scope:** Should WebSocket broadcast all events (comments, notifications, job status) via a single gateway, or separate gateways per feature? **Recommendation:** Single gateway with event namespacing (e.g., `job:status`, `comment:new`).

2. **Template seed data:** How many seed templates should be created for the library? **Recommendation:** 12 templates (2 per room type for the 6 main types), with placeholder thumbnail images generated via Sharp.

3. **Fabric.js version:** v5 (stable, widely used) vs v6 (newer, TypeScript-native)? **Recommendation:** v6 for TypeScript support, aligning with the project's TS-everywhere approach.

4. **PDF styling:** Minimal (data-focused) vs branded (with colors, logos, headers)? **Recommendation:** Branded with InteriorScience header, project name, and consistent typography. Better for sharing with contractors.
