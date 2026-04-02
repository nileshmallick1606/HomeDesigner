# SPEC-023 — Apply Template to Room

**Parent Feature:** Apply Template to Room
**Spec Number:** 023 (standalone)
**Prerequisites:** None (Phase 3 complete)

## Status: Not Started

### 1. Objective

Implement the "Apply to Room" flow: user selects a template in the Library, picks a target project and room, and the system creates a design with the template's category and triggers AI visualization on the room's photo.

- **Before:** "Apply to Room" button in Library closes the dialog with no action
- **After:** Full flow: select project → select room → apply → redirect to room detail with job processing
- **Success criteria:** User can apply any template to any room that has photos. Design is created, AI job queued, user sees the visualization generating on the room detail page.

### 2. Architecture

```
Library page → Template detail dialog → "Apply to Room" button
  → Step 1: Fetch user's projects (GET /projects)
  → Step 2: Select a project → Fetch rooms (GET /projects/:id/rooms)
  → Step 3: Select a room (rooms with photos highlighted, rooms without grayed out)
  → Step 4: POST /api/templates/:templateId/apply { roomId }
  → Step 5: Redirect to /projects/:projectId/rooms/:roomId
  → Room detail page shows JobStatus for the new visualization
```

### 3. Design Constraints

- AT-DC-1: Reuse apiClient for all API calls
- AT-DC-2: Room must have at least 1 photo (validate on frontend + backend)
- AT-DC-3: Use existing BullMQ visualization queue
- AT-DC-4: Use MUI Dialog + Stepper or simple Select dropdowns

### 4. Detailed Design

#### 4a. Database / Schema Changes
- None

#### 4b. Backend / API Changes

**File: `apps/api/src/templates/templates.controller.ts`** (MODIFY)
- Add: POST /api/templates/:templateId/apply
- Body: { roomId: string }
- Protected by JwtAuthGuard (existing global guard)

**File: `apps/api/src/templates/templates.service.ts`** (MODIFY)
- Add: applyTemplate(templateId, roomId, userId)
  1. Fetch template by ID (throw 404 if not found)
  2. Fetch room by ID with photos (throw 404 if not found)
  3. Check room has at least 1 photo (throw 400 if not)
  4. Call aiService.requestVisualization(userId, room.photos[0].id, { category: template.category, subCategory: template.subCategory })
  5. If template.canvasState: call prisma.design.update({ where: { id: designId }, data: { canvasState: template.canvasState } })
  6. Return { jobId, designId, roomId, projectId: room.projectId }

**File: `apps/api/src/templates/templates.module.ts`** (MODIFY)
- Import AiModule to access AiService
- Or inject PrismaService directly for the template apply logic

#### 4c. Frontend / UI Changes

**File: `apps/web/app/(main)/library/page.tsx`** (MODIFY)
- Replace the stub "Apply to Room" button with a multi-step selection flow inside the existing dialog
- Steps:
  1. Show project selector (dropdown fetched from GET /projects)
  2. On project select: fetch rooms (GET /projects/:id/rooms)
  3. Show room selector (list of rooms — rooms with photos enabled, rooms without disabled with "No photos" note)
  4. "Apply" button: POST /api/templates/:templateId/apply { roomId }
  5. On success: close dialog, redirect to /projects/:projectId/rooms/:roomId via router.push

#### 4d. Shared / Cross-cutting Changes
- None

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| MODIFY | apps/api/src/templates/templates.controller.ts | Add POST apply endpoint | Med |
| MODIFY | apps/api/src/templates/templates.service.ts | Add applyTemplate method | Med |
| MODIFY | apps/api/src/templates/templates.module.ts | Import AiModule or PrismaService | Low |
| MODIFY | apps/web/app/(main)/library/page.tsx | Add project/room selection + apply flow | Med |

### 6. Dependency & Reference Check

#### Backend Wiring
- TemplatesModule needs access to AiService (for requestVisualization) and PrismaService (already available globally)
- AiModule exports AiService — import AiModule in TemplatesModule

#### Frontend Wiring
- Library page already uses apiClient
- useRouter from next/navigation for redirect

### 7. Implementation Plan

**Step 1:** Update TemplatesModule to import AiModule
- File: apps/api/src/templates/templates.module.ts
- Action: modify — add AiModule to imports

**Step 2:** Add applyTemplate method to TemplatesService
- File: apps/api/src/templates/templates.service.ts
- Action: modify — add method that fetches template, validates room, calls AI service

**Step 3:** Add POST endpoint to TemplatesController
- File: apps/api/src/templates/templates.controller.ts
- Action: modify — add POST /:templateId/apply endpoint

**Step 4:** Update Library page with project/room selection flow
- File: apps/web/app/(main)/library/page.tsx
- Action: modify — add state for apply flow, project/room selectors, API call, redirect

### 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Circular dependency: TemplatesModule imports AiModule | Low | AiModule exports AiService cleanly. Or use PrismaService + BullMQ directly. |
| User selects room in different browser tab, room gets deleted | Low | Backend validates room exists before applying |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests
- applyTemplate: creates design with correct category from template
- applyTemplate: rejects if room has no photos (400)
- applyTemplate: rejects if template not found (404)
- applyTemplate: copies canvasState if template has one

#### 9b. Integration Tests
- Full flow: POST /api/templates/:id/apply { roomId } → design created → job queued
- Verify design has template's category
- Verify canvasState copied

#### 9c. E2E UI Automation Tests
- Library → click template → "Apply to Room" → select project → select room → apply → redirected to room detail

### 10. Verification Criteria
- [ ] POST /api/templates/:id/apply creates design + queues job
- [ ] Room without photos returns 400 error
- [ ] Template's category used for the new design
- [ ] Template's canvasState copied to design (if exists)
- [ ] Frontend: project/room selection works
- [ ] Frontend: redirects to room detail after apply
- [ ] All builds pass
