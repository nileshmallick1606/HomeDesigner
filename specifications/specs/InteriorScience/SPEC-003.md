# SPEC-003 — Project & Room Management

**Parent Feature:** InteriorScience MVP
**Spec Number:** 003 of 9
**Prerequisites:** SPEC-002

## Status: Not Started

### 1. Objective

Implement complete CRUD for renovation projects and rooms, including project membership management, room type selection, project dashboard, room detail views, and the core navigation structure (bottom tab bar for mobile-first experience).

- **Before:** Auth system working, database schema in place, no project/room features
- **After:** Users can create/edit/delete projects, add rooms with types, see project dashboard with room cards, navigate via bottom tab bar, project members can be invited with roles
- **Success criteria:** Full project lifecycle works: create project → set budget → add rooms → view project summary. Mobile-first bottom tab navigation works. Project member management with role-based access.

### 2. Architecture

```
Dashboard → "New Project" → Create Project form
  → Project Detail (rooms list, budget summary, members)
    → "Add Room" → Select room type → Room created
      → Room Detail (photos placeholder, designs placeholder)

Navigation (Bottom Tabs):
  [Home] [Projects] [+Capture] [Library] [Profile]

API Endpoints:
  POST   /api/projects              → Create project
  GET    /api/projects              → List user's projects
  GET    /api/projects/:id          → Get project detail
  PATCH  /api/projects/:id          → Update project
  DELETE /api/projects/:id          → Soft delete project
  POST   /api/projects/:id/members  → Add member
  DELETE /api/projects/:id/members/:userId → Remove member
  PATCH  /api/projects/:id/members/:userId → Update member role

  POST   /api/projects/:id/rooms    → Create room
  GET    /api/projects/:id/rooms    → List rooms in project
  GET    /api/rooms/:id             → Get room detail
  PATCH  /api/rooms/:id             → Update room
  DELETE /api/rooms/:id             → Soft delete room
  PATCH  /api/projects/:id/rooms/reorder → Reorder rooms
```

### 3. Design Constraints

- DC-8: MVP MUST implement project-level locking when a user is actively editing. Lock auto-releases after 5 minutes of inactivity.
- DC-9: ALL database queries MUST be scoped by user_id or organization_id.
- DC-13: Time to Interactive <3 seconds. Mobile-first responsive design.
- DC-14: All API endpoints MUST validate input via class-validator DTOs.
- PRD §6: Bottom tab navigation: Home, Projects, Capture [+], Library, Profile.
- PRD §7: Material Design 3 aesthetic, large image previews, touch-friendly (48x48dp targets).
- PRD F2: Project CRUD with name, description, budget, timeline, status.
- PRD F3: Room types: bathroom, kitchen, bedroom, living_room, dining_room, balcony, utility, custom.
- PRD §7: Key screens: Dashboard, Project list, Project detail, Room detail.
- TRD E2: Empty states with clear action prompts. "Create New Project" CTA on empty dashboard.

### 4. Detailed Design

#### 4a. Database / Schema Changes
- No new schema changes — all tables created in SPEC-002
- May need additional indexes based on query patterns discovered during implementation

#### 4b. Backend / API Changes

**File: `apps/api/src/projects/projects.module.ts`**
- Imports: PrismaModule
- Providers: ProjectsService
- Controllers: ProjectsController

**File: `apps/api/src/projects/projects.controller.ts`**
- All endpoints from architecture section above
- Protected by JwtAuthGuard (global)
- Project mutations protected by ProjectRoleGuard (OWNER for delete/member management, EDITOR+ for room CRUD)
- Pagination on list endpoints (page, limit, sortBy, order)
- Search/filter on project list (name, status)

**File: `apps/api/src/projects/projects.service.ts`**
- createProject(): Create project + add creator as OWNER member
- findAllForUser(): Projects where user is a member (respects DC-9)
- findById(): With rooms, members, budget summary
- update(): Validate ownership/editor role
- softDelete(): Only OWNER can delete
- addMember(): Invite user by email, assign role
- removeMember(): Cannot remove last OWNER
- updateMemberRole(): OWNER can change roles
- acquireLock(): DC-8 project locking (5min auto-release). Returns lock holder info if already locked.
- releaseLock(): Explicit lock release
- getLockStatus(): Returns current lock state (locked/unlocked, holder name, time remaining). Frontend polls this endpoint every 30 seconds when viewing a project. After SPEC-009 adds the unified WebSocket gateway, lock status changes should be broadcast in real-time to project members.

**File: `apps/api/src/rooms/rooms.module.ts`**
- Imports: PrismaModule
- Providers: RoomsService
- Controllers: RoomsController

**File: `apps/api/src/rooms/rooms.controller.ts`**
- Room CRUD endpoints
- Reorder endpoint (PATCH with array of {roomId, sortOrder})

**File: `apps/api/src/rooms/rooms.service.ts`**
- createRoom(): Create room in project, auto-assign sortOrder
- findAllInProject(): List rooms with photo count, design count
- findById(): With photos, designs, budget
- update(): Name, type, dimensions, notes, budget
- softDelete(): Remove room (cascade to photos, designs in future specs)
- reorder(): Update sortOrder for multiple rooms atomically

**DTOs:** CreateProjectDto, UpdateProjectDto, CreateRoomDto, UpdateRoomDto, AddMemberDto, UpdateMemberRoleDto, ReorderRoomsDto — all with class-validator decorators.

#### 4c. Frontend / UI Changes

**File: `apps/web/app/(main)/layout.tsx`**
- Main app layout with bottom tab navigation bar
- Tabs: Home (dashboard icon), Projects (folder icon), + (camera icon, centered FAB), Library (grid icon), Profile (person icon)
- Active tab highlighting
- Responsive: bottom tabs on mobile, sidebar on desktop

**File: `apps/web/app/(main)/page.tsx` (Dashboard)**
- Empty state: "Start Your Renovation Journey" with "Create New Project" CTA
- Populated state: Recent projects grid (2 columns on mobile), activity feed
- Quick actions: "New Project", "Continue Editing"

**File: `apps/web/app/(main)/projects/page.tsx` (Project List)**
- Project cards: name, status badge, room count, budget, last modified
- Search bar, filter by status
- FAB: "New Project"
- Empty state: "No projects yet" with CTA

**File: `apps/web/app/(main)/projects/new/page.tsx` (Create Project)**
- Form: name (required), description, overall budget, timeline start/end
- "Create Project" button
- Redirects to project detail on success

**File: `apps/web/app/(main)/projects/[id]/page.tsx` (Project Detail)**
- Project header: name, status, budget progress bar
- Tabs or sections: Rooms, Budget, Members
- Rooms section: room cards with type icon, name, photo count
- "Add Room" button
- Members section: member list with roles, invite button (OWNER only)

**File: `apps/web/app/(main)/projects/[id]/rooms/new/page.tsx` (Add Room)**
- Room type selector: grid of room type icons (bathroom, kitchen, etc.)
- Room name input (auto-filled from type)
- Optional: dimensions, budget
- "Add Room" button

**File: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx` (Room Detail)**
- Room header: name, type badge
- Sections: Photos (empty state — "Capture or upload photos", wired in SPEC-004), Designs (empty — wired in SPEC-007), Budget
- Placeholder sections with "Coming soon" for features in later specs

**File: `apps/web/components/navigation/bottom-tabs.tsx`**
- Bottom tab bar component
- 5 tabs with icons and labels
- Active state indicator
- Touch-friendly: 48x48dp min targets

**File: `apps/web/components/projects/project-card.tsx`**
- Project card component: thumbnail, name, status, room count, budget

**File: `apps/web/components/rooms/room-card.tsx`**
- Room card component: type icon, name, photo count

**File: `apps/web/components/ui/empty-state.tsx`**
- Reusable empty state component: icon, title, description, CTA button

**File: `apps/web/components/ui/skeleton-card.tsx`**
- Skeleton loading placeholder for project cards and room cards
- Shimmer animation for perceived performance
- Used on dashboard, project list, and room list pages while data is fetching
- Shows 4-6 skeleton cards matching the grid layout to prevent layout shift

#### 4d. Shared / Cross-cutting Changes

**File: `packages/shared/src/types/project.ts`**
- ProjectStatus, RoomType enums
- ProjectDto, RoomDto, ProjectMemberDto interfaces
- CreateProjectDto, UpdateProjectDto, CreateRoomDto, UpdateRoomDto

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| CREATE | apps/api/src/projects/projects.module.ts | Projects module | Low |
| CREATE | apps/api/src/projects/projects.controller.ts | Project endpoints | Med |
| CREATE | apps/api/src/projects/projects.service.ts | Project business logic | Med |
| CREATE | apps/api/src/projects/dto/*.ts | Project DTOs | Low |
| CREATE | apps/api/src/rooms/rooms.module.ts | Rooms module | Low |
| CREATE | apps/api/src/rooms/rooms.controller.ts | Room endpoints | Low |
| CREATE | apps/api/src/rooms/rooms.service.ts | Room business logic | Med |
| CREATE | apps/api/src/rooms/dto/*.ts | Room DTOs | Low |
| CREATE | apps/web/app/(main)/layout.tsx | Main layout with bottom tabs | Med |
| CREATE | apps/web/app/(main)/page.tsx | Dashboard | Med |
| CREATE | apps/web/app/(main)/projects/page.tsx | Project list | Low |
| CREATE | apps/web/app/(main)/projects/new/page.tsx | Create project form | Low |
| CREATE | apps/web/app/(main)/projects/[id]/page.tsx | Project detail | Med |
| CREATE | apps/web/app/(main)/projects/[id]/rooms/new/page.tsx | Add room | Low |
| CREATE | apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx | Room detail | Med |
| CREATE | apps/web/components/navigation/bottom-tabs.tsx | Bottom tab bar | Med |
| CREATE | apps/web/components/projects/project-card.tsx | Project card | Low |
| CREATE | apps/web/components/rooms/room-card.tsx | Room card | Low |
| CREATE | apps/web/components/ui/empty-state.tsx | Empty state component | Low |
| CREATE | packages/shared/src/types/project.ts | Shared project types | Low |
| MODIFY | apps/api/src/app.module.ts | Import ProjectsModule, RoomsModule | Low |

### 6. Dependency & Reference Check

#### Frontend Wiring
- npm packages: @mui/icons-material (for tab/room icons)
- Bottom tabs component used in (main) layout
- API client from SPEC-002 used for all project/room API calls
- Auth context from SPEC-002 for user state

#### Backend Wiring
- ProjectsModule and RoomsModule registered in AppModule
- ProjectRoleGuard from SPEC-002 used on project endpoints
- PrismaService from SPEC-002 used for database access

### 7. Implementation Plan

**Step 1:** Create backend projects module with CRUD
- Files: apps/api/src/projects/projects.module.ts, projects.controller.ts, projects.service.ts, dto/*
- Action: create
- Details: Full CRUD with member management, locking (DC-8), pagination, search. All queries scoped by user membership (DC-9).

**Step 2:** Create backend rooms module with CRUD
- Files: apps/api/src/rooms/rooms.module.ts, rooms.controller.ts, rooms.service.ts, dto/*
- Action: create
- Details: Room CRUD within project context. Room type enum. Reorder support. Scoped by project membership.

**Step 3:** Register modules in AppModule
- Files: apps/api/src/app.module.ts
- Action: modify
- Details: Import and register ProjectsModule and RoomsModule.

**Step 4:** Create shared types
- Files: packages/shared/src/types/project.ts
- Action: create
- Details: ProjectStatus, RoomType enums. DTO interfaces matching backend DTOs.

**Step 5:** Create main layout with bottom tab navigation
- Files: apps/web/app/(main)/layout.tsx, apps/web/components/navigation/bottom-tabs.tsx
- Action: create
- Details: Bottom tab bar with 5 tabs. Responsive: bottom on mobile, sidebar on desktop. Active tab indication.

**Step 6:** Create reusable UI components
- Files: apps/web/components/projects/project-card.tsx, apps/web/components/rooms/room-card.tsx, apps/web/components/ui/empty-state.tsx
- Action: create
- Details: Card components with MUI styling. Empty state with icon + CTA.

**Step 7:** Create dashboard page
- Files: apps/web/app/(main)/page.tsx
- Action: create
- Details: Empty state for new users (TRD E2). Populated state with recent projects grid. Quick actions.

**Step 8:** Create project list and creation pages
- Files: apps/web/app/(main)/projects/page.tsx, projects/new/page.tsx
- Action: create
- Details: Project list with search/filter. Create form with validation.

**Step 9:** Create project detail page
- Files: apps/web/app/(main)/projects/[id]/page.tsx
- Action: create
- Details: Project header, rooms section, budget summary, members management.

**Step 10:** Create room pages
- Files: apps/web/app/(main)/projects/[id]/rooms/new/page.tsx, rooms/[roomId]/page.tsx
- Action: create
- Details: Room type selector grid. Room detail with sections (photos, designs placeholder for future specs).

### 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Project locking conflicts with multiple editors | Med | Clear lock status in UI, auto-release after 5min, ability to force-release by OWNER |
| Bottom tab navigation interfering with mobile browser chrome | Med | Test on Android Chrome, ensure proper viewport meta, account for browser bottom bar |
| Deep nested routes causing slow navigation | Low | Use Next.js parallel routes, prefetch links, loading states |
| Project member invitation for non-registered users | Low | Store pending invitations, trigger on registration |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests
- **ProjectsService.createProject:** Creates project + OWNER member, returns project
- **ProjectsService.findAllForUser:** Returns only user's projects (DC-9)
- **ProjectsService.addMember:** Adds member with correct role
- **ProjectsService.removeMember:** Prevents removing last OWNER
- **ProjectsService.acquireLock/releaseLock:** Lock mechanics work (DC-8)
- **RoomsService.createRoom:** Creates room with correct type and sortOrder
- **RoomsService.reorder:** Updates sortOrder for multiple rooms
- **DTOs:** Validation rejects invalid project names (empty, too long), invalid room types

#### 9b. Integration Tests
- **Project CRUD flow:** Create → read → update → list → delete via API
- **Room CRUD flow:** Create room in project → list → update → reorder → delete
- **Member management:** Add member → verify access → change role → remove
- **Authorization:** Non-member cannot access project (DC-9)
- **Locking:** User A locks → User B sees lock status → auto-release after timeout

#### 9c. E2E UI Automation Tests
- **Create project flow:** Login → Dashboard → "New Project" → fill form → submit → see project detail
- **Add room flow:** Project detail → "Add Room" → select type → name room → see room in list
- **Navigation:** Bottom tabs navigate to correct pages
- **Empty states:** New user sees empty dashboard with CTA
- **Project list:** Multiple projects display in grid, search works

### 10. Verification Criteria
- [ ] Project CRUD endpoints work with proper authorization
- [ ] Room CRUD endpoints work within project context
- [ ] Project members can be added/removed/role-changed
- [ ] Project locking works with 5-minute auto-release (DC-8)
- [ ] All queries scoped by user/org membership (DC-9)
- [ ] All DTOs validate input (DC-14)
- [ ] Bottom tab navigation works on mobile
- [ ] Dashboard shows empty state for new users
- [ ] Project list with search/filter works
- [ ] Room type selection works
- [ ] All pages render correctly on 360px width
- [ ] Touch targets ≥48x48dp
