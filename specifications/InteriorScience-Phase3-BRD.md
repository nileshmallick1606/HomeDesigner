# Business Requirements Document — InteriorScience Phase 3

## 1. Executive Summary

- **Product:** InteriorScience (existing MVP — Phase 3 polish & feature completion)
- **Summary:** Phase 3 focuses on UI/UX quality elevation as the top priority, followed by completing deferred features: Fabric.js editor, export functionality, template seed data, and WebSocket real-time updates. The goal is to transform the functional prototype into a polished, professional-feeling product.

## 2. Current State (Phase 2 Complete)

### Working
- Full project/room/photo management with AI visualization pipeline
- Auth with route protection, profile management
- Budget tracking, sharing, comments, notifications
- Camera capture, design library page (empty)
- 13 NestJS backend modules, 16+ frontend pages

### Quality Gaps (from UX Audit)
- Inter font declared but never loaded (falls back to system font)
- No consistent spacing/design system — ad-hoc MUI spacing everywhere
- Share button not discoverable (icon-only, no label)
- Silent error handling in multiple components
- No skeleton loaders — CircularProgress everywhere
- Bottom tab labels too small (0.7rem — accessibility issue)
- No page transitions or micro-interactions
- No consistent header/AppBar across pages
- No breadcrumb navigation
- Category selector has no animation on selection
- Design card status chips too tiny to read
- Photo gallery always 3 columns (not responsive)

## 3. Phase 3 Feature Requirements

### P3-F1: UI/UX Audit & Design System Enhancement
**Priority:** P0 — Critical (TOP PRIORITY)
**Description:** Establish a formal design system, fix all critical UX issues found in the audit, and elevate the visual quality of every screen.
**Acceptance Criteria:**
- Inter font properly loaded via Google Fonts or next/font
- Consistent spacing scale defined in theme (4/8/16/24/32px)
- Consistent AppBar/header on all pages with breadcrumb navigation
- Share button has label + tooltip, moved to visible position
- Bottom tab labels meet WCAG AA (min 12px), capture icon sized consistently
- Skeleton loaders on dashboard, projects list, room detail while data loads
- Status chips color-coded by status (Draft=grey, Active=green, Completed=blue, Archived=yellow)
- Category selector has smooth selection animation (border + background transition)
- Design card status chips readable (min 11px font)
- Photo gallery responsive: 2 columns on mobile, 3 on tablet, 4 on desktop
- Error states have retry buttons and clear messaging (not silent failures)
- Success feedback (Snackbar) for all mutation actions (create, update, delete)
- Hover states on all clickable cards
- Page transitions (fade or slide)
- Safe-area padding for notched mobile devices
- Landing page enhanced with gradient background and feature highlights

### P3-F2: Fabric.js Design Editor (Complete)
**Priority:** P1 — High
**Description:** Complete the Fabric.js canvas editor that currently exists as a scaffold page. Users should be able to annotate, draw, and add text to their design visualizations.
**Acceptance Criteria:**
- Fabric.js v6 canvas loads with room photo as background + visualization as overlay
- Drawing tools: freehand draw, text labels, shapes (rectangle, circle, arrow)
- Color picker and brush size controls
- Undo/redo with 50-state history
- Canvas state auto-saves to database every 30 seconds + on blur/close
- Resume editing from saved state (loadFromJSON)
- Full-screen editor page with toolbar + tool panel
- Export canvas as PNG image
- Loaded via next/dynamic (ssr: false) to avoid bundle bloat

### P3-F3: Export Functionality
**Priority:** P1 — High
**Description:** Backend export module + frontend buttons for downloading designs and project summaries.
**Acceptance Criteria:**
- Backend: GET /api/export/design/:id/image?format=jpeg|png — download visualization
- Backend: GET /api/export/design/:id/comparison — before/after composite image
- Backend: GET /api/export/project/:id/pdf — project summary PDF
- PDF includes: branded header, project info, room list with photos, design visualizations, budget summary
- Export buttons on design detail page and project detail page
- Downloads work on mobile (Android Chrome)
- PDF max 50 pages (truncate large projects with warning)
- Authenticated blob download (fetch + Authorization header, not window.open)

### P3-F4: Template Seed Data
**Priority:** P1 — High
**Description:** Populate the design template library with initial content so the Library tab shows useful templates.
**Acceptance Criteria:**
- 12 seed templates (2 per room type: Bathroom, Kitchen, Bedroom, Living Room, Dining Room, Balcony)
- Each template has: name, description, category, room type, placeholder thumbnail
- Thumbnails generated via Sharp (colored rectangles with text overlay)
- Seed script in prisma/seed.ts
- Library page displays templates correctly with filtering

### P3-F5: WebSocket Real-Time Updates
**Priority:** P2 — Medium
**Description:** Replace polling with WebSocket for real-time notifications, AI job status, and comment updates.
**Acceptance Criteria:**
- Socket.IO gateway on backend with JWT authentication
- Events: job:status, comment:new, notification:new
- Frontend socket.io-client connects on auth, auto-reconnects
- JobStatus component uses WebSocket instead of polling (fallback to polling if WS unavailable)
- Notification bell updates in real-time (no 30s delay)
- New comments appear instantly for other project members

### P3-F6: AI Visualization Quality Improvement
**Priority:** P2 — Medium
**Description:** Improve mock AI visualization quality to produce more convincing before/after differences. Not real AI models yet, but better Sharp transforms.
**Acceptance Criteria:**
- Each category produces distinctly different, realistic-looking results
- Civil: selective area color replacement (not just full-image tint)
- Bathroom/Kitchen: pattern overlay simulation
- Furnishings: brightness/contrast zones (not uniform)
- Improved watermark: semi-transparent, corner-positioned, less intrusive
- Generation time <5 seconds (currently 2-3s, maintain)

## 4. User Stories

| # | As a | I want to | So that | Priority |
|---|------|-----------|---------|----------|
| US-P3-1 | User | See a polished, professional app | I trust the product with my renovation planning | P0 |
| US-P3-2 | User | See loading skeletons while data loads | The app feels fast and responsive | P0 |
| US-P3-3 | User | Get error messages with retry options | I can recover from failures without refreshing | P0 |
| US-P3-4 | User | Annotate my design visualizations | I can mark areas for contractors | P1 |
| US-P3-5 | User | Download my designs as images | I can share with contractors offline | P1 |
| US-P3-6 | User | Export project summary as PDF | I have a professional document for meetings | P1 |
| US-P3-7 | User | Browse design templates | I get inspiration for my renovation | P1 |
| US-P3-8 | User | See notifications instantly | I stay current on project activity | P2 |
| US-P3-9 | User | See more realistic AI previews | I can better evaluate proposed changes | P2 |

## 5. Dependencies

| Dependency | Status | Impact |
|-----------|--------|--------|
| Fabric.js v6 | Installed (Phase 2) | Editor can be built |
| Socket.IO packages | Installed (Phase 1) | Gateway can be created |
| Sharp | Installed | Template thumbnails + improved AI |
| PDFKit | Not installed | Needed for export |
| next/font | Built into Next.js 15 | Font loading |

## 6. Out of Scope (Phase 3)

- Google OAuth login (Phase 4)
- Email sending via Resend (Phase 4)
- Real AI model integration (SAM, Stable Diffusion)
- Production deployment
- Internationalization
- Payment/subscription integration
