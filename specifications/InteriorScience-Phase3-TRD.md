# Technical Requirements Document — InteriorScience Phase 3

## 1. Technical Summary

Phase 3 elevates InteriorScience from a functional prototype to a polished product. The primary focus is UI/UX quality: design system formalization, consistent patterns, micro-interactions, accessibility compliance, and visual polish. Secondary focus: completing the Fabric.js editor, adding export functionality, seeding template data, and implementing WebSocket real-time communication.

## 2. Existing Stack (Unchanged)

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js (App Router) | 15.x |
| UI | MUI (Material Design) | 5.x |
| Backend | NestJS | 10.x |
| Database | PostgreSQL + Prisma | 16 / 6.x |
| Cache/Queue | Redis + BullMQ | 7.x / 5.x |
| Storage | Local filesystem (R2 fallback) | — |
| Image Processing | Sharp | 0.34.x |
| WebSocket (server) | @nestjs/websockets + socket.io | Installed |
| Canvas Editor | Fabric.js | 6.x (installed) |

## 3. New Dependencies

| Package | App | Purpose |
|---------|-----|---------|
| @next/font or next/font | web | Proper Inter font loading |
| pdfkit | api | PDF generation for export |
| socket.io-client | web | WebSocket client |
| framer-motion (optional) | web | Page transitions + animations |

## 4. Architecture Changes

### 4a. Design System Layer

```
apps/web/
├── theme.ts                    # Enhanced: spacing scale, color variants, shadows
├── app/layout.tsx              # Enhanced: font loading via next/font
├── components/
│   ├── ui/
│   │   ├── empty-state.tsx     # EXISTS — enhance with variants
│   │   ├── skeleton-card.tsx   # NEW — loading placeholder for cards
│   │   ├── error-state.tsx     # NEW — error with retry button
│   │   ├── snackbar-provider.tsx # NEW — global success/error notifications
│   │   └── app-header.tsx      # NEW — consistent header with breadcrumbs
│   └── ...
```

### 4b. WebSocket Gateway

```
apps/api/src/common/gateways/
└── events.gateway.ts           # NEW — Socket.IO gateway

Events:
  job:status    → { jobId, status, result? }
  comment:new   → { comment }
  notification  → { notification }

Authentication: JWT token in handshake query param
Room-based: clients join project:${projectId} rooms
```

### 4c. Export Module

```
apps/api/src/export/
├── export.module.ts            # NEW
├── export.controller.ts        # NEW — GET endpoints for image/PDF download
└── export.service.ts           # NEW — Sharp compositing + PDFKit generation
```

### 4d. Fabric.js Editor Components

```
apps/web/components/editor/
├── canvas-editor.tsx           # NEW — Fabric.js canvas wrapper
├── toolbar.tsx                 # NEW — undo/redo/save/export buttons
└── tool-panel.tsx              # NEW — draw/text/shapes/color/eraser tools
```

## 5. Design Constraints (Phase 3)

1. **P3-DC-1:** All UI changes MUST maintain or improve Lighthouse accessibility score. WCAG AA compliance required for all text (minimum 4.5:1 contrast ratio, minimum 12px font size for interactive elements).

2. **P3-DC-2:** Skeleton loaders MUST match the dimensions of the content they replace to prevent Cumulative Layout Shift (CLS). Use MUI Skeleton component.

3. **P3-DC-3:** All mutation actions (create, update, delete) MUST show a Snackbar notification confirming success or explaining failure. No silent errors.

4. **P3-DC-4:** Fabric.js MUST be loaded via next/dynamic with ssr:false. Editor page should show a skeleton while Fabric.js loads.

5. **P3-DC-5:** Export PDF MUST be generated server-side. Max 50 pages. Branded header on every page. Use authenticated blob download pattern (fetch + Authorization header).

6. **P3-DC-6:** WebSocket MUST auto-reconnect with exponential backoff. Fallback to polling if WebSocket is unavailable. Non-critical — app works without real-time.

7. **P3-DC-7:** Inter font MUST be loaded via next/font/google for optimal performance (automatic font subsetting, zero layout shift).

8. **P3-DC-8:** All existing Phase 1 (DC-1 to DC-14) and Phase 2 (P2-DC-1 to P2-DC-9) constraints remain in effect.

9. **P3-DC-9:** Page transitions should be subtle (150-200ms fade). Do NOT use heavy animations that slow down navigation on mid-range Android devices.

10. **P3-DC-10:** The AppHeader component MUST be consistent across all pages. Show: page title, breadcrumb trail, and action buttons (share, export). Back button on all sub-pages.

## 6. Edge Case Decisions

| # | Category | Question | Decision | Rationale |
|---|----------|----------|----------|-----------|
| P3-E1 | Skeleton | What if data loads instantly (<100ms)? | Show skeleton for minimum 200ms to prevent flash. | A brief skeleton looks intentional; instant content after a flash looks broken. |
| P3-E2 | Snackbar | Multiple success/error messages at once? | Stack up to 3, dismiss oldest after 4 seconds. | Users need feedback but not overwhelm. |
| P3-E3 | Fabric.js | Canvas larger than viewport? | Constrain to viewport width, enable pinch-zoom within canvas. Allow scroll for tall canvases. | Mobile users can't zoom the whole page to see the canvas. |
| P3-E4 | Export PDF | Room has no designs? | Include room with photos only, skip design sections. Note "No designs yet" in room section. | Partial projects should still be exportable. |
| P3-E5 | WebSocket | Token expires while WebSocket connected? | WebSocket catches auth error → disconnect → apiClient refreshes token → reconnect. | Seamless session extension. |
| P3-E6 | Templates | User clicks "Apply Template" but has no projects? | Show prompt to create a project first with CTA. | Don't let user hit a dead end. |
| P3-E7 | Font | Inter font fails to load from CDN? | next/font handles fallback automatically. System font is acceptable fallback. | Progressive enhancement — works without the exact font. |
| P3-E8 | Breadcrumbs | Very long project/room names? | Truncate with ellipsis at 30 characters in breadcrumb. Full name in page title. | Breadcrumbs should fit on one line on mobile. |

## 7. Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Fabric.js v6 breaking changes from React 19 | Medium | High | Test thoroughly. Dynamic import isolates failures. Can pin to specific patch version. |
| framer-motion bundle size | Low | Medium | Use only for page transitions (AnimatePresence). Tree-shakeable. Skip if too large. |
| PDFKit generating huge PDFs for large projects | Low | Medium | 50-page limit. Stream generation. Monitor memory. |
| WebSocket connection drops on mobile networks | Medium | Low | Auto-reconnect + polling fallback. Already have polling working. |
| Skeleton loaders look worse than spinners | Low | Low | Use MUI Skeleton with animation="wave" for polish. Test on real content. |

## 8. Open Technical Questions

1. **Page transitions library:** framer-motion vs CSS-only transitions? **Recommendation:** CSS-only transitions (opacity + transform) via MUI's Fade component. Avoids new dependency. framer-motion only if CSS feels insufficient.

2. **Snackbar library:** MUI Snackbar vs notistack? **Recommendation:** notistack (built on MUI Snackbar, adds stacking/queuing for free). Lightweight addition.

3. **Breadcrumb depth:** Show full path or just parent + current? **Recommendation:** Full path on desktop (Home > Project > Room > Design), collapse to parent + current on mobile.

4. **Template thumbnails:** Generate programmatically or use stock images? **Recommendation:** Generate via Sharp with colored backgrounds + text. No external image dependencies. Can replace with real images later.
