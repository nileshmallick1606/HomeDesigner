# Technical Requirements Document — Export UI + Snackbar Wiring

## 1. Summary

Two frontend-heavy features: (1) PDF generation backend + download buttons across UI, (2) wire notistack snackbar to all mutation actions. Both build on existing infrastructure.

## 2. Existing Infrastructure

| Component | Status |
|-----------|--------|
| ExportModule (NestJS) | Registered in AppModule |
| ExportService | image + comparison methods working |
| ExportController | GET /design/:id/image + /comparison endpoints |
| PDFKit | Installed in apps/api/package.json |
| notistack | Installed in apps/web/package.json |
| AppSnackbarProvider | Wraps root layout |
| useSnackbar() | NOT used anywhere |

## 3. Architecture

### PDF Generation
```
GET /api/export/project/:id/pdf
  → ExportService.exportProjectPdf(projectId)
    → Fetch project + rooms + photos + designs + budget from Prisma
    → Create PDFKit document
    → Page 1: Branded header + project info
    → Per room (max 2 pages each):
      - Room name + type
      - Photo thumbnail (Sharp resize to 400px width)
      - Latest visualization thumbnail (if exists)
      - Budget items table
    → Stream PDF to response
    → Content-Type: application/pdf
    → Content-Disposition: attachment; filename=project-{name}.pdf
```

### Download Pattern (Frontend)
```
User clicks "Download" button
  → Show loading spinner on button
  → fetch(url, { headers: { Authorization: Bearer token } })
  → Get blob from response
  → Create object URL → trigger download via <a> element
  → Revoke object URL
  → Show snackbar "Downloaded!"
  → On error: show snackbar "Download failed"
```

### Snackbar Pattern
```
Every mutation component:
  import { useSnackbar } from 'notistack';
  const { enqueueSnackbar } = useSnackbar();

  try {
    await apiClient.fetch(...);
    enqueueSnackbar('Success message', { variant: 'success' });
  } catch (err) {
    enqueueSnackbar(err.message || 'Failed', { variant: 'error' });
  }
```

## 4. Design Constraints

- ES-DC-1: PDF must be generated server-side via PDFKit. Max 50 pages.
- ES-DC-2: Downloads MUST use authenticated fetch + blob pattern (not window.open which loses Bearer token).
- ES-DC-3: Snackbars auto-dismiss after 4 seconds for success, persist until dismissed for errors.
- ES-DC-4: Max 3 snackbars stacked (already configured in AppSnackbarProvider).
- ES-DC-5: Download buttons show CircularProgress while generating. Disabled during download.
- ES-DC-6: All existing constraints remain in effect.

## 5. Edge Cases

| # | Question | Decision |
|---|----------|----------|
| ES-E1 | Project has no rooms? | PDF shows only project info page. No room sections. |
| ES-E2 | Room has no photos or designs? | Include room in PDF with name/type only. Note "No photos yet." |
| ES-E3 | Photo URL is full URL vs relative? | ExportService strips both `http://host/api/media/files/` and `/api/media/files/` before downloading |
| ES-E4 | PDF too large (>50 pages)? | Truncate rooms. Add final page: "Document truncated. N rooms omitted." |
| ES-E5 | Multiple snackbars fire at once? | notistack stacks up to 3, dismisses oldest. Already configured. |
| ES-E6 | Snackbar shows while navigating away? | notistack handles cleanup automatically. No action needed. |

## 6. Files to Create/Modify

### Backend (PDF)
- MODIFY: `apps/api/src/export/export.service.ts` — add `exportProjectPdf()` method
- MODIFY: `apps/api/src/export/export.controller.ts` — add `GET /project/:id/pdf` endpoint

### Frontend (Download Buttons)
- CREATE: `apps/web/lib/download.ts` — reusable `downloadBlob(url, filename)` helper
- MODIFY: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx` — add download buttons
- MODIFY: `apps/web/app/(main)/projects/[id]/page.tsx` — add "Export PDF" button

### Frontend (Snackbar Wiring — 12+ files)
- MODIFY: `apps/web/app/(main)/projects/new/page.tsx`
- MODIFY: `apps/web/app/(main)/projects/[id]/rooms/new/page.tsx`
- MODIFY: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx`
- MODIFY: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx`
- MODIFY: `apps/web/app/(main)/profile/page.tsx`
- MODIFY: `apps/web/app/(main)/library/page.tsx`
- MODIFY: `apps/web/components/media/photo-upload.tsx`
- MODIFY: `apps/web/components/media/photo-gallery.tsx`
- MODIFY: `apps/web/components/budget/budget-editor.tsx`
- MODIFY: `apps/web/components/sharing/share-dialog.tsx`
- MODIFY: `apps/web/components/comments/comments-panel.tsx`
- MODIFY: `apps/web/components/editor/canvas-editor.tsx`

## 7. Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| PDFKit generates corrupted PDF for large projects | Low | Medium | Test with 10+ room project. Stream generation. 50-page cap. |
| Photo download fails during PDF generation | Medium | Medium | Try/catch per photo. Skip missing photos with placeholder text. |
| Snackbar wiring introduces regressions | Low | Low | Each change is 2-3 lines (import + enqueueSnackbar). No logic changes. |
