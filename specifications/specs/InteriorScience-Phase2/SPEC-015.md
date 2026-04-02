# SPEC-015 — Camera Capture & Export

**Parent Feature:** InteriorScience Phase 2
**Spec Number:** 015 of 016 (Phase 2: 6 of 7)
**Prerequisites:** SPEC-010, SPEC-012

## Status: Not Started

### 1. Objective

Rewrite the camera capture page to use the device camera via getUserMedia for photo capture with project/room selection, and build a server-side export module that generates design images, before/after comparisons, and branded PDF reports.

- **Before:** Capture page is a placeholder. No export functionality. Users cannot take photos directly from the app or export designs.
- **After:** Capture page opens device camera, lets users snap a photo, select a project and room, and upload. Export module generates downloadable design images, comparison images, and multi-page branded PDFs.
- **Success criteria:** Camera viewfinder renders on mobile. Capture → preview → select project/room → upload works. File picker fallback works on desktop without camera. Export endpoints return valid image and PDF files. Frontend export buttons trigger downloads.

### 2. Architecture

```
Camera Capture:
  /capture page
    ├── Permission request: navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    │   ├── Granted → render <video> viewfinder
    │   ├── Denied → show denied state with instructions + file picker fallback (P2-DC-7)
    │   └── Not available (desktop without camera) → show file picker only (P2-E6)
    ├── Capture button → canvas.drawImage(video) → toBlob() → preview
    ├── Preview state: captured image with Retake / Use buttons
    ├── Use → project selector (dropdown, fetch GET /api/projects)
    │   └── Room selector (dropdown, fetch GET /api/projects/:id/rooms)
    │       └── Upload: POST /api/rooms/:roomId/photos (multipart form)
    └── Success → navigate to room detail page

Export Module (Backend):
  apps/api/src/export/
    ├── export.module.ts (NestJS module)
    ├── export.controller.ts (3 endpoints)
    └── export.service.ts (Sharp + PDFKit logic)

  Endpoints:
    GET /api/export/design/:id/image
      → Fetch design visualization image → return as download

    GET /api/export/design/:id/comparison
      → Fetch original photo + visualization → Sharp composite side-by-side → return as download

    GET /api/export/project/:id/pdf
      → Fetch project data (rooms, photos, designs, budget)
      → PDFKit: branded header, project summary, per-room sections with images, budget table
      → Stream PDF response (P2-DC-6: max 50 pages, truncate if exceeded)

Frontend Export Buttons:
  Design detail page → "Download Image" + "Download Comparison" buttons
  Project detail page → "Export PDF" button
```

### 3. Design Constraints

- P2-DC-6: PDF generation must be server-side (PDFKit). Maximum 50 pages per PDF. If project data exceeds 50 pages, truncate with "Report truncated" note (P2-E5).
- P2-DC-7: Camera access requires explicit user permission via getUserMedia. Must handle denied state gracefully with clear instructions and file picker fallback.
- P2-DC-8: Use window.location.hostname for direct API/media URLs.
- P2-DC-9: All Phase 1 constraints remain in effect.
- P2-E5: Large projects with many rooms/designs — truncate PDF at 50 pages with summary note.
- P2-E6: Desktop browsers without camera hardware — hide camera UI entirely, show file picker input only.

### 4. Detailed Design

#### 4a. Database / Schema Changes
- None — all models exist (Photo, Design, Visualization, Project, Room)

#### 4b. Backend / API Changes

**File: `apps/api/src/export/export.module.ts`** (CREATE)
- NestJS Module
- Imports: PrismaModule
- Providers: ExportService
- Controllers: ExportController

**File: `apps/api/src/export/export.controller.ts`** (CREATE)
- @Controller('export')
- All endpoints require @UseGuards(JwtAuthGuard)

- @Get('design/:id/image')
  - Fetch Design → Visualization → imageUrl
  - Read image file from storage
  - Return as response with Content-Type: image/png, Content-Disposition: attachment

- @Get('design/:id/comparison')
  - Fetch Design → original Photo + Visualization imageUrl
  - Call ExportService.generateComparison()
  - Return as response with Content-Type: image/png, Content-Disposition: attachment

- @Get('project/:id/pdf')
  - Validate user is project member
  - Call ExportService.generateProjectPdf()
  - Return as response with Content-Type: application/pdf, Content-Disposition: attachment

**File: `apps/api/src/export/export.service.ts`** (CREATE)
- Dependencies: PrismaService, R2Service (or local storage)

- generateComparison(designId: string): Promise<Buffer>
  - Fetch original photo buffer and visualization buffer
  - Sharp: resize both to same height → composite side-by-side with label text ("Before" / "After")
  - Return PNG buffer

- generateProjectPdf(projectId: string): Promise<Buffer>
  - Fetch project with rooms, photos, designs (with visualizations), budget
  - PDFKit document:
    - Page 1: Branded header ("InteriorScience" title, project name, date, owner)
    - Project summary: room count, photo count, design count, total budget
    - Per room: room name header, photo thumbnails (2 per row), design before/after pairs, budget line items table
    - Budget summary page: total budget table, category breakdown
    - Footer on each page: page number, "Generated by InteriorScience"
  - Truncation: track page count, if approaching 50 pages → add "Report truncated — project contains too many items" note and stop (P2-E5)
  - Return PDF buffer

**File: `apps/api/src/export/export.module.ts`** registered in AppModule
- File: apps/api/src/app.module.ts (MODIFY) — add ExportModule to imports

**File: `apps/api/package.json`** (MODIFY)
- Add dependency: pdfkit, @types/pdfkit (devDep)

#### 4c. Frontend / UI Changes

**File: `apps/web/app/(main)/capture/page.tsx`** (REWRITE)
- Complete rewrite of capture page
- State machine: PERMISSION_CHECK → VIEWFINDER → PREVIEW → SELECT_TARGET → UPLOADING → SUCCESS

- PERMISSION_CHECK:
  - Check navigator.mediaDevices availability
  - If not available (P2-E6): skip to file picker mode (no camera UI at all)
  - If available: call getUserMedia({ video: { facingMode: 'environment' } })
    - Success → VIEWFINDER
    - Denied (P2-DC-7) → show denied state: "Camera access denied. Please enable camera permission in your browser settings." + MUI Button "Use File Picker Instead"

- VIEWFINDER:
  - <video> element with live camera stream (ref, autoPlay, playsInline)
  - Circular capture button (centered bottom, large, 48dp+ touch target)
  - Switch camera button (if multiple cameras detected via enumerateDevices)
  - Tap capture → canvas.toBlob() → PREVIEW

- PREVIEW:
  - Display captured image
  - "Retake" button → back to VIEWFINDER
  - "Use Photo" button → SELECT_TARGET

- SELECT_TARGET:
  - Project dropdown: fetch GET /api/projects → list user's projects
  - Room dropdown (disabled until project selected): fetch GET /api/projects/:id/rooms
  - "Upload" button (disabled until both selected) → UPLOADING

- UPLOADING:
  - Show CircularProgress
  - POST /api/rooms/:roomId/photos with FormData (file blob)
  - On success → SUCCESS state → Snackbar "Photo uploaded!" → navigate to room detail page
  - On error → show error, allow retry

- FILE PICKER MODE (desktop fallback / denied fallback):
  - MUI Button "Select Photo" → <input type="file" accept="image/*" capture="environment">
  - On file selected → PREVIEW state (same flow from there)

**File: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx`** (MODIFY)
- Add export buttons section:
  - "Download Image" button → trigger authenticated download
  - "Download Comparison" button → trigger authenticated download
- **Auth note:** `window.open()` will NOT send the Bearer token from localStorage. Instead, use `apiClient.fetch()` with `responseType: 'blob'` (or use the Fetch API directly with the Authorization header), create a Blob URL via `URL.createObjectURL()`, and trigger download via a temporary `<a>` element with `download` attribute. Alternatively, the export endpoints could accept a `?token=` query parameter — but that leaks the token in URLs/logs, so the blob download approach is preferred.
- Helper function `downloadFile(path: string, filename: string)`:
  ```
  const res = await fetch(apiUrl + path, { headers: { Authorization: 'Bearer ' + token } });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  ```

**File: `apps/web/app/(main)/projects/[id]/page.tsx`** (MODIFY)
- Add "Export PDF" button in project header or actions area
  - Click → trigger authenticated download using the same blob download pattern as design exports
  - Show loading indicator while PDF generates (CircularProgress on button)

#### 4d. Shared / Cross-cutting Changes
- pdfkit added to API dependencies only (not frontend)
- Sharp already installed in API (used by AI worker)

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| CREATE | apps/api/src/export/export.module.ts | NestJS export module | Low |
| CREATE | apps/api/src/export/export.controller.ts | 3 export endpoints | Med |
| CREATE | apps/api/src/export/export.service.ts | Sharp comparison + PDFKit PDF generation | High |
| MODIFY | apps/api/src/app.module.ts | Register ExportModule | Low |
| MODIFY | apps/api/package.json | Add pdfkit dependency | Low |
| REWRITE | apps/web/app/(main)/capture/page.tsx | Full camera capture flow with fallback | High |
| MODIFY | apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx | Add export buttons | Low |
| MODIFY | apps/web/app/(main)/projects/[id]/page.tsx | Add Export PDF button | Low |

### 6. Dependency & Reference Check

#### Frontend Wiring
- No new frontend npm packages
- Capture page uses apiClient for fetching projects/rooms and uploading photos
- Export buttons use direct URL (window.open) to download endpoints — auth via cookie or query token
- getUserMedia is a browser API (no npm package needed)

#### Backend Wiring
- New npm package: pdfkit (add to apps/api/package.json)
- Sharp already installed in API (verify version supports composite operations)
- ExportService depends on PrismaService (existing) and R2Service or local storage (existing)
- ExportModule must be registered in AppModule imports array
- Export endpoints require JwtAuthGuard (existing)
- Design, Visualization, Photo, Project, Room models all exist in Prisma schema

#### Endpoint Verification
- GET /api/projects — exists (projects module)
- GET /api/projects/:id/rooms — exists (rooms module)
- POST /api/rooms/:roomId/photos — exists (media module)
- Export endpoints: NEW (created in this spec)

### 7. Implementation Plan

**Step 1:** Add pdfkit dependency
- File: apps/api/package.json
- Action: modify
- Details: Add pdfkit to dependencies. Run pnpm install.

**Step 2:** Create export service
- File: apps/api/src/export/export.service.ts
- Action: create
- Details: generateComparison() with Sharp side-by-side compositing. generateProjectPdf() with PDFKit branded report. 50-page truncation logic.

**Step 3:** Create export controller
- File: apps/api/src/export/export.controller.ts
- Action: create
- Details: Three GET endpoints for design image, comparison image, and project PDF. Auth guarded. Proper Content-Type and Content-Disposition headers.

**Step 4:** Create export module and register
- File: apps/api/src/export/export.module.ts
- Action: create
- File: apps/api/src/app.module.ts
- Action: modify
- Details: NestJS module with controller + service. Add to AppModule imports.

**Step 5:** Rewrite capture page
- File: apps/web/app/(main)/capture/page.tsx
- Action: rewrite
- Details: Full camera capture flow: permission check → viewfinder → capture → preview → project/room select → upload. File picker fallback for desktop/denied. State machine pattern.

**Step 6:** Add export buttons to design detail page
- File: apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx
- Action: modify
- Details: "Download Image" and "Download Comparison" buttons that open export URLs.

**Step 7:** Add export PDF button to project detail page
- File: apps/web/app/(main)/projects/[id]/page.tsx
- Action: modify
- Details: "Export PDF" button that opens project PDF export URL.

### 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| getUserMedia not supported on older browsers | Med | Feature detection: check navigator.mediaDevices exists before calling. Fallback to file picker. |
| Camera permission denied with no way to re-prompt | Med | P2-DC-7: Show clear instructions to enable in browser settings. Always offer file picker alternative. |
| PDFKit memory usage on large projects (many images) | High | Stream PDF instead of buffering. Limit images to thumbnails (300px width). Enforce 50-page cap (P2-DC-6). |
| Sharp composite fails on mismatched image formats | Med | Normalize both images to PNG via Sharp before compositing. Wrap in try/catch with error response. |
| Export endpoint returns 404 if design has no visualization | Low | Check visualization exists before processing. Return 400 with "No visualization available for this design." |
| iOS Safari getUserMedia quirks | Med | Use facingMode: 'environment' (not exact), add playsInline attribute to video element. Test on iOS Safari. |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests
- ExportService.generateComparison() returns a PNG buffer from two input images
- ExportService.generateProjectPdf() returns a valid PDF buffer
- ExportService.generateProjectPdf() truncates at 50 pages with note
- ExportController returns correct Content-Type headers
- Capture page state machine transitions correctly (mock getUserMedia)
- Capture page shows file picker when mediaDevices unavailable
- Capture page shows denied state when permission rejected

#### 9b. Integration Tests
- GET /api/export/design/:id/image — returns image file with correct headers
- GET /api/export/design/:id/comparison — returns side-by-side PNG
- GET /api/export/project/:id/pdf — returns PDF with project data
- GET /api/export/project/:id/pdf — returns 403 for non-member
- GET /api/export/design/:id/image — returns 404 for non-existent design
- Capture page → select file via picker → preview renders → select project/room → upload succeeds
- Large project PDF truncates correctly at 50 pages

#### 9c. E2E UI Automation Tests
- Navigate to /capture → camera permission prompt appears (or file picker on desktop)
- Select a file via picker → preview shown → Retake returns to picker
- Use photo → select project → select room → upload → navigate to room page
- Design detail page → click "Download Image" → file downloads
- Design detail page → click "Download Comparison" → comparison image downloads
- Project detail page → click "Export PDF" → PDF downloads with project data

### 10. Verification Criteria
- [ ] Export module registered in AppModule without errors
- [ ] GET /api/export/design/:id/image returns image with Content-Disposition: attachment
- [ ] GET /api/export/design/:id/comparison returns side-by-side image
- [ ] GET /api/export/project/:id/pdf returns valid PDF file
- [ ] PDF contains branded header, project name, room sections, budget data
- [ ] PDF truncates at 50 pages with note for large projects
- [ ] Capture page renders camera viewfinder on mobile (with permission)
- [ ] Capture page shows denied state with instructions when permission denied
- [ ] Capture page shows file picker only on desktop without camera
- [ ] Can capture photo → preview → retake → capture again
- [ ] Can select project and room → upload photo successfully
- [ ] After upload, navigates to room detail page
- [ ] Export buttons appear on design detail page and trigger downloads
- [ ] Export PDF button appears on project detail page and triggers download
- [ ] No server crash on large project PDF export (memory managed)
