# Business Requirements Document — Apply Template to Room

## 1. Summary
Enable users to apply a design template from the Library to a specific room in their project. This triggers an AI visualization using the template's category on the room's photo, and optionally initializes the design's canvas state with the template's annotations.

## 2. Feature Requirements

### AT-F1: Apply Template Flow
**Priority:** P0
**Description:** When a user clicks "Apply to Room" on a template, they select a project and room, then the system creates a design with the template's category and triggers AI visualization.
**Acceptance Criteria:**
- "Apply to Room" button opens a project/room selection flow
- User selects project → room (only rooms with photos shown)
- System calls POST /api/ai/visualization with template's category + room's first photo
- If template has canvasState, it's copied to the new design via PATCH
- User is redirected to the room detail page to see the job processing
- Error if selected room has no photos: "This room has no photos. Upload a photo first."

### AT-F2: Backend Apply Endpoint
**Priority:** P0
**Description:** A dedicated endpoint that combines template lookup + design creation + optional canvasState copy in one call.
**Acceptance Criteria:**
- POST /api/templates/:templateId/apply with { roomId }
- Validates template exists, room exists, room has photos
- Creates design with template's category/subCategory
- Queues AI visualization job
- Copies template canvasState to design (if exists)
- Returns { jobId, designId, roomId, projectId }

## 3. Out of Scope
- Template editing/creation by users
- Template preview with user's actual room photo
