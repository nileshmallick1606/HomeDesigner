# SPEC-009 — Collaboration, Sharing & Export

**Parent Feature:** InteriorScience MVP
**Spec Number:** 009 of 9
**Prerequisites:** SPEC-003

## Status: Not Started

### 1. Objective

Implement project sharing (share via link with role-based access), real-time collaboration features (comments on rooms/designs/visualizations, WebSocket status updates), and export functionality (download before/after images as JPEG/PNG, export project summary as PDF).

- **Before:** Projects are private to the owner and explicitly added members. No comments, no sharing links, no export.
- **After:** Users can share projects via link (with role: viewer/editor), collaborators can comment on rooms/designs, real-time status updates via WebSocket, and users can export visualizations and project summaries.
- **Success criteria:** Share link grants correct access based on role. Comments work on rooms and designs. Export generates downloadable images and PDF. Real-time updates notify collaborators.

### 2. Architecture

```
Sharing Flow:
  Owner taps "Share" on project
    → Generate share link with role (viewer/editor) and optional expiry
    → POST /api/projects/:id/share → returns { token, url }
    → Owner copies link or shares directly

  Recipient opens share link
    → GET /api/share/:token → validates token, checks expiry
    → If authenticated: adds as ProjectMember with role → redirect to project
    → If not authenticated: store share token in sessionStorage as `pendingShareToken`, redirect to register/login with `?returnTo=/share/:token` query param. After successful auth, frontend checks for pendingShareToken and calls GET /api/share/:token to complete the join flow, then redirects to the project.

Comments Flow:
  User on room/design detail → opens comments panel
    → GET /api/comments?projectId=X&roomId=Y → list comments
    → POST /api/comments { content, projectId, roomId?, designId? } → create
    → WebSocket broadcasts new comment to all project members online

Real-Time Updates (WebSocket):
  On project join → subscribe to project:${projectId} channel
  Events: new_comment, member_joined, ai_job_update, design_saved
  Implementation: Socket.IO with Redis adapter for multi-instance support

Export Flow:
  Export visualization: GET /api/designs/:id/export/image?format=jpeg|png
    → Server composites original + visualization → returns image file

  Export project summary: GET /api/projects/:id/export/pdf
    → Server generates PDF with: project name, rooms, before/after pairs,
      budget summary, comments → returns PDF file
```

### 3. Design Constraints

- DC-14: All endpoints validate input via class-validator DTOs.
- PRD F11: Share via link. Roles: Owner, Editor, Viewer. Real-time status via WebSocket. Comments on rooms/visualizations.
- PRD F12: Save visualizations. Export before/after as JPEG/PNG. Export project summary as PDF.
- PRD §7: Downloads must work on Android Chrome.
- TRD E8: MVP simple locking for concurrent edit prevention. Real-time presence indicators.
- TRD §5: WebSocket via Nginx with upgrade support (configured in SPEC-001).

### 4. Detailed Design

#### 4a. Database / Schema Changes
- No new schema — Comment, ShareLink, Notification models from SPEC-002

#### 4b. Backend / API Changes

**File: `apps/api/src/sharing/sharing.module.ts`**
- Imports: PrismaModule, EmailModule
- Providers: SharingService
- Controllers: SharingController

**File: `apps/api/src/sharing/sharing.controller.ts`**
- POST /api/projects/:id/share — Create share link { role, expiresIn? }
- GET /api/share/:token — Validate and join via share link
- DELETE /api/projects/:id/share/:linkId — Revoke share link
- GET /api/projects/:id/share — List active share links

**File: `apps/api/src/sharing/sharing.service.ts`**
- createShareLink(): Generate unique token, store with role and expiry
- joinViaShareLink(): Validate token, add user as ProjectMember with link's role
- revokeShareLink(): Delete share link
- listShareLinks(): Active links for a project
- Sends email notification when share link is used (via EmailService)

**File: `apps/api/src/comments/comments.module.ts`**
- Imports: PrismaModule
- Providers: CommentsService
- Controllers: CommentsController

**File: `apps/api/src/comments/comments.controller.ts`**
- GET /api/comments?projectId=X&roomId=Y&designId=Z — List comments (filterable, paginated)
- POST /api/comments — Create comment { content, projectId, roomId?, designId?, parentId? }
- PATCH /api/comments/:id — Edit comment (author only)
- DELETE /api/comments/:id — Delete comment (author or project owner)

**File: `apps/api/src/comments/comments.service.ts`**
- findAll(): Paginated comments with filters, includes author info
- create(): Create comment, notify relevant users, broadcast via WebSocket
- update(): Edit content (author only)
- delete(): Soft delete (author or owner)

**File: `apps/api/src/notifications/notifications.module.ts`**
- Imports: PrismaModule
- Providers: NotificationsService
- Controllers: NotificationsController

**File: `apps/api/src/notifications/notifications.controller.ts`**
- GET /api/notifications — List user's notifications (paginated)
- PATCH /api/notifications/:id/read — Mark as read
- PATCH /api/notifications/read-all — Mark all as read
- GET /api/notifications/unread-count — Count of unread

**File: `apps/api/src/notifications/notifications.service.ts`**
- create(): Create notification + push via FCM if available
- findAllForUser(): Paginated notifications
- markRead(), markAllRead(): Update read status
- getUnreadCount(): Count unread

**File: `apps/api/src/realtime/realtime.gateway.ts`**
- **NOTE:** This replaces and supersedes the `ai.gateway.ts` created in SPEC-005. SPEC-005's AI job WebSocket events (job:status) MUST be migrated into this unified gateway. There should be ONE WebSocket gateway for the entire application, not separate ones per feature. The ai.gateway.ts from SPEC-005 should be refactored into this gateway, or SPEC-005 should be implemented to use this gateway from the start if built after SPEC-009.
- Socket.IO gateway with Redis adapter
- Authentication via JWT on connection
- Room-based: client joins project:${projectId} rooms and job:${jobId} channels
- Events: comment:new, member:joined, job:status (from SPEC-005), design:saved, notification:new
- Presence tracking: who's online in a project

**File: `apps/api/src/export/export.module.ts`**
- Imports: PrismaModule, R2Module
- Providers: ExportService
- Controllers: ExportController

**File: `apps/api/src/export/export.controller.ts`**
- GET /api/designs/:id/export/image?format=jpeg|png — Export visualization image
- GET /api/projects/:id/export/pdf — Export project summary PDF
- GET /api/rooms/:id/export/comparison?designId=X — Export before/after comparison image

**File: `apps/api/src/export/export.service.ts`**
- exportVisualizationImage(): Download from R2, convert to requested format via Sharp
- exportComparisonImage(): Composite original + visualization side by side via Sharp
- exportProjectPdf(): Generate PDF with PDFKit or puppeteer:
  - Project name, description, budget summary
  - For each room: room photo, visualizations (before/after), budget
  - Comments summary
  - Generated date, page numbers

#### 4c. Frontend / UI Changes

**File: `apps/web/components/sharing/share-dialog.tsx`**
- Share dialog/bottom sheet
- Role selector (Viewer / Editor)
- Expiry option (none, 7 days, 30 days)
- Generated link with copy button
- Existing share links list with revoke option
- Direct share via native Web Share API (if available)

**File: `apps/web/components/comments/comments-panel.tsx`**
- Slide-out comments panel (bottom sheet on mobile)
- Comment list with author avatar, name, timestamp
- Reply support (threaded, 1 level deep)
- New comment input with send button
- Real-time updates via WebSocket

**File: `apps/web/components/comments/comment-item.tsx`**
- Single comment: avatar, author, timestamp, content
- Edit/delete menu (author only)
- Reply button
- Replies shown nested below

**File: `apps/web/components/notifications/notification-bell.tsx`**
- Bell icon in app header with unread count badge
- Dropdown/panel showing recent notifications
- Tap to navigate to related content
- "Mark all as read" button

**File: `apps/web/components/notifications/notification-list.tsx`**
- Full notification list page
- Group by date
- Read/unread styling
- Notification types: share invite, comment, AI complete, project update

**File: `apps/web/components/export/export-menu.tsx`**
- Export options menu (dropdown or bottom sheet)
- "Download Image (JPEG)" / "Download Image (PNG)"
- "Download Before/After Comparison"
- "Export Project Summary (PDF)"
- Download progress indicator

**File: `apps/web/lib/realtime-client.ts`**
- Socket.IO client wrapper
- Auto-connect on auth, reconnect on disconnect
- Join/leave project rooms
- Event handlers for comments, notifications, presence
- Fallback to polling if WebSocket fails

**Update: `apps/web/app/(main)/projects/[id]/page.tsx`**
- Add "Share" button in project header
- Add comments section
- Add export menu
- Online members indicator (presence)

**Update: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx`**
- Add comments section for room
- Add export options for room photos/designs

**Update: `apps/web/app/(main)/layout.tsx`**
- Add notification bell to header

#### 4d. Shared / Cross-cutting Changes

**File: `packages/shared/src/types/sharing.ts`**
- ShareLinkDto, CommentDto, NotificationDto interfaces
- WebSocketEvents enum

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| CREATE | apps/api/src/sharing/sharing.module.ts | Sharing module | Low |
| CREATE | apps/api/src/sharing/sharing.controller.ts | Share endpoints | Med |
| CREATE | apps/api/src/sharing/sharing.service.ts | Share logic | Med |
| CREATE | apps/api/src/comments/comments.module.ts | Comments module | Low |
| CREATE | apps/api/src/comments/comments.controller.ts | Comment endpoints | Low |
| CREATE | apps/api/src/comments/comments.service.ts | Comment logic | Med |
| CREATE | apps/api/src/notifications/notifications.module.ts | Notifications module | Low |
| CREATE | apps/api/src/notifications/notifications.controller.ts | Notification endpoints | Low |
| CREATE | apps/api/src/notifications/notifications.service.ts | Notification logic | Med |
| CREATE | apps/api/src/realtime/realtime.gateway.ts | WebSocket gateway | High |
| CREATE | apps/api/src/export/export.module.ts | Export module | Low |
| CREATE | apps/api/src/export/export.controller.ts | Export endpoints | Med |
| CREATE | apps/api/src/export/export.service.ts | PDF/image export | High |
| CREATE | apps/web/components/sharing/share-dialog.tsx | Share UI | Med |
| CREATE | apps/web/components/comments/comments-panel.tsx | Comments panel | Med |
| CREATE | apps/web/components/comments/comment-item.tsx | Comment component | Low |
| CREATE | apps/web/components/notifications/notification-bell.tsx | Notification bell | Med |
| CREATE | apps/web/components/notifications/notification-list.tsx | Notification list | Low |
| CREATE | apps/web/components/export/export-menu.tsx | Export options | Med |
| CREATE | apps/web/lib/realtime-client.ts | WebSocket client | Med |
| CREATE | packages/shared/src/types/sharing.ts | Shared types | Low |
| MODIFY | apps/web/app/(main)/projects/[id]/page.tsx | Add share/comments/export | Med |
| MODIFY | apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx | Add comments/export | Med |
| MODIFY | apps/web/app/(main)/layout.tsx | Add notification bell | Low |
| MODIFY | apps/api/src/app.module.ts | Import all new modules | Low |

### 6. Dependency & Reference Check

#### Backend Wiring
- npm packages: @nestjs/websockets, @nestjs/platform-socket.io, socket.io, @socket.io/redis-adapter, pdfkit (or puppeteer for PDF), uuid
- SharingModule, CommentsModule, NotificationsModule, RealtimeGateway, ExportModule registered in AppModule
- Redis adapter for Socket.IO (multi-instance ready)

#### Frontend Wiring
- npm packages: socket.io-client (may already be from SPEC-005)
- Share dialog, comments, notifications, export components imported in project/room pages
- WebSocket client initialized in app layout

### 7. Implementation Plan

**Step 1:** Create sharing backend module
- Files: apps/api/src/sharing/*
- Details: Share link generation, validation, join flow, revocation. Email notification.

**Step 2:** Create comments backend module
- Files: apps/api/src/comments/*
- Details: Comment CRUD with threading. WebSocket broadcast on new comment.

**Step 3:** Create notifications backend module
- Files: apps/api/src/notifications/*
- Details: Notification CRUD, unread count. FCM push (if configured).

**Step 4:** Create WebSocket gateway
- Files: apps/api/src/realtime/realtime.gateway.ts
- Details: Socket.IO with Redis adapter. JWT auth. Project rooms. Presence tracking.

**Step 5:** Create export backend module
- Files: apps/api/src/export/*
- Details: Image export via Sharp. PDF generation via PDFKit. Before/after comparison composite.

**Step 6:** Register all modules
- Files: apps/api/src/app.module.ts
- Details: Import SharingModule, CommentsModule, NotificationsModule, ExportModule. Register RealtimeGateway.

**Step 7:** Create frontend WebSocket client
- Files: apps/web/lib/realtime-client.ts
- Details: Socket.IO client. Auto-connect, reconnect, fallback polling.

**Step 8:** Create frontend sharing, comments, notification, export components
- Files: apps/web/components/sharing/*, comments/*, notifications/*, export/*
- Details: Share dialog, comments panel, notification bell/list, export menu.

**Step 9:** Integrate into project and room pages
- Files: Update project detail, room detail, main layout
- Details: Add share button, comments sections, export menus, notification bell.

**Step 10:** Create shared types
- Files: packages/shared/src/types/sharing.ts

### 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| WebSocket scaling with Redis adapter | Med | Redis adapter handles multi-instance. Test with 100+ concurrent connections. |
| PDF generation memory usage (large projects) | Med | Limit PDF to 50 pages. Stream generation. Use PDFKit (lighter) over Puppeteer. |
| Share link security (token guessing) | Med | Use crypto.randomBytes(32) for tokens. Rate limit share validation endpoint. |
| Real-time updates overwhelming mobile | Low | Debounce WebSocket events. Batch notifications. |
| Android Chrome download behavior for exports | Med | Use standard download API. Test all formats on Android Chrome. |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests
- **SharingService.createShareLink:** Generates unique token, stores with correct role/expiry
- **SharingService.joinViaShareLink:** Adds member with correct role, rejects expired tokens
- **CommentsService.create:** Creates comment, returns with author
- **CommentsService.create:** Rejects comment from non-project-member
- **NotificationsService.getUnreadCount:** Returns correct count
- **ExportService.exportComparisonImage:** Composites two images side by side
- **ExportService.exportProjectPdf:** Generates valid PDF with project data

#### 9b. Integration Tests
- **Share flow:** Create share link → open link (new user) → user added as member with correct role
- **Share expiry:** Create link with 1-second expiry → wait → link rejected
- **Comment flow:** Create comment → list comments → edit → delete
- **WebSocket:** Connect → join project → another user comments → event received
- **Export image:** Generate → download → valid JPEG/PNG with correct dimensions
- **Export PDF:** Generate → download → valid PDF with project data

#### 9c. E2E UI Automation Tests
- **Share flow:** Project detail → "Share" → set role → copy link → open in new session → project accessible
- **Comments:** Room detail → open comments → type comment → submit → appears in list
- **Notifications:** Receive notification → bell shows badge → tap → navigate to content
- **Export image:** Design detail → export menu → "Download JPEG" → file downloads
- **Export PDF:** Project detail → export → "Project Summary PDF" → PDF downloads
- **Real-time:** Two users viewing same project → User A comments → User B sees comment appear

### 10. Verification Criteria
- [ ] Share links generate with correct role and expiry
- [ ] Share link grants access to recipient
- [ ] Expired/revoked share links rejected
- [ ] Comments CRUD works with threading
- [ ] WebSocket delivers real-time updates
- [ ] Notifications created for comments, shares, AI completion
- [ ] Notification bell shows unread count
- [ ] Export visualization as JPEG/PNG works
- [ ] Export before/after comparison image works
- [ ] Export project summary PDF works
- [ ] Downloads work on Android Chrome
- [ ] All endpoints validate input (DC-14)
