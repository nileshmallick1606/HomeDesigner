# SPEC-027 — PDF Export + Download UI

**Parent Feature:** Export UI + Snackbar Wiring, Spec 027 of 028 (1 of 2)
**Spec Number:** 027
**Prerequisites:** None
**BRD Features:** ES-F1 (PDF generation), ES-F2 (download buttons)

## Status: Not Started

### 1. Objective

Implement server-side PDF project summary generation via PDFKit and add download buttons across the design detail and project detail pages, using an authenticated blob-download pattern. This completes the export pipeline that currently has backend image/comparison export endpoints but no PDF endpoint and no frontend download UI.

- **Before:** The backend has `GET /api/export/design/:id/image` and `GET /api/export/design/:id/comparison` endpoints but zero download buttons in the UI. No PDF export exists. Users cannot download any artifacts from the application.
- **After:** A branded multi-page PDF can be generated and streamed for any project via `GET /api/export/project/:id/pdf`. The design detail page has "Download Image" and "Download Comparison" buttons. The project detail page has an "Export PDF" button. All downloads use authenticated fetch with blob URL pattern and show loading state during download.
- **Success criteria:** (1) PDF endpoint returns a valid PDF with branded header, project info, room sections with photo/visualization thumbnails, and budget tables. (2) PDF caps at 50 pages with truncation notice. (3) Design page download buttons fetch and trigger browser download for image and comparison. (4) Project page Export PDF button fetches and triggers browser download. (5) All buttons show CircularProgress while downloading and are disabled during the operation. (6) Downloads use Bearer token authentication, not window.open.

### 2. Architecture

```
apps/api/
├── src/
│   └── export/
│       ├── export.service.ts              (MODIFY — add exportProjectPdf method)
│       └── export.controller.ts           (MODIFY — add GET /project/:projectId/pdf endpoint)

apps/web/
├── lib/
│   └── download.ts                        (CREATE — reusable downloadBlob helper)
├── app/(main)/projects/[id]/
│   └── page.tsx                           (MODIFY — add Export PDF button)
└── app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/
    └── page.tsx                           (MODIFY — add Download Image + Download Comparison buttons)
```

**Data flow:**

```
Frontend: user clicks "Export PDF"
  → downloadBlob(`/api/export/project/${projectId}/pdf`, `project-${name}.pdf`)
    → fetch(url, { Authorization: Bearer token })
    → ExportController.exportProjectPdf(projectId)
      → ExportService.exportProjectPdf(projectId)
        → Prisma: fetch project + rooms + photos + visualizations + budget items
        → PDFKit: build multi-page document
          - Page 1: branded header + project metadata
          - Per room: name/type, photo thumbnail (Sharp 400px), visualization thumbnail, budget table
        → Stream PDF response (Content-Type: application/pdf)
    → Frontend receives blob → createObjectURL → trigger <a>.click() download
    → revokeObjectURL

Frontend: user clicks "Download Image" / "Download Comparison"
  → downloadBlob(`/api/export/design/${designId}/image?format=jpeg`, `design-${designId}.jpg`)
  → Existing ExportController endpoints return buffer
  → Same blob download pattern
```

### 3. Design Constraints

| ID | Constraint | Implementation |
|----|-----------|----------------|
| ES-DC-1 | PDF must be generated server-side via PDFKit. Max 50 pages. | `exportProjectPdf()` uses `require('pdfkit')` to build the document. A page counter tracks total pages; once 50 is reached, a final "Document truncated" page is appended and generation stops. |
| ES-DC-2 | Downloads MUST use authenticated fetch + blob pattern (not window.open). | `downloadBlob()` reads `localStorage.getItem('interior_science_token')` and attaches `Authorization: Bearer` header. Response is consumed as blob, converted to object URL, triggered via hidden `<a>` element click. |
| ES-DC-5 | Download buttons show CircularProgress while generating. Disabled during download. | Each button has a `downloading` state boolean. While true, button shows `<CircularProgress size={20} />` and is `disabled`. State resets on completion or error. |

### 4. Detailed Design

#### 4a. Database / Schema Changes

No schema changes. All data needed for PDF generation already exists:
- `Project` — name, description, status, createdAt
- `Room` — name, type
- `RoomPhoto` — originalUrl (for thumbnail)
- `Design` + `Visualization` — imageUrl (for visualization thumbnail)
- `BudgetItem` — name, quantity, unitPrice, totalPrice, category

#### 4b. Backend / API Changes

**File: `apps/api/src/export/export.service.ts`** (MODIFY)

Add `exportProjectPdf(projectId: string)` method:

```typescript
async exportProjectPdf(projectId: string): Promise<NodeJS.ReadableStream> {
  const project = await this.prisma.project.findUnique({
    where: { id: projectId },
    include: {
      rooms: {
        include: {
          photos: { orderBy: { createdAt: 'desc' }, take: 1 },
          designs: {
            include: {
              visualizations: {
                where: { status: 'COMPLETED' },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          budgetItems: true,
        },
      },
    },
  });
  if (!project) throw new NotFoundException('Project not found');

  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  let pageCount = 1;
  const MAX_PAGES = 50;

  // --- Page 1: Branded Header + Project Info ---
  // Blue bar across top
  doc.rect(0, 0, doc.page.width, 80).fill('#1976d2');
  doc.fillColor('#ffffff').fontSize(28).text('InteriorScience', 50, 25);
  doc.fillColor('#333333');
  doc.moveDown(3);
  doc.fontSize(22).text(project.name);
  doc.moveDown(0.5);
  if (project.description) {
    doc.fontSize(12).fillColor('#666666').text(project.description);
  }
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333333')
    .text(`Status: ${project.status}`)
    .text(`Created: ${project.createdAt.toLocaleDateString()}`)
    .text(`Rooms: ${project.rooms.length}`);
  // Budget summary if available
  const allBudgetItems = project.rooms.flatMap(r => r.budgetItems);
  if (allBudgetItems.length > 0) {
    const totalBudget = allBudgetItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    doc.text(`Total Budget: $${totalBudget.toFixed(2)}`);
  }

  // --- Per Room Sections ---
  let roomsRendered = 0;
  for (const room of project.rooms) {
    if (pageCount >= MAX_PAGES) break;

    doc.addPage();
    pageCount++;

    // Room header
    doc.fontSize(18).fillColor('#1976d2').text(`${room.name}`);
    doc.fontSize(12).fillColor('#666666').text(`Type: ${room.type}`);
    doc.moveDown(1);

    // Photo thumbnail
    const photo = room.photos[0];
    if (photo?.originalUrl) {
      try {
        const photoKey = photo.originalUrl.replace(/^(https?:\/\/[^/]+)?\/api\/media\/files\//, '');
        const photoBuf = await this.r2.download(photoKey);
        const thumbnail = await sharp(photoBuf).resize(400).jpeg({ quality: 80 }).toBuffer();
        doc.image(thumbnail, { width: 400 });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#999999').text('Room Photo');
      } catch {
        doc.fontSize(11).fillColor('#999999').text('Photo unavailable');
      }
    } else {
      doc.fontSize(11).fillColor('#999999').text('No photos uploaded yet');
    }

    doc.moveDown(1);

    // Latest visualization thumbnail
    const latestDesign = room.designs[0];
    const viz = latestDesign?.visualizations[0];
    if (viz?.imageUrl) {
      if (pageCount >= MAX_PAGES) break;
      try {
        const vizKey = viz.imageUrl.replace(/^\/api\/media\/files\//, '');
        const vizBuf = await this.r2.download(vizKey);
        const vizThumb = await sharp(vizBuf).resize(400).jpeg({ quality: 80 }).toBuffer();
        // Check if we need a new page (if current Y position is too low)
        if (doc.y > 500) {
          doc.addPage();
          pageCount++;
        }
        doc.image(vizThumb, { width: 400 });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#999999').text('Latest Design Visualization');
      } catch {
        doc.fontSize(11).fillColor('#999999').text('Visualization unavailable');
      }
    }

    doc.moveDown(1);

    // Budget items table
    const budgetItems = room.budgetItems;
    if (budgetItems.length > 0) {
      if (doc.y > 600) {
        doc.addPage();
        pageCount++;
        if (pageCount >= MAX_PAGES) break;
      }
      doc.fontSize(14).fillColor('#333333').text('Budget Items');
      doc.moveDown(0.5);
      // Table header
      doc.fontSize(10).fillColor('#666666');
      doc.text('Item', 50, doc.y, { width: 200, continued: false });
      for (const item of budgetItems) {
        const price = item.totalPrice != null ? `$${Number(item.totalPrice).toFixed(2)}` : '-';
        doc.fontSize(10).fillColor('#333333')
          .text(`${item.name}  —  ${price}`);
      }
    }

    roomsRendered++;
  }

  // Truncation notice
  if (roomsRendered < project.rooms.length) {
    doc.addPage();
    doc.fontSize(16).fillColor('#d32f2f').text('Document Truncated');
    doc.moveDown(1);
    doc.fontSize(12).fillColor('#666666')
      .text(`${project.rooms.length - roomsRendered} room(s) omitted due to page limit (${MAX_PAGES} pages).`);
  }

  doc.end();
  return doc; // PDFKit document is a readable stream
}
```

**File: `apps/api/src/export/export.controller.ts`** (MODIFY)

Add endpoint:

```typescript
@Get('project/:projectId/pdf')
@ApiOperation({ summary: 'Download project summary as PDF' })
async exportProjectPdf(
  @Param('projectId', ParseUUIDPipe) projectId: string,
  @Res() res: Response,
) {
  const pdfStream = await this.exportService.exportProjectPdf(projectId);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=project-${projectId}.pdf`);
  pdfStream.pipe(res);
}
```

#### 4c. Frontend / UI Changes

**File: `apps/web/lib/download.ts`** (CREATE)

Reusable authenticated blob download helper:

```typescript
export async function downloadBlob(url: string, filename: string): Promise<void> {
  const token = localStorage.getItem('interior_science_token');
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objUrl);
}
```

**File: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx`** (MODIFY)

Add two download buttons below the existing design view:

New imports:
```typescript
import { downloadBlob } from '@/lib/download';
import CircularProgress from '@mui/material/CircularProgress';
```

New state:
```typescript
const [downloadingImage, setDownloadingImage] = useState(false);
const [downloadingComparison, setDownloadingComparison] = useState(false);
```

Handlers:
```typescript
const handleDownloadImage = async () => {
  setDownloadingImage(true);
  try {
    await downloadBlob(
      `http://${window.location.hostname}:4000/api/export/design/${designId}/image?format=jpeg`,
      `design-${designId}.jpg`,
    );
  } catch (err: any) {
    console.error('Download failed', err);
  } finally {
    setDownloadingImage(false);
  }
};

const handleDownloadComparison = async () => {
  setDownloadingComparison(true);
  try {
    await downloadBlob(
      `http://${window.location.hostname}:4000/api/export/design/${designId}/comparison`,
      `comparison-${designId}.jpg`,
    );
  } catch (err: any) {
    console.error('Download failed', err);
  } finally {
    setDownloadingComparison(false);
  }
};
```

UI (placed below the design image/details area):
```tsx
<Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
  <Button
    variant="outlined"
    onClick={handleDownloadImage}
    disabled={downloadingImage}
    startIcon={downloadingImage ? <CircularProgress size={20} /> : <DownloadIcon />}
  >
    Download Image
  </Button>
  <Button
    variant="outlined"
    onClick={handleDownloadComparison}
    disabled={downloadingComparison}
    startIcon={downloadingComparison ? <CircularProgress size={20} /> : <DownloadIcon />}
  >
    Download Comparison
  </Button>
</Box>
```

**File: `apps/web/app/(main)/projects/[id]/page.tsx`** (MODIFY)

Add Export PDF button in the project header area:

New imports:
```typescript
import { downloadBlob } from '@/lib/download';
import CircularProgress from '@mui/material/CircularProgress';
```

New state:
```typescript
const [exportingPdf, setExportingPdf] = useState(false);
```

Handler:
```typescript
const handleExportPdf = async () => {
  setExportingPdf(true);
  try {
    const safeName = project.name.replace(/[^a-zA-Z0-9-_]/g, '_');
    await downloadBlob(
      `http://${window.location.hostname}:4000/api/export/project/${project.id}/pdf`,
      `project-${safeName}.pdf`,
    );
  } catch (err: any) {
    console.error('Export failed', err);
  } finally {
    setExportingPdf(false);
  }
};
```

UI (placed next to project title / header actions):
```tsx
<Button
  variant="outlined"
  onClick={handleExportPdf}
  disabled={exportingPdf}
  startIcon={exportingPdf ? <CircularProgress size={20} /> : <PictureAsPdfIcon />}
>
  Export PDF
</Button>
```

#### 4d. Shared / Cross-cutting Changes

**Download URL construction:** All download URLs use `http://${window.location.hostname}:4000` to construct the API URL. This follows the existing pattern used throughout the frontend (e.g., in visualization polling). In production this would be replaced with a proper API base URL.

**Error handling:** Download failures are caught and logged. SPEC-028 (Snackbar Wiring) will later add `enqueueSnackbar` calls to these catch blocks. For now, errors are silent to the user beyond the button returning to its non-loading state.

**Authentication:** The `downloadBlob` helper reads the token from `localStorage` using the key `interior_science_token`, consistent with how `api-client.ts` stores the auth token throughout the app.

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| MODIFY | apps/api/src/export/export.service.ts | Add `exportProjectPdf()` method: Prisma fetch, PDFKit document construction, Sharp thumbnail generation, stream return | Med |
| MODIFY | apps/api/src/export/export.controller.ts | Add `GET /project/:projectId/pdf` endpoint that streams PDF response | Low |
| CREATE | apps/web/lib/download.ts | Reusable `downloadBlob(url, filename)` function with auth header + blob URL pattern | Low |
| MODIFY | apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx | Add "Download Image" and "Download Comparison" buttons with loading states | Low |
| MODIFY | apps/web/app/(main)/projects/[id]/page.tsx | Add "Export PDF" button with loading state | Low |

### 6. Dependency & Reference Check

#### External Dependencies

| Dependency | Status | Used By |
|-----------|--------|---------|
| pdfkit | Already installed in apps/api/package.json | export.service.ts — `require('pdfkit')` |
| sharp | Already installed and used in export.service.ts | Thumbnail generation for PDF |
| notistack | Already installed in apps/web (not used in this spec, but download buttons are snackbar-ready for SPEC-028) | N/A |

No new npm packages needed.

#### Internal Dependencies
- `export.service.ts` already imports `PrismaService` and `R2Service` — no new injections needed.
- `export.controller.ts` already imports `ExportService` — just adds a new endpoint method.
- `download.ts` is a new standalone utility with no internal imports. Consumed by two page components.
- The design detail page and project detail page already exist and are functional. Modifications add buttons without changing existing functionality.

#### Backward Compatibility
- New GET endpoint `/project/:projectId/pdf` does not conflict with existing `/design/:designId/image` or `/design/:designId/comparison` routes.
- `downloadBlob` is additive — no existing code is modified, only new imports and button additions.
- If `interior_science_token` is not in localStorage, `downloadBlob` still makes the request (without auth header), allowing the server to return 401 naturally.

### 7. Implementation Plan

**Step 1:** Create download helper
- File: apps/web/lib/download.ts
- Action: CREATE — implement `downloadBlob(url, filename)` with auth header, blob pattern, and object URL cleanup

**Step 2:** Add `exportProjectPdf()` to export service
- File: apps/api/src/export/export.service.ts
- Action: MODIFY — add the method with Prisma query, PDFKit document construction (branded header, room sections with Sharp thumbnails, budget tables), 50-page cap with truncation notice, return as readable stream

**Step 3:** Add PDF endpoint to export controller
- File: apps/api/src/export/export.controller.ts
- Action: MODIFY — add `GET /project/:projectId/pdf` that calls `exportProjectPdf()`, sets Content-Type and Content-Disposition headers, pipes stream to response

**Step 4:** Add download buttons to design detail page
- File: apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx
- Action: MODIFY — import `downloadBlob`, add `downloadingImage`/`downloadingComparison` state, add two Button components with CircularProgress loading indicators

**Step 5:** Add Export PDF button to project detail page
- File: apps/web/app/(main)/projects/[id]/page.tsx
- Action: MODIFY — import `downloadBlob`, add `exportingPdf` state, add Button with CircularProgress loading indicator, sanitize project name for filename

**Step 6:** Manual verification
- Generate PDF for a project with multiple rooms, photos, and designs
- Verify branded header, room sections, thumbnails, budget tables
- Verify download buttons trigger browser save dialog
- Verify loading states appear and disappear correctly
- Test with empty project (no rooms) and room with no photos

### 8. Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|-----------|
| PDFKit generates corrupted PDF for large projects | Med | Low | 50-page cap limits document size. Stream-based generation avoids memory issues. Test with 10+ room project. |
| Photo/visualization download fails during PDF generation (R2 timeout or missing key) | Med | Med | Each photo/viz embed is wrapped in try/catch. On failure, renders "Photo unavailable" or "Visualization unavailable" text instead of crashing the entire PDF. |
| Sharp resize fails on unusual image formats or corrupted images | Med | Low | try/catch around each Sharp operation. Fallback to text placeholder. Sharp already handles JPEG/PNG/WebP which covers all uploaded formats. |
| PDF stream pipe errors (client disconnects mid-download) | Low | Low | Express handles broken pipe gracefully. No server crash. Client sees incomplete download. |
| Download blob pattern fails on Safari or mobile browsers | Med | Low | The `<a>.click()` + `createObjectURL` pattern is supported in all modern browsers including Safari 14+. No IE11 support needed. |
| Auth token missing or expired during download | Low | Med | `downloadBlob` throws on non-OK response. Frontend catch block handles it. SPEC-028 will add user-visible error snackbar. |
| Large PDF generation blocks the event loop | Med | Low | PDFKit uses streams internally — no synchronous blocking. Sharp operations are async and use native bindings. Only risk is many sequential R2 downloads; mitigated by `take: 1` on photos/visualizations per room. |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests

**export.service.ts — exportProjectPdf:**
- Project with 1 room, 1 photo, 1 visualization → returns readable stream, stream produces valid PDF bytes (starts with `%PDF`)
- Project with no rooms → PDF contains only header page (project info)
- Room with no photos → PDF section contains "No photos uploaded yet" text
- Room with no visualizations → PDF section has photo but no visualization image
- Room with no budget items → PDF section omits budget table
- Project with 50+ rooms → PDF is capped at 50 pages, final page contains "Document truncated"
- Project not found → throws NotFoundException
- Photo download fails (R2 error) → PDF still generates with "Photo unavailable" text
- Visualization download fails → PDF still generates with "Visualization unavailable" text

**download.ts — downloadBlob:**
- Calls fetch with Authorization header when token exists in localStorage
- Calls fetch without Authorization header when token is null
- Throws Error when response is not ok (status 404, 500)
- Creates blob URL, triggers anchor click, revokes URL (mock DOM methods)

#### 9b. Integration Tests

- `GET /api/export/project/:id/pdf` with valid project → 200, Content-Type: application/pdf, Content-Disposition header present
- `GET /api/export/project/:id/pdf` with non-existent project → 404
- `GET /api/export/project/:id/pdf` with invalid UUID → 400 (ParseUUIDPipe)
- PDF response body starts with `%PDF-` magic bytes
- PDF response for project with 3 rooms contains multiple pages (verify via pdf-parse or similar)
- Existing endpoints still work: `GET /api/export/design/:id/image` returns image buffer unchanged
- Existing endpoints still work: `GET /api/export/design/:id/comparison` returns comparison buffer unchanged

#### 9c. E2E / UI Tests

- Design detail page: "Download Image" button is visible and enabled
- Design detail page: click "Download Image" → button shows CircularProgress, becomes disabled → download completes → button returns to normal
- Design detail page: "Download Comparison" button triggers comparison download
- Project detail page: "Export PDF" button is visible
- Project detail page: click "Export PDF" → loading state → PDF downloads with `project-{name}.pdf` filename
- Download with expired/missing token: fetch returns 401, button returns to normal state (no crash)
- Simultaneous downloads: clicking both design download buttons → both show loading independently
- PDF content verification: open downloaded PDF, verify branded header "InteriorScience" is present, project name is present, room sections visible

### 10. Verification Criteria

- [ ] `exportProjectPdf()` method exists in `export.service.ts`
- [ ] Method fetches project with rooms, photos, designs (visualizations), and budget items via Prisma
- [ ] PDFKit document created with A4 size, 50-margin
- [ ] Page 1 has blue branded header bar with "InteriorScience" title
- [ ] Page 1 shows project name, description, status, created date, room count
- [ ] Page 1 shows total budget summary if budget items exist
- [ ] Each room gets its own section starting on a new page
- [ ] Room section shows room name and type
- [ ] Room photo is resized to 400px width via Sharp and embedded as thumbnail
- [ ] If room has no photos, text reads "No photos uploaded yet"
- [ ] Latest visualization thumbnail embedded if exists
- [ ] Budget items rendered as list with item name and price
- [ ] Page count capped at 50 — truncation page added if exceeded
- [ ] Truncation page shows count of omitted rooms
- [ ] PDF returned as readable stream, piped to Express response
- [ ] `GET /api/export/project/:projectId/pdf` endpoint exists in controller
- [ ] Response headers: Content-Type application/pdf, Content-Disposition attachment
- [ ] `downloadBlob()` utility created in `apps/web/lib/download.ts`
- [ ] `downloadBlob` reads `interior_science_token` from localStorage
- [ ] `downloadBlob` attaches Bearer token to fetch Authorization header
- [ ] `downloadBlob` creates blob URL, triggers `<a>` click download, revokes URL
- [ ] `downloadBlob` throws on non-OK response
- [ ] Design detail page has "Download Image" button
- [ ] Design detail page has "Download Comparison" button
- [ ] Both design buttons show CircularProgress while downloading
- [ ] Both design buttons are disabled while downloading
- [ ] Project detail page has "Export PDF" button
- [ ] Export PDF button shows CircularProgress while generating
- [ ] Export PDF button is disabled while generating
- [ ] Project name sanitized for filename (non-alphanumeric chars replaced with underscore)
- [ ] `pnpm typecheck` passes in both apps/api and apps/web
- [ ] All existing export endpoints (`/design/:id/image`, `/design/:id/comparison`) continue to work unchanged
- [ ] No new npm dependencies required
