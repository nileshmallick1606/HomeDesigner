# Business Requirements Document — Export UI + Snackbar Wiring

## 1. Executive Summary

Two high-impact polish features to close critical MVP gaps:
1. **Export UI + PDF** — Add download buttons to design and project pages, implement PDF project summary generation
2. **Snackbar Wiring** — Connect the existing notistack SnackbarProvider to all 15+ mutation actions across the app

Both features have backend/infrastructure ready but lack frontend wiring.

## 2. Current State

### Export
- **Backend exists:** `GET /api/export/design/:id/image` (JPEG/PNG) and `GET /api/export/design/:id/comparison` (before/after composite)
- **PDF endpoint:** Missing — no `GET /api/export/project/:id/pdf`
- **Frontend buttons:** Missing — no download buttons anywhere in the UI
- **PDFKit:** Installed in package.json but no generation code written

### Snackbar
- **notistack:** Installed, `AppSnackbarProvider` wraps root layout
- **useSnackbar():** Not imported in ANY component
- **Current feedback:** Some pages use inline `<Alert>` (profile name save), most mutations have NO feedback (silent success/error)

## 3. Feature Requirements

### ES-F1: PDF Project Summary Export
**Priority:** P0
**Description:** Generate a branded PDF summarizing a project: header, project info, rooms with photos and design visualizations, budget summary.
**Acceptance Criteria:**
- `GET /api/export/project/:id/pdf` returns a downloadable PDF
- PDF includes: InteriorScience branded header, project name/description/status/budget, for each room: name/type + first photo + latest visualization (if any) + budget items
- Maximum 50 pages (truncate with warning)
- Streamed response with Content-Disposition: attachment header

### ES-F2: Export UI Buttons
**Priority:** P0
**Description:** Add download buttons on design detail page and project detail page.
**Acceptance Criteria:**
- Design detail page: "Download Image" button (JPEG) + "Download Comparison" button (before/after)
- Project detail page: "Export PDF" button
- All downloads use authenticated fetch (Bearer token) + blob download pattern (not window.open)
- Show loading state while generating
- Show snackbar on success ("Downloaded!") or error

### ES-F3: Snackbar Wiring for All Mutations
**Priority:** P0
**Description:** Add success/error toast notifications via notistack to every user action that creates, updates, or deletes data.
**Acceptance Criteria:**
- Every mutation shows a snackbar on success (green, 3-4s auto-dismiss)
- Every mutation shows a snackbar on error (red, persists until dismissed)
- Mutations to wire (15+):

| Page | Action | Success Message |
|------|--------|----------------|
| New Project | Create | "Project created!" |
| Add Room | Create | "Room added!" |
| Room Detail | Upload photo | "Photo uploaded!" |
| Room Detail | Delete photo | "Photo deleted" |
| Room Detail | Generate visualization | "Visualization started!" |
| Room Detail | Detect elements | "Detection started!" |
| Room Detail | Add budget item | "Budget item added" |
| Room Detail | Delete budget item | "Budget item removed" |
| Design Detail | Regenerate | "Regenerating..." |
| Design Detail | Delete design | "Design deleted" |
| Design Detail | Download image | "Downloaded!" |
| Project Detail | Export PDF | "PDF exported!" |
| Profile | Save name | "Name updated!" (replace inline Alert) |
| Profile | Delete account | "Account deleted" |
| Share Dialog | Create link | "Share link created!" |
| Share Dialog | Revoke link | "Link revoked" |
| Comments | Post comment | "Comment posted" |
| Library | Apply template | "Template applied!" |

## 4. User Stories

| # | As a | I want to | So that |
|---|------|-----------|---------|
| US-ES-1 | Homeowner | Download my design as JPEG | I can share it with contractors offline |
| US-ES-2 | Homeowner | Export project summary as PDF | I have a professional document for meetings |
| US-ES-3 | Homeowner | See confirmation when I do something | I know my action succeeded |
| US-ES-4 | Homeowner | See error messages when something fails | I can retry or understand what went wrong |

## 5. Out of Scope
- Video export
- Batch export (all designs at once)
- Custom PDF templates
