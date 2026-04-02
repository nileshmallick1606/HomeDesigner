# Business Requirements Document — InteriorScience Phase 2

## 1. Executive Summary

- **Product:** InteriorScience (existing MVP — Phase 2 completion)
- **Summary:** Phase 2 completes the frontend UI for all backend-ready features, implements the AI worker pipeline (mock mode for testing), adds route protection, and delivers the export functionality. The backend APIs for budgets, comments, sharing, notifications, templates, and AI are fully implemented — Phase 2 focuses on connecting them to user-facing UI and completing the end-to-end visualization flow.

## 2. Current State

### What's Working (Phase 1 Complete)
- User registration & login (JWT + refresh tokens)
- Project CRUD with member management
- Room CRUD with 8 room types
- Photo upload pipeline (validation, EXIF stripping, WebP compression, thumbnails, local storage)
- Photo gallery with delete functionality
- Dashboard showing recent projects
- Bottom tab navigation (Home, Projects, Capture, Library, Profile)
- All backend API modules registered and functional (13 NestJS modules)
- Complete Prisma schema (18 entities)
- Docker Compose with PostgreSQL + Redis

### What's Missing (Phase 2 Scope)
- AI Worker has no job processors (segmentation/visualization requests queue but never process)
- Visualization UI — users can't request or view AI-generated designs
- Fabric.js design editor — not implemented
- Budget UI — backend ready, no frontend components
- Comments UI — backend ready, no frontend
- Sharing UI — backend ready, no frontend dialog
- Notifications UI — backend ready, no bell/list
- Export — not implemented (backend or frontend)
- Templates library — page is placeholder, doesn't fetch data
- Profile page — placeholder, no user data displayed
- Capture page — placeholder, no camera integration
- Route protection — unauthenticated users can access all pages
- WebSocket real-time — packages installed, no gateway implemented

## 3. Phase 2 Feature Requirements

### P2-F1: Route Protection & Auth Context
**Priority:** P0 — Critical
**Description:** Protect all authenticated routes. Create an AuthProvider context that checks for valid JWT token. Redirect unauthenticated users to /login. Provide useAuth() hook for components to access user state and logout.
**Acceptance Criteria:**
- Visiting /dashboard, /projects, /capture, /library, /profile without auth redirects to /login
- AuthProvider wraps all (main) layout routes
- useAuth() hook provides user data, isAuthenticated, logout()
- Logout clears token and redirects to landing page

### P2-F2: Profile Page
**Priority:** P0 — Critical
**Description:** Functional profile page showing user data with edit capability and logout.
**Acceptance Criteria:**
- Displays user name, email, profile type, platform role
- Edit name with save
- Logout button that clears session
- Delete account with confirmation dialog (calls cascading delete API)

### P2-F3: AI Worker Pipeline (Mock Mode)
**Priority:** P0 — Critical (Core USP)
**Description:** Implement BullMQ job processors in the AI worker that consume segmentation and visualization queues. In mock mode: apply image filters to simulate AI output so the full request→process→display loop works end-to-end.
**Acceptance Criteria:**
- AI worker starts and connects to Redis
- Segmentation processor: downloads photo, generates simple element mask, uploads result, updates DB status to COMPLETED
- Visualization processor: downloads photo, applies color/style filter based on category, uploads result with model version, updates DB
- Jobs transition through QUEUED → PROCESSING → COMPLETED states
- Failed jobs retry up to 3 times with exponential backoff
- Worker logs processing activity

### P2-F4: Visualization Request & Display UI
**Priority:** P0 — Critical (Core USP)
**Description:** Wire the CategorySelector into room detail page. Allow users to request AI visualization on their room photos and view the results with before/after comparison.
**Acceptance Criteria:**
- Room detail page shows "Start Design" section when photos exist
- User selects a design category (Civil, Furnishings, Bathroom, Kitchen, Electrical, Other)
- Clicking "Generate" calls POST /api/ai/visualization
- JobStatus component shows real-time progress
- On completion, result displayed using BeforeAfterSlider
- Saved designs listed as cards in the room detail page
- Each design card links to full-screen before/after view

### P2-F5: Design Detail Page
**Priority:** P1 — High
**Description:** Dedicated page for viewing a design with full before/after comparison, metadata, and actions.
**Acceptance Criteria:**
- Route: /projects/[id]/rooms/[roomId]/designs/[designId]
- Full-width before/after slider
- Design metadata: category, status, created date
- "Regenerate" button to create new visualization
- Delete design option

### P2-F6: Budget UI
**Priority:** P1 — High
**Description:** Frontend components for viewing and editing budgets at project and room level.
**Acceptance Criteria:**
- Project detail page shows budget summary (total estimated vs actual, percentage spent)
- Category breakdown with progress bars
- Room detail page shows room-level budget editor
- Add/edit/delete budget line items per category
- Visual chart showing budget distribution

### P2-F7: Share Dialog
**Priority:** P1 — High
**Description:** UI for project owners to create shareable links and manage access.
**Acceptance Criteria:**
- "Share" button on project detail page
- Dialog with role selector (Viewer/Editor) and optional expiry
- Copy-to-clipboard for generated share URL
- List of active share links with revoke option
- Share recipient flow: open link → register/login if needed → join project

### P2-F8: Comments Panel
**Priority:** P1 — High
**Description:** Threaded comments on projects and rooms.
**Acceptance Criteria:**
- Collapsible comments section on project and room detail pages
- Display existing comments with author, timestamp
- Create new comment with text input
- Reply to existing comments (1-level threading)
- Edit own comments, delete own comments
- Comment count shown in section header

### P2-F9: Notifications UI
**Priority:** P2 — Medium
**Description:** Notification bell in header with unread count and notification list.
**Acceptance Criteria:**
- Bell icon in main layout header with unread count badge
- Clicking bell opens dropdown with recent notifications
- Each notification shows type icon, title, timestamp
- Click notification to navigate to related content
- "Mark all as read" button
- Unread count updates on page load

### P2-F10: Templates Library UI
**Priority:** P2 — Medium
**Description:** Wire the library page to display templates from the API.
**Acceptance Criteria:**
- Library page fetches templates from GET /api/templates
- Room type tabs filter templates
- Template cards with thumbnail, name, category
- Template detail view on click
- "Apply to Room" flow: select project → select room

### P2-F11: Camera Capture Page
**Priority:** P2 — Medium
**Description:** In-app camera capture using Web Camera API.
**Acceptance Criteria:**
- Camera viewfinder using getUserMedia()
- Capture button takes photo
- Preview with retake/use options
- Select target project and room
- Upload captured photo to selected room
- Permission handling (request, denied state with help text)

### P2-F12: Export Functionality
**Priority:** P3 — Low
**Description:** Export designs as images and project summaries as PDF.
**Acceptance Criteria:**
- Backend: Export module with image and PDF generation endpoints
- Download design visualization as JPEG/PNG
- Download before/after comparison as single image
- Download project summary as PDF (project info, rooms, designs, budget)
- Export buttons on design detail and project detail pages
- Downloads work on Android Chrome

### P2-F13: Fabric.js Design Editor
**Priority:** P3 — Low
**Description:** Canvas-based editor for annotating and editing design visualizations.
**Acceptance Criteria:**
- Fabric.js canvas loads room photo as background with visualization overlay
- Drawing tools: freehand, text, shapes (rectangle, circle, arrow)
- Color picker, brush size
- Undo/redo (50-state history)
- Canvas state auto-saves to DB every 30 seconds + on blur
- Resume editing from saved state
- Full-screen editor page

## 4. User Stories

| # | As a | I want to | So that | Priority |
|---|------|-----------|---------|----------|
| US-P2-1 | Homeowner | Be redirected to login when not authenticated | I can't accidentally see an empty app | P0 |
| US-P2-2 | Homeowner | See my profile and log out | I can manage my session | P0 |
| US-P2-3 | Homeowner | Request an AI visualization of my room | I can see what changes would look like | P0 |
| US-P2-4 | Homeowner | Compare before and after side by side | I can evaluate the proposed changes | P0 |
| US-P2-5 | Homeowner | Track my renovation budget per room | I can control costs | P1 |
| US-P2-6 | Homeowner | Share my project with family | We can decide together | P1 |
| US-P2-7 | Homeowner | Comment on rooms and designs | I can discuss changes with collaborators | P1 |
| US-P2-8 | Homeowner | See notifications when someone comments | I stay informed about project activity | P2 |
| US-P2-9 | Homeowner | Browse design templates for inspiration | I get ideas for my renovation | P2 |
| US-P2-10 | Homeowner | Capture room photos from the app | I don't need to switch to camera app | P2 |
| US-P2-11 | Homeowner | Export my project as PDF | I can share with contractors | P3 |
| US-P2-12 | Homeowner | Annotate designs with notes | I can mark specific areas for changes | P3 |

## 5. Dependencies

| Dependency | Status | Impact |
|-----------|--------|--------|
| Backend APIs (budgets, comments, sharing, notifications, templates, AI) | Complete | Frontend can be built immediately |
| BullMQ + Redis | Running | AI worker can connect and process jobs |
| Prisma schema (Design, Visualization, AiJob, etc.) | Complete | Data models ready |
| Sharp image processing | Installed | Available for mock AI visualization |
| Socket.IO packages (API side) | Installed | WebSocket gateway can be created |

## 6. Out of Scope (Phase 2)

- Real AI model integration (SAM, Stable Diffusion) — mock mode only
- Google OAuth login (credentials not configured)
- Email sending (Resend not configured)
- Production deployment
- Performance optimization
- Internationalization
