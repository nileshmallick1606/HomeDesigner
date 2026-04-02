# SPEC-020 — Export Functionality

**Parent Feature:** InteriorScience Phase 3
**Spec Number:** 020 of 022 (Phase 3: 4 of 6)
**Prerequisites:** SPEC-017

## Status: Not Started

### 1. Objective

Build a backend export module and frontend download buttons so users can export design visualizations as images and full project summaries as branded PDFs.

- **Before:** No export capability. Users cannot download visualizations or generate project documents. The export module directory does not exist in the API.
- **After:** Three export endpoints serve design images (JPEG/PNG), before/after comparison composites, and project summary PDFs. Frontend provides download buttons on design detail and project detail pages. All downloads use authenticated blob fetch pattern.
- **Success criteria:** GET /api/export/design/:id/image downloads visualization in requested format. GET /api/export/design/:id/comparison returns side-by-side before/after composite. GET /api/export/project/:id/pdf generates a branded PDF with project info, rooms, designs, and budget. Export buttons work on mobile (Android Chrome). PDF capped at 50 pages (P3-DC-5). Rooms with no designs show photos only (P3-E4).

### 2. Architecture

```
Backend Export Module:
  apps/api/src/export/
  ├── export.module.ts          # NestJS module, imports PrismaModule, MediaModule
  ├── export.controller.ts      # Three GET endpoints
  └── export.service.ts         # Sharp image processing + PDFKit PDF generation

Endpoints:
  GET /api/export/design/:id/image?format=jpeg|png
    └── Fetch design → get visualization file → Sharp format conversion → stream response

  GET /api/export/design/:id/comparison
    └── Fetch design + room photo → Sharp composite side-by-side → stream response

  GET /api/export/project/:id/pdf
    └── Fetch project + rooms + designs + budget
    └── PDFKit → branded header per page → project info → room sections → budget table
    └── Stream PDF response
    └── Max 50 pages (P3-DC-5)

Frontend Download Flow (authenticated blob):
  1. fetch(url, { headers: { Authorization: 'Bearer token' } })
  2. const blob = await response.blob()
  3. const objectUrl = URL.createObjectURL(blob)
  4. Create <a> element, set href=objectUrl, download=filename, click()
  5. URL.revokeObjectURL(objectUrl)

Registration:
  └── ExportModule registered in AppModule imports array
```

### 3. Design Constraints

- P3-DC-5: Export PDF MUST be generated server-side. Max 50 pages. Branded header on every page. Use authenticated blob download pattern (fetch + Authorization header, not window.open).
- P3-DC-3: All mutation/download actions MUST show Snackbar notification confirming success or explaining failure.
- P3-DC-8: All Phase 1 and Phase 2 constraints remain in effect.
- P3-E4: Rooms with no designs get photos only in the PDF. Skip design sections. Note "No designs yet" in the room section.

### 4. Detailed Design

#### 4a. Database / Schema Changes
- None — all data models exist. Export reads from Design, Visualization, Room, Photo, Project, Budget tables.

#### 4b. Backend / API Changes

**File: `apps/api/src/export/export.module.ts`** (CREATE)
- NestJS module.
- Imports: PrismaModule (for database access), MediaModule or R2Module (for file access).
- Providers: ExportService.
- Controllers: ExportController.

**File: `apps/api/src/export/export.controller.ts`** (CREATE)
- Three GET endpoints, all requiring authentication (JWT guard applies globally).

Endpoint 1: `GET /api/export/design/:id/image`
- Query param: format (enum: 'jpeg' | 'png', default 'png')
- Fetch Design by id (include visualization with imageUrl).
- Verify requesting user has access to the design's project (owner or shared member).
- Read visualization image file from disk/R2.
- Convert via Sharp to requested format.
- Set response headers: Content-Type (image/png or image/jpeg), Content-Disposition: attachment; filename="design-{id}.{format}"
- Stream buffer as response.

Endpoint 2: `GET /api/export/design/:id/comparison`
- Fetch Design by id (include visualization + room with photos).
- Read original room photo and visualization image.
- Use Sharp to create side-by-side composite:
  - Resize both images to same height (max 800px).
  - Create canvas width = img1.width + gap + img2.width.
  - Composite left (original, label "Before") + right (visualization, label "After").
  - Add labels via SVG text overlay.
- Response: Content-Type image/png, Content-Disposition attachment.

Endpoint 3: `GET /api/export/project/:id/pdf`
- Fetch Project by id (include rooms with photos and designs with visualizations, include budget items).
- Verify requesting user has access.
- Generate PDF via PDFKit:
  - Page 1: Branded header (app name, logo placeholder, date), project name, description, status, created date, member count.
  - Room sections: For each room — room name, type, room photos (inline thumbnails). For each design — category badge, visualization thumbnail, created date. If room has no designs: "No designs yet" note (P3-E4).
  - Budget section: Table with budget items (name, category, estimated cost, actual cost). Total row.
  - Footer on each page: page number, "Generated by InteriorScience".
  - Cap at 50 pages — if content exceeds, truncate with "... and X more rooms" note (P3-DC-5).
- Response: Content-Type application/pdf, Content-Disposition attachment; filename="project-{name}.pdf"

**File: `apps/api/src/export/export.service.ts`** (CREATE)
- Methods:
  - `exportDesignImage(designId: string, format: 'jpeg' | 'png'): Promise<{ buffer: Buffer, mimeType: string, filename: string }>`
  - `exportDesignComparison(designId: string): Promise<{ buffer: Buffer, filename: string }>`
  - `exportProjectPdf(projectId: string): Promise<{ buffer: Buffer, filename: string }>`
- Uses PrismaService for data queries.
- Uses Sharp for image manipulation.
- Uses PDFKit for PDF generation. PDFKit doc piped to a PassThrough stream, collected into a buffer.
- Image embedding in PDF: read file, resize to fit PDF page width (max 500px wide), embed via doc.image().

**File: `apps/api/src/app.module.ts`** (MODIFY)
- Add ExportModule to the imports array.

**File: `apps/api/package.json`** (MODIFY)
- Add dependency: pdfkit (and @types/pdfkit as devDependency).

#### 4c. Frontend / UI Changes

**File: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx`** (MODIFY)
- Add export action buttons to the design detail page:
  - "Download Image" dropdown: PNG / JPEG options.
  - "Download Comparison" button: before/after side-by-side.
- Use authenticated blob download utility.

**File: `apps/web/app/(main)/projects/[id]/page.tsx`** (MODIFY)
- Add "Export PDF" button to the project detail page.
- Shows CircularProgress while generating (PDF can take a few seconds).
- On success: triggers download + Snackbar "PDF downloaded successfully".
- On error: Snackbar with error message.

**File: `apps/web/lib/download-blob.ts`** (CREATE)
- Utility function for authenticated blob downloads:

```ts
export async function downloadBlob(url: string, filename: string, token: string): Promise<void> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}
```

#### 4d. Shared / Cross-cutting Changes
- pdfkit is a backend-only dependency (apps/api).
- Sharp is already installed in apps/api.
- The download-blob.ts utility is reusable across any future download feature.
- ExportModule must be registered in AppModule for routes to be discoverable.

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| CREATE | apps/api/src/export/export.module.ts | NestJS module registration | Low |
| CREATE | apps/api/src/export/export.controller.ts | Three GET export endpoints | Med |
| CREATE | apps/api/src/export/export.service.ts | Sharp image processing + PDFKit PDF generation | High |
| MODIFY | apps/api/src/app.module.ts | Register ExportModule in imports | Low |
| MODIFY | apps/api/package.json | Add pdfkit dependency | Low |
| CREATE | apps/web/lib/download-blob.ts | Authenticated blob download utility | Low |
| MODIFY | apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx | Add export buttons (image, comparison) | Med |
| MODIFY | apps/web/app/(main)/projects/[id]/page.tsx | Add "Export PDF" button | Med |

### 6. Dependency & Reference Check

#### Backend Wiring
- ExportModule must be added to AppModule imports — otherwise routes will not be registered.
- ExportService needs PrismaService (via PrismaModule) for database queries.
- ExportService reads files from disk (uploads/ directory) or via R2 module. Must resolve file paths from Visualization.imageUrl and Photo.originalUrl fields.
- pdfkit must be installed in apps/api: `pnpm add pdfkit` and `pnpm add -D @types/pdfkit`.
- Sharp is already available in apps/api.
- JWT auth guard applies globally — export endpoints are protected automatically.

#### Frontend Wiring
- download-blob.ts needs the auth token from useAuth() context or localStorage.
- Design detail page already fetches design data — export buttons use the same design ID.
- Project detail page already fetches project data — PDF button uses the same project ID.
- apiClient base URL construction uses window.location.hostname (existing pattern).

#### Data Access
- Design includes Visualization (with imageUrl) and belongs to Room (with Photos).
- Project includes Rooms, Designs, BudgetItems.
- All relations already defined in Prisma schema.

### 7. Implementation Plan

**Step 1:** Install pdfkit
- File: apps/api/package.json
- Action: modify
- Details: Add pdfkit to dependencies, @types/pdfkit to devDependencies. Run pnpm install.

**Step 2:** Create ExportService
- File: apps/api/src/export/export.service.ts
- Action: create
- Details: Three methods — exportDesignImage (Sharp format conversion), exportDesignComparison (Sharp side-by-side composite with labels), exportProjectPdf (PDFKit document generation with branded header, room sections, budget table, 50-page cap).

**Step 3:** Create ExportController
- File: apps/api/src/export/export.controller.ts
- Action: create
- Details: Three GET endpoints. Validate design/project access. Call service methods. Set Content-Type and Content-Disposition headers. Stream response buffer.

**Step 4:** Create ExportModule
- File: apps/api/src/export/export.module.ts
- Action: create
- Details: NestJS module importing PrismaModule, providing ExportService, declaring ExportController.

**Step 5:** Register ExportModule in AppModule
- File: apps/api/src/app.module.ts
- Action: modify
- Details: Add ExportModule to imports array.

**Step 6:** Create download-blob utility
- File: apps/web/lib/download-blob.ts
- Action: create
- Details: Authenticated blob download function (fetch + Authorization + createObjectURL + click + revoke).

**Step 7:** Add export buttons to design detail page
- File: apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx
- Action: modify
- Details: Add "Download Image" (PNG/JPEG dropdown) and "Download Comparison" buttons. Wire to downloadBlob utility. Show Snackbar on success/failure.

**Step 8:** Add PDF export button to project detail page
- File: apps/web/app/(main)/projects/[id]/page.tsx
- Action: modify
- Details: Add "Export PDF" button with loading state (CircularProgress). Wire to downloadBlob utility. Snackbar on success/failure.

### 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| PDFKit generating huge PDFs for large projects | Med | P3-DC-5: 50-page hard cap. Truncate with "... and X more rooms" note. Monitor generation time. |
| PDFKit memory usage for image-heavy PDFs | Med | Resize all images to max 500px wide before embedding. Stream PDF generation. |
| Visualization file not found on disk (deleted or moved) | Med | Check file existence before processing. Return 404 with clear error message if missing. |
| CORS issues with blob download on mobile browsers | Med | Authenticated fetch avoids CORS issues (same-origin API). Blob download pattern works cross-browser. |
| Slow PDF generation blocks API thread | Med | PDF generation is CPU-bound but typically < 5s for 50 pages. Acceptable for synchronous. Could move to queue in future. |
| Side-by-side comparison with mismatched image aspect ratios | Low | Normalize both images to same height before compositing. Pad with white if needed. |
| Android Chrome download behavior inconsistency | Low | Use standard <a download> pattern which works on modern Android Chrome. Test on real device. |
| ExportModule not registered — routes silently missing | Low | Verification step: hit /api/export/ endpoint and confirm 200/401 (not 404). |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests
- ExportService.exportDesignImage returns buffer in requested format (PNG)
- ExportService.exportDesignImage returns buffer in requested format (JPEG)
- ExportService.exportDesignImage throws NotFoundException for invalid design ID
- ExportService.exportDesignComparison returns PNG buffer with correct dimensions (wider than single image)
- ExportService.exportProjectPdf returns valid PDF buffer (starts with %PDF header)
- ExportService.exportProjectPdf includes room with no designs — "No designs yet" text present (P3-E4)
- ExportService.exportProjectPdf caps at 50 pages
- downloadBlob utility creates and clicks download link
- downloadBlob utility revokes object URL after download

#### 9b. Integration Tests
- GET /api/export/design/:id/image?format=png returns 200 with Content-Type image/png
- GET /api/export/design/:id/image?format=jpeg returns 200 with Content-Type image/jpeg
- GET /api/export/design/:id/image with invalid ID returns 404
- GET /api/export/design/:id/image without auth returns 401
- GET /api/export/design/:id/comparison returns 200 with Content-Type image/png
- GET /api/export/design/:id/comparison returns side-by-side image wider than original
- GET /api/export/project/:id/pdf returns 200 with Content-Type application/pdf
- GET /api/export/project/:id/pdf with no rooms returns PDF with project info only
- GET /api/export/project/:id/pdf returns Content-Disposition with project name in filename
- Unauthorized user cannot export another user's design or project (403)

#### 9c. E2E UI Automation Tests
- Design detail page shows "Download Image" and "Download Comparison" buttons
- Click "Download Image" -> PNG -> file downloads with correct name
- Click "Download Comparison" -> composite image downloads
- Project detail page shows "Export PDF" button
- Click "Export PDF" -> loading spinner appears -> PDF downloads
- Snackbar shows "Downloaded successfully" after export
- On export error (e.g., network failure) -> Snackbar shows error message
- Export buttons work on mobile viewport (Android Chrome emulation)

### 10. Verification Criteria
- [ ] pdfkit installed in apps/api without errors
- [ ] ExportModule registered in AppModule
- [ ] GET /api/export/design/:id/image?format=png returns a valid PNG image
- [ ] GET /api/export/design/:id/image?format=jpeg returns a valid JPEG image
- [ ] GET /api/export/design/:id/comparison returns a side-by-side composite PNG
- [ ] Comparison image has "Before" and "After" labels
- [ ] GET /api/export/project/:id/pdf returns a valid PDF document
- [ ] PDF has branded header on every page
- [ ] PDF includes project info section (name, description, status)
- [ ] PDF includes room sections with photos
- [ ] PDF includes design visualizations in room sections
- [ ] PDF includes budget summary table (if budget items exist)
- [ ] Rooms with no designs show "No designs yet" in PDF (P3-E4)
- [ ] PDF capped at 50 pages with truncation note (P3-DC-5)
- [ ] All export endpoints return 401 without authentication
- [ ] Unauthorized users get 403 for other users' designs/projects
- [ ] Design detail page has export buttons (Download Image, Download Comparison)
- [ ] Project detail page has "Export PDF" button
- [ ] Downloads use authenticated blob pattern (not window.open)
- [ ] Snackbar feedback on successful download (P3-DC-3)
- [ ] Snackbar feedback on failed download (P3-DC-3)
- [ ] Export works on mobile viewport
