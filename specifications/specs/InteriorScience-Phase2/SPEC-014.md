# SPEC-014 — Collaboration UI (Share, Comments, Notifications)

**Parent Feature:** InteriorScience Phase 2
**Spec Number:** 014 of 016 (Phase 2: 5 of 7)
**Prerequisites:** SPEC-010

## Status: Not Started

### 1. Objective

Build the collaboration layer: a share dialog for generating/managing project share links, a comments panel with threading for project and room discussions, and a notification bell with dropdown for real-time alerts.

- **Before:** No sharing, commenting, or notification UI. Backend endpoints exist but have no frontend consumers.
- **After:** Users can share projects via link with role/expiry controls. Comments with threading appear on project and room detail pages. A notification bell in the header shows unread count and lists recent notifications.
- **Success criteria:** Share dialog creates/revokes links. Comments can be created, replied to, edited, and deleted with threading. Notification bell shows unread count (99+ cap), dropdown lists notifications, marking as read works. WebSocket delivers real-time updates with polling fallback.

### 2. Architecture

```
Share Dialog:
  Project Detail Header → "Share" IconButton
    └── share-dialog.tsx (MUI Dialog)
        ├── Create link: role selector (VIEWER/EDITOR), optional expiry date
        │   └── POST /api/projects/:id/share → returns shareable URL
        ├── Copy link to clipboard
        ├── Active links table: link URL (truncated), role, expiry, created date
        │   └── GET /api/projects/:id/share → list of active links
        └── Revoke link: DELETE /api/projects/:id/share/:linkId

Comments Panel:
  Project Detail Page + Room Detail Page
    └── comments-panel.tsx (collapsible section)
        ├── Fetch comments: GET /api/comments?projectId=X (or ?roomId=X)
        ├── Create comment: POST /api/comments { content, projectId, parentId? }
        ├── Edit comment: PATCH /api/comments/:id { content }
        ├── Delete comment: DELETE /api/comments/:id
        └── Threading: replies nested under parent (parentId field)

Notifications:
  (main)/layout.tsx header
    └── notification-bell.tsx
        ├── Bell icon with MUI Badge (unread count)
        │   └── GET /api/notifications/unread-count (poll every 30s or WebSocket)
        └── notification-dropdown.tsx (click to open)
            ├── List: GET /api/notifications (paginated, newest first)
            ├── Each item: icon, message, timestamp, read/unread indicator
            ├── Click item → PATCH /api/notifications/:id/read → navigate to target
            └── "Mark all read" button

WebSocket (optional enhancement):
  Socket.IO client in layout
    ├── Connect on auth
    ├── Listen: 'notification' → increment badge, prepend to list
    ├── Listen: 'comment' → refresh comments panel if visible
    ├── Auto-reconnect with exponential backoff (P2-DC-5)
    └── Fallback: if WebSocket fails, use polling (30s interval)
```

### 3. Design Constraints

- P2-DC-2: MUI component patterns — Dialog, Badge, IconButton, List, Menu; tree-shaking imports; mobile-first; 48x48dp touch targets
- P2-DC-5: WebSocket must auto-reconnect with exponential backoff. If WebSocket connection fails after 3 attempts, fall back to HTTP polling (30s interval). Client must work without WebSocket.
- P2-E4: Non-members attempting to comment on a project receive 403. Frontend must handle 403 gracefully (show "You don't have permission to comment" message).
- P2-E10: Notification badge caps at "99+" for counts above 99. Notification list is paginated (20 per page) with "Load more" button.

### 4. Detailed Design

#### 4a. Database / Schema Changes
- None — ShareLink, Comment, Notification models all exist from Phase 1

#### 4b. Backend / API Changes
- None — all endpoints already implemented:
  - POST /api/projects/:id/share — create share link
  - GET /api/projects/:id/share — list share links
  - DELETE /api/projects/:id/share/:linkId — revoke share link
  - GET /api/comments?projectId=X — list comments (supports ?roomId=X)
  - POST /api/comments — create comment (supports parentId for threading)
  - PATCH /api/comments/:id — edit comment
  - DELETE /api/comments/:id — delete comment
  - GET /api/notifications — list notifications (paginated)
  - GET /api/notifications/unread-count — unread count
  - PATCH /api/notifications/:id/read — mark single as read
  - PATCH /api/notifications/read-all — mark all as read

#### 4c. Frontend / UI Changes

**File: `apps/web/components/sharing/share-dialog.tsx`** (CREATE)
- Props: projectId: string, open: boolean, onClose: () => void
- MUI Dialog with two sections:
  1. Create Share Link form:
     - Role: MUI Select (VIEWER, EDITOR)
     - Expiry: Optional DatePicker or "No expiry" toggle
     - "Generate Link" button → POST /api/projects/:id/share
     - On success: display generated URL with "Copy" IconButton (navigator.clipboard.writeText)
  2. Active Links list:
     - Fetch GET /api/projects/:id/share on dialog open
     - MUI Table or List: link URL (truncated with tooltip), role chip, expiry date ("Never" if null), created date
     - Each row: "Revoke" button (red) → confirmation → DELETE /api/projects/:id/share/:linkId → refresh list
- Loading state while fetching
- Error handling: show Snackbar on failure

**File: `apps/web/components/comments/comments-panel.tsx`** (CREATE)
- Props: projectId?: string, roomId?: string (one required)
- Collapsible section (MUI Accordion or custom toggle)
- Fetch comments: GET /api/comments?projectId=X (or ?roomId=X)
- Display as threaded list:
  - Top-level comments rendered in order (newest first)
  - Each comment: avatar placeholder, author name, timestamp (relative), content
  - "Reply" button → expands inline reply form (TextField + Submit)
  - Replies nested with left indent (max 2 levels, then flatten)
  - Own comments: "Edit" (inline TextField toggle) and "Delete" (confirmation) actions
- New comment form at top: MUI TextField (multiline, 2 rows) + "Post" button
  - POST /api/comments { content, projectId/roomId, parentId? }
- Loading state: show MUI Skeleton lines (3-4 rows) while comments are being fetched
- Empty state: "No comments yet. Start the conversation!"
- Error handling: 403 → "You don't have permission to comment on this project." Other errors → MUI Snackbar with "Failed to load comments. Please try again." and a retry button.
- Submitting state: disable Post/Reply button and show CircularProgress while comment is being created/edited
- Auto-refresh: if WebSocket connected, listen for 'comment' event and refresh

**File: `apps/web/components/notifications/notification-bell.tsx`** (CREATE)
- Renders MUI IconButton with NotificationsIcon
- MUI Badge with unread count from GET /api/notifications/unread-count
- Badge: show number if 1-99, show "99+" if > 99 (P2-E10)
- Poll unread count every 30 seconds (setInterval with cleanup)
- If WebSocket available: listen for 'notification' event → increment count
- Click → toggles notification dropdown (Popover or Menu)

**File: `apps/web/components/notifications/notification-dropdown.tsx`** (CREATE)
- Props: open: boolean, anchorEl: HTMLElement, onClose: () => void
- MUI Popover or Paper dropdown
- Fetch GET /api/notifications?page=1&limit=20 on open
- List items: notification icon (by type), message text, relative timestamp
- Unread items: bold text + blue dot indicator
- Click item: PATCH /api/notifications/:id/read → navigate to related entity (project/room)
- "Mark all as read" link at top → PATCH /api/notifications/read-all → refresh
- "Load more" button at bottom if more pages exist (P2-E10)
- Empty state: "No notifications"

**File: `apps/web/lib/socket-client.ts`** (CREATE)
- Socket.IO client singleton
- Connect with auth token from localStorage
- Auto-reconnect with exponential backoff: 1s, 2s, 4s, max 3 attempts (P2-DC-5)
- After 3 failed reconnect attempts: set socketFailed flag, components fall back to polling
- Events: 'notification', 'comment'
- Export: getSocket(), isSocketConnected(), onEvent(), offEvent()

**File: `apps/web/app/(main)/layout.tsx`** (MODIFY)
- Import and render NotificationBell in the header bar (next to profile/user menu)
- Initialize socket client on mount (inside AuthProvider, after auth confirmed)

**File: `apps/web/app/(main)/projects/[id]/page.tsx`** (MODIFY)
- Add "Share" IconButton to page header/title area → opens ShareDialog
- Add CommentsPanel component at bottom of page (projectId prop)

**File: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx`** (MODIFY)
- Add CommentsPanel component at bottom of page (roomId prop)

#### 4d. Shared / Cross-cutting Changes
- No new npm dependencies (socket.io-client may already be installed; if not, add it)

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| CREATE | apps/web/components/sharing/share-dialog.tsx | Share link dialog with create/list/revoke | Med |
| CREATE | apps/web/components/comments/comments-panel.tsx | Threaded comments with CRUD | High |
| CREATE | apps/web/components/notifications/notification-bell.tsx | Bell icon with unread badge | Med |
| CREATE | apps/web/components/notifications/notification-dropdown.tsx | Notification list dropdown | Med |
| CREATE | apps/web/lib/socket-client.ts | Socket.IO client with reconnect/fallback | High |
| MODIFY | apps/web/app/(main)/layout.tsx | Add NotificationBell to header, init socket | Med |
| MODIFY | apps/web/app/(main)/projects/[id]/page.tsx | Add Share button + CommentsPanel | Low |
| MODIFY | apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx | Add CommentsPanel | Low |

### 6. Dependency & Reference Check

#### Frontend Wiring
- socket.io-client: check if already in package.json; if not, add it
- share-dialog.tsx uses apiClient for POST/GET/DELETE on /api/projects/:id/share
- comments-panel.tsx uses apiClient for GET/POST/PATCH/DELETE on /api/comments
- notification-bell.tsx uses apiClient for GET /api/notifications/unread-count
- notification-dropdown.tsx uses apiClient for GET /api/notifications, PATCH mark-read
- socket-client.ts uses socket.io-client, reads auth token from localStorage
- All UI components use MUI (already installed)

#### Backend Wiring
- All sharing endpoints exist in apps/api/src/sharing/
- All comment endpoints exist in apps/api/src/comments/
- All notification endpoints exist in apps/api/src/notifications/
- WebSocket gateway: check if apps/api/src/events/ or similar gateway exists; if not, backend WebSocket is out of scope (polling-only for now)

### 7. Implementation Plan

**Step 1:** Create socket client library
- File: apps/web/lib/socket-client.ts
- Action: create
- Details: Socket.IO client singleton. Auto-reconnect with exponential backoff (1s, 2s, 4s, max 3 attempts). Fallback flag for polling mode. Event subscribe/unsubscribe helpers.

**Step 2:** Create share dialog component
- File: apps/web/components/sharing/share-dialog.tsx
- Action: create
- Details: MUI Dialog with create link form (role + expiry), active links table, revoke button, copy to clipboard.

**Step 3:** Create comments panel component
- File: apps/web/components/comments/comments-panel.tsx
- Action: create
- Details: Threaded comment list with create/reply/edit/delete. Collapsible section. 403 error handling.

**Step 4:** Create notification bell component
- File: apps/web/components/notifications/notification-bell.tsx
- Action: create
- Details: Bell icon with Badge. Poll unread count every 30s. WebSocket listener for real-time increment.

**Step 5:** Create notification dropdown component
- File: apps/web/components/notifications/notification-dropdown.tsx
- Action: create
- Details: Popover with paginated notification list. Click to mark read + navigate. Mark all read. Load more.

**Step 6:** Wire notification bell into main layout
- File: apps/web/app/(main)/layout.tsx
- Action: modify
- Details: Add NotificationBell to header. Initialize socket client after auth confirmed.

**Step 7:** Wire share dialog and comments into project page
- File: apps/web/app/(main)/projects/[id]/page.tsx
- Action: modify
- Details: Add Share IconButton in header that opens ShareDialog. Add CommentsPanel at bottom.

**Step 8:** Wire comments into room page
- File: apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx
- Action: modify
- Details: Add CommentsPanel at bottom with roomId prop.

### 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| WebSocket connection fails in all environments | Med | P2-DC-5 enforced: 3-attempt reconnect with backoff, then automatic fallback to 30s polling. App fully functional without WebSocket. |
| Comment threading UI becomes deeply nested and unreadable | Low | Cap nesting at 2 levels. Deeper replies flatten to level 2 with "@parent-author" mention prefix. |
| Share link URL generation depends on frontend hostname | Med | Use window.location.origin + /shared/ + linkToken for shareable URL. Works across environments. |
| 403 on comments confuses users | Low | P2-E4: Show clear message "You don't have permission to comment" instead of generic error. |
| Notification polling creates excessive API calls | Low | 30s interval is conservative. Only poll when tab is focused (document.visibilityState check). Stop polling when WebSocket is connected. |
| Badge count stale between poll intervals | Low | Acceptable UX trade-off. WebSocket provides instant updates when available. |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests
- ShareDialog renders role selector and generate button
- ShareDialog displays active links after fetch
- ShareDialog copy button writes URL to clipboard
- CommentsPanel renders threaded comments (parent + replies indented)
- CommentsPanel new comment form validates non-empty content
- CommentsPanel shows 403 error message when API returns 403
- NotificationBell renders badge with count
- NotificationBell shows "99+" when count > 99
- NotificationDropdown renders notification list items
- NotificationDropdown marks item as read on click
- SocketClient reconnects with exponential backoff
- SocketClient sets fallback flag after 3 failed attempts

#### 9b. Integration Tests
- ShareDialog creates a share link via POST and displays it
- ShareDialog revokes a link via DELETE and removes from list
- CommentsPanel fetches comments from API and renders them
- CommentsPanel creates a comment via POST and appends to list
- CommentsPanel creates a reply with parentId and nests it correctly
- CommentsPanel edits a comment via PATCH and updates display
- CommentsPanel deletes a comment via DELETE and removes from list
- NotificationBell fetches unread count on mount
- NotificationDropdown fetches notifications on open
- NotificationDropdown marks all as read via PATCH and clears badge

#### 9c. E2E UI Automation Tests
- Project detail → click Share → dialog opens → generate link → URL appears → copy works
- Project detail → click Share → active links visible → revoke one → removed from list
- Project detail → scroll to comments → post a comment → appears in list
- Comment → click Reply → type reply → submit → nested under parent
- Edit own comment → save → updated text visible
- Delete own comment → confirm → removed
- Header → notification bell shows badge count
- Click bell → dropdown opens → notifications listed
- Click a notification → marked as read → navigates to target
- "Mark all read" → badge clears to 0

### 10. Verification Criteria
- [ ] Share dialog opens from project detail page header
- [ ] Can generate a share link with VIEWER or EDITOR role
- [ ] Generated link URL is copyable to clipboard
- [ ] Active share links are listed in the dialog
- [ ] Can revoke a share link — removed from list
- [ ] Comments panel renders on project detail page
- [ ] Comments panel renders on room detail page
- [ ] Can post a new comment — appears in list
- [ ] Can reply to a comment — nested display
- [ ] Can edit own comment — updated inline
- [ ] Can delete own comment — removed after confirmation
- [ ] 403 error shows permission message (not generic error)
- [ ] Notification bell visible in header with unread count badge
- [ ] Badge shows "99+" when count exceeds 99
- [ ] Clicking bell opens notification dropdown
- [ ] Notifications listed with message, timestamp, read/unread state
- [ ] Clicking notification marks it as read and navigates
- [ ] "Mark all as read" clears all unread indicators
- [ ] WebSocket reconnects on disconnect (up to 3 attempts)
- [ ] Polling fallback activates when WebSocket fails
