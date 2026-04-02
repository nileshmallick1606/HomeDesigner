# SPEC-012 — Visualization Request & Display UI
**Parent Feature:** InteriorScience Phase 2
**Spec Number:** 012 of 016 (Phase 2: 3 of 7)
**Prerequisites:** SPEC-010, SPEC-011

## Status: Not Started

### 1. Objective

Wire the frontend visualization flow so users can request AI-generated design visualizations from the room detail page and view the results. This covers BRD features P2-F4 (visualization request) and P2-F5 (before/after display).

- **Before:** Room detail page shows photos and a static "No Designs Yet" empty state. CategorySelector, JobStatus, and BeforeAfterSlider components exist but are unused. No way to trigger visualization or view results.
- **After:** Users select a design category, click "Generate", see real-time job progress, and view before/after comparisons. Saved designs appear as clickable cards. A dedicated design detail page provides full-width comparison, metadata, regeneration, and deletion.
- **Success criteria:** Select category + Generate → job polls to completion → BeforeAfterSlider shows original vs. transformed image. Designs list refreshes. Design detail page loads with full slider, metadata, and action buttons. Backend needs one new GET endpoint for fetching a single design with its visualizations.

### 2. Architecture

```
Room Detail Page (/projects/[id]/rooms/[roomId])
  ├── Photos section (existing)
  ├── "Start Design" section (NEW)
  │   ├── Guard: only visible when room has >= 1 photo
  │   ├── CategorySelector (existing component, wired)
  │   ├── "Generate" Button → POST /api/ai/visualization
  │   │   └── Payload: { roomPhotoId: photos[0].id, category }
  │   ├── JobStatus (existing component, shown while processing)
  │   └── BeforeAfterSlider (existing component, shown on completion)
  │       ├── beforeSrc = first photo's originalUrl
  │       └── afterSrc = visualization.imageUrl
  ├── Divider
  └── "Designs" section
      ├── DesignCard grid (NEW component) — one card per design
      │   └── Click → /projects/[id]/rooms/[roomId]/designs/[designId]
      └── EmptyState (existing, shown when no designs)

Design Detail Page (/projects/[id]/rooms/[roomId]/designs/[designId]) (NEW)
  ├── Back link → room detail
  ├── Full-width BeforeAfterSlider
  │   ├── beforeSrc = room's first photo originalUrl
  │   └── afterSrc = latest completed visualization imageUrl
  ├── Metadata: category badge, created date, model version
  ├── "Regenerate" button → POST /api/ai/visualization (same photo + category)
  └── "Delete" button → DELETE /api/ai/designs/:id via apiClient → navigate back

Backend Addition:
  └── GET /api/ai/designs/:id → Design with visualizations[] included
  └── DELETE /api/ai/designs/:id → Delete a design
```

### 3. Design Constraints

- **P2-DC-2:** All UI uses MUI components with tree-shaking imports (`import Button from '@mui/material/Button'`). Mobile-first layout. Touch targets minimum 48x48dp.
- **P2-DC-8:** Use `window.location.hostname` for direct API calls (file uploads/deletes). Use `apiClient` for all standard JSON API calls. The existing JobStatus component uses native `fetch('/api/ai/jobs/...')` which must be updated to use `apiClient` or the direct hostname pattern for consistency.
- **P2-DC-9:** All Phase 1 constraints remain in effect.
- Photo URLs returned by the API are relative paths served by the backend; prefix with `http://${window.location.hostname}:4000` when rendering `<img>` src attributes.

### 4. Detailed Design

#### 4a. Database / Schema Changes

None. Design, Visualization, and AiJob models already exist with all required fields.

#### 4b. Backend / API Changes

**File: `apps/api/src/ai/ai.controller.ts`** (MODIFY)
- Add a new GET endpoint: `GET /api/ai/designs/:id` (the `ai` prefix comes from the controller's `@Controller('ai')` decorator)
- This could alternatively live in a new `designs.controller.ts`, but since design retrieval is tightly coupled to the AI visualization flow and no designs module exists yet, add it to the AI controller for now.

New method (note: since the controller is `@Controller('ai')`, the full route becomes `/api/ai/designs/:id`):
```typescript
@Get('designs/:id')
@ApiOperation({ summary: 'Get design with visualizations' })
async getDesign(@Param('id', ParseUUIDPipe) id: string) {
  return this.aiService.getDesignWithVisualizations(id);
}
```

**File: `apps/api/src/ai/ai.service.ts`** (MODIFY)
- Add `getDesignWithVisualizations(designId: string)` method:
  - Query: `prisma.design.findUnique({ where: { id }, include: { visualizations: { orderBy: { createdAt: 'desc' } }, room: { include: { photos: { take: 1, orderBy: { createdAt: 'asc' } } } } } })`
  - Throw NotFoundException if not found
  - Returns design with nested visualizations and the room's first photo for before/after pairing

**File: `apps/api/src/ai/ai.controller.ts`** (MODIFY)
- Add a DELETE endpoint: `DELETE /api/ai/designs/:id` (the `ai` prefix comes from the controller's `@Controller('ai')` decorator)

New method:
```typescript
@Delete('designs/:id')
@HttpCode(HttpStatus.NO_CONTENT)
@ApiOperation({ summary: 'Delete a design' })
async deleteDesign(@Param('id', ParseUUIDPipe) id: string) {
  return this.aiService.deleteDesign(id);
}
```

**File: `apps/api/src/ai/ai.service.ts`** (MODIFY)
- Add `deleteDesign(designId: string)` method:
  - Verify design exists, then `prisma.design.delete({ where: { id: designId } })`
  - Cascade delete handles visualizations and AI jobs via schema `onDelete: Cascade`

#### 4c. Frontend / UI Changes

**File: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx`** (MODIFY)

Add state variables:
- `selectedCategory: string | null` — tracks which category tile is selected
- `jobId: string | null` — set after POST /api/ai/visualization succeeds
- `latestVisualization: { imageUrl: string } | null` — fetched on job completion
- `generating: boolean` — disables Generate button during request

Add "Start Design" section between photo upload and Divider:
```
{room.photos.length > 0 && (
  <>
    <Divider sx={{ my: 3 }} />
    <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
      Start Design
    </Typography>
    <CategorySelector onSelect={setSelectedCategory} selected={selectedCategory} />
    <Box sx={{ mt: 2 }}>
      <Button
        variant="contained"
        disabled={!selectedCategory || generating}
        onClick={handleGenerate}
        startIcon={generating ? <CircularProgress size={20} color="inherit" /> : undefined}
      >
        {generating ? 'Generating...' : 'Generate'}
      </Button>
    </Box>
    {jobId && <JobStatus jobId={jobId} onComplete={handleJobComplete} onRetry={handleGenerate} />}
    {latestVisualization && (
      <BeforeAfterSlider
        beforeSrc={`http://${window.location.hostname}:4000${room.photos[0].originalUrl}`}
        afterSrc={`http://${window.location.hostname}:4000${latestVisualization.imageUrl}`}
      />
    )}
  </>
)}
```

`handleGenerate` function:
1. Set `generating = true`, clear previous `jobId` and `latestVisualization`
2. Call `apiClient.fetch('/ai/visualization', { method: 'POST', json: { roomPhotoId: room.photos[0].id, category: selectedCategory } })`
3. Response: `{ jobId, designId, status }` — store `jobId` in state
4. Set `generating = false`

`handleJobComplete` callback:
1. Clear `jobId`
2. Re-fetch room data via `fetchRoom()` to update the designs list
3. Fetch the latest visualization for display: `apiClient.fetch('/ai/designs/<designId>')` — use `designId` stored from the generate response
4. Set `latestVisualization` from the first completed visualization in the response

Replace the static "No Designs Yet" empty state in the Designs section:
- If `room.designs.length > 0`: render a Grid of DesignCard components
- If `room.designs.length === 0`: keep existing EmptyState

New imports needed:
- `CategorySelector` from `components/visualization/category-selector`
- `JobStatus` from `components/ai/job-status`
- `BeforeAfterSlider` from `components/comparison/before-after-slider`
- `DesignCard` from `components/visualization/design-card`
- `Button` from `@mui/material/Button`
- `Grid` from `@mui/material/Grid`
- `CircularProgress` from `@mui/material/CircularProgress`
- `useRouter` from `next/navigation`

Update the `Room` interface to include designs:
```typescript
interface Design {
  id: string;
  name: string;
  category: string;
  status: string;
  createdAt: string;
  visualizations?: Array<{ id: string; imageUrl: string | null; thumbnailUrl: string | null; status: string }>;
}

interface Room {
  id: string;
  name: string;
  type: string;
  notes?: string;
  photos: Photo[];
  designs: Design[];
  _count?: { photos: number; designs: number };
}
```

**File: `apps/web/components/visualization/design-card.tsx`** (CREATE)

A clickable card component for listing designs in the room detail page.

Props:
```typescript
interface DesignCardProps {
  design: {
    id: string;
    name: string;
    category: string;
    status: string;
    createdAt: string;
    visualizations?: Array<{ thumbnailUrl: string | null; imageUrl: string | null }>;
  };
  roomPhotoUrl: string; // first room photo URL for "before" thumbnail
  onClick: () => void;
}
```

Renders:
- MUI Card with CardActionArea
- Thumbnail: if design has a completed visualization with thumbnailUrl or imageUrl, show it; otherwise show room photo with a category-colored overlay
- Category chip (matching CategorySelector colors)
- Design name (truncated)
- Status chip: DRAFT (grey), COMPLETED (green)
- Created date formatted with `toLocaleDateString()`
- Card dimensions: 100% width in xs=12 sm=6 md=4 Grid items

**File: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx`** (CREATE)

Design detail page. Full layout:

```
'use client';
// Imports: useParams, useRouter, useState, useEffect, apiClient, MUI components,
//          BeforeAfterSlider, JobStatus, CategorySelector

State:
- design: DesignDetail | null (includes visualizations[], room with first photo)
- loading: boolean
- jobId: string | null (for regeneration)
- deleting: boolean

On mount:
- Fetch design: apiClient.fetch('/ai/designs/<designId>')
- Set design state

Render:
- Back link: IconButton + "Back to Room" → router.push to room page
- Typography h5: design name
- Category chip + date chip
- Full-width BeforeAfterSlider:
  - beforeSrc: room's first photo originalUrl (prefixed with hostname)
  - afterSrc: latest completed visualization imageUrl (prefixed with hostname)
  - height: 500 (larger for detail view)
- If no completed visualization: show "Processing..." or "No visualization yet"
- Metadata section: model version, generation date
- Action buttons row:
  - "Regenerate" (outlined, primary) → `apiClient.fetch('/ai/visualization', { method: 'POST', json: { roomPhotoId, category } })` → shows JobStatus → on complete, re-fetch design
  - "Delete" (outlined, error color) → confirmation dialog → `apiClient.fetch('/ai/designs/<id>', { method: 'DELETE' })` → router.push back to room
```

#### 4d. Shared / Cross-cutting Changes

**JobStatus component note:** The existing `JobStatus` component at `apps/web/components/ai/job-status.tsx` uses bare `fetch('/api/ai/jobs/${jobId}')` on line 28. This works when the Next.js dev server proxies to the API, but for consistency with P2-DC-8, consider updating it to use `apiClient.fetch(`/ai/jobs/${jobId}`)` or the direct hostname pattern. This is a low-risk optional improvement — the current implementation works if Next.js rewrites are configured, but will fail if they are not. Flag for review during implementation.

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| MODIFY | apps/api/src/ai/ai.controller.ts | Add GET /api/designs/:id and DELETE /api/designs/:id endpoints | Low |
| MODIFY | apps/api/src/ai/ai.service.ts | Add getDesignWithVisualizations() and deleteDesign() methods | Low |
| MODIFY | apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx | Add Start Design section, wire CategorySelector/JobStatus/BeforeAfterSlider, render DesignCard grid | High |
| CREATE | apps/web/components/visualization/design-card.tsx | New DesignCard component for design listing | Med |
| CREATE | apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx | New design detail page with full slider, metadata, regenerate, delete | Med |

### 6. Dependency & Reference Check

#### Frontend Wiring
- `CategorySelector` — exists at `apps/web/components/visualization/category-selector.tsx`. Props: `{ onSelect, selected }`. No changes needed.
- `JobStatus` — exists at `apps/web/components/ai/job-status.tsx`. Props: `{ jobId, onComplete?, onRetry? }`. No changes needed (optional: update fetch to use apiClient).
- `BeforeAfterSlider` — exists at `apps/web/components/comparison/before-after-slider.tsx`. Props: `{ beforeSrc, afterSrc, height? }`. No changes needed.
- `EmptyState` — exists at `apps/web/components/ui/empty-state.tsx`. Already used on room detail page.
- `apiClient` — exists at `apps/web/lib/api-client.ts`. Singleton with `.fetch<T>(path, options)`. Handles auth token, refresh, JSON serialization.
- No new npm packages required.

#### Backend Wiring
- `PrismaService` — already injected in `AiService`.
- `Design` model includes `visualizations` relation and `room` relation — Prisma includes work.
- `Room` model `findById` already includes `designs: { orderBy: { updatedAt: 'desc' }, take: 10 }` — designs are already returned by GET /api/rooms/:id but without nested visualizations. The room detail page will use this for the card list; the design detail page fetches full detail separately via GET /api/designs/:id.
- Cascade deletes: Design → Visualization and Design → AiJob are defined in schema with `onDelete: Cascade`.

#### API Endpoint Inventory (used by this spec)
| Endpoint | Exists? | Source |
|----------|---------|--------|
| POST /api/ai/visualization | Yes | ai.controller.ts |
| GET /api/ai/jobs/:jobId | Yes | ai.controller.ts |
| GET /api/rooms/:id | Yes | rooms.controller.ts (includes designs) |
| GET /api/ai/designs/:id | **No — must create** | ai.controller.ts (this spec) |
| DELETE /api/ai/designs/:id | **No — must create** | ai.controller.ts (this spec) |

### 7. Implementation Plan

**Step 1:** Add GET /api/ai/designs/:id endpoint
- File: apps/api/src/ai/ai.service.ts
- Action: modify
- Details: Add `getDesignWithVisualizations(designId)` — Prisma query with `include: { visualizations, room: { include: { photos: { take: 1 } } } }`. Throw NotFoundException if missing.

**Step 2:** Add DELETE /api/ai/designs/:id endpoint
- File: apps/api/src/ai/ai.service.ts
- Action: modify
- Details: Add `deleteDesign(designId)` — verify exists, then `prisma.design.delete()`. Cascades handle cleanup.

**Step 3:** Register new endpoints in controller
- File: apps/api/src/ai/ai.controller.ts
- Action: modify
- Details: Import `Delete`, `HttpCode`, `HttpStatus` from `@nestjs/common`. Add `getDesign()` and `deleteDesign()` methods with route decorators.

**Step 4:** Create DesignCard component
- File: apps/web/components/visualization/design-card.tsx
- Action: create
- Details: MUI Card with thumbnail, category chip, name, status, date. Accepts `onClick` for navigation. Uses CardActionArea for clickable surface.

**Step 5:** Modify room detail page — add visualization request flow
- File: apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx
- Action: modify
- Details: Import new components. Add state for category, jobId, visualization, generating. Add "Start Design" section with CategorySelector, Generate button, JobStatus, BeforeAfterSlider. Replace static Designs empty state with conditional DesignCard grid. Add Design and DesignDetail interfaces. Add handleGenerate and handleJobComplete functions.

**Step 6:** Create design detail page
- File: apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx
- Action: create
- Details: Full detail page with back navigation, BeforeAfterSlider (height=500), metadata display, Regenerate button (triggers new visualization + polls), Delete button (with confirmation dialog), loading/error states.

**Step 7:** Verify end-to-end flow
- Action: manual test
- Details: Upload photo → select category → Generate → watch job status poll → see before/after slider → check design card appears → click into detail page → regenerate → delete.

### 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| First photo used as `roomPhotoId` may not be the best choice for visualization | Low | This is the MVP behavior. Future iteration can add photo selection UI. Using `photos[0]` (most recently uploaded, per `orderBy: createdAt desc`) is a reasonable default. |
| JobStatus polling uses relative `/api/ai/jobs/...` path — may not resolve without Next.js proxy config | Med | Verify Next.js rewrites are configured. If not, update JobStatus to use `apiClient` or `window.location.hostname:4000` pattern. Flag during implementation. |
| Race condition: user clicks Generate multiple times before first job completes | Med | Disable Generate button while `generating` is true or `jobId` is set. Re-enable only on completion or failure. |
| Photo URL construction — API returns relative paths but BeforeAfterSlider needs absolute URLs | Med | Consistently prefix with `http://${window.location.hostname}:4000`. Encapsulate in a helper function to avoid repetition. |
| Design detail page loaded with stale visualization (still QUEUED/PROCESSING) | Low | Check visualization status. If no COMPLETED visualization exists, show a "Processing" indicator instead of the slider. Poll or prompt user to refresh. |
| Delete endpoint has no ownership check — any authenticated user could delete any design | Med | Acceptable for MVP (single-user mode). Add ownership guard in a future spec when multi-user collaboration is implemented. |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests

- `DesignCard` renders design name, category chip, and formatted date
- `DesignCard` shows thumbnail from visualization imageUrl when available
- `DesignCard` shows placeholder when no visualization exists
- `DesignCard` calls onClick when clicked
- `handleGenerate` calls apiClient with correct payload `{ roomPhotoId, category }`
- `handleGenerate` sets jobId from API response
- `handleGenerate` is disabled when no category selected
- `handleJobComplete` clears jobId and triggers room re-fetch
- Design detail page renders BeforeAfterSlider with correct before/after URLs
- Design detail page shows metadata (category, date)
- Design detail page delete button triggers confirmation then API call

#### 9b. Integration Tests

- Room detail page: upload photo → "Start Design" section becomes visible
- Room detail page: select category → Generate → POST /api/ai/visualization called with correct body
- Room detail page: mock job completion → BeforeAfterSlider renders with correct image URLs
- Room detail page: designs array populated → DesignCard grid renders correct count
- Room detail page: click DesignCard → navigates to design detail page
- Design detail page: fetch design → renders BeforeAfterSlider with room photo and visualization
- Design detail page: click Regenerate → new job created → polls → slider updates
- Design detail page: click Delete → confirm → API DELETE called → navigates back to room
- Backend: GET /api/designs/:id returns design with visualizations and room photo
- Backend: GET /api/designs/:nonexistent returns 404
- Backend: DELETE /api/designs/:id removes design and cascaded records

#### 9c. E2E UI Automation Tests

- Full flow: navigate to room with photo → select "Furnishings" category → click Generate → wait for job to complete → before/after slider visible with two different images → design card appears in list
- Design detail flow: click design card → detail page loads → slider shows before/after → metadata displays category and date
- Regenerate flow: on design detail → click Regenerate → new job processes → slider updates with new visualization
- Delete flow: on design detail → click Delete → confirm dialog → navigated back to room → design no longer in list
- Edge case: room with no photos → "Start Design" section not visible → "No Designs Yet" empty state shown
- Edge case: generate fails → JobStatus shows error with Retry button → click Retry → new job starts

### 10. Verification Criteria

- [ ] Room detail page shows "Start Design" section only when room has at least one photo
- [ ] CategorySelector renders all 6 categories and highlights selected one
- [ ] Generate button is disabled when no category is selected
- [ ] Generate button is disabled while a job is in progress
- [ ] POST /api/ai/visualization is called with `{ roomPhotoId: <first photo ID>, category: <selected> }`
- [ ] JobStatus component appears after Generate and polls job status
- [ ] On job completion, BeforeAfterSlider renders with original photo (before) and visualization (after)
- [ ] Before/after images are visually different (mock transform applied)
- [ ] Designs section shows DesignCard grid when designs exist
- [ ] DesignCard displays design name, category chip, and creation date
- [ ] Clicking a DesignCard navigates to `/projects/[id]/rooms/[roomId]/designs/[designId]`
- [ ] Design detail page loads and displays full-width BeforeAfterSlider
- [ ] Design detail page shows category badge and creation date
- [ ] Regenerate button triggers a new visualization job and updates the slider on completion
- [ ] Delete button shows confirmation, then removes the design and navigates back to room
- [ ] GET /api/ai/designs/:id returns design with visualizations array and room's first photo
- [ ] DELETE /api/ai/designs/:id removes the design (cascade deletes visualizations and AI jobs)
- [ ] All API calls use apiClient (not bare fetch) except for file upload/delete operations
- [ ] No console errors or uncaught promise rejections during the full flow
