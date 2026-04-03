# Design Decisions — Export UI + Snackbar Wiring

**Designed by:** Design_Advanced (autonomous)
**Date:** 2026-04-03
**BRD:** specifications/InteriorScience-ExportSnackbar-BRD.md
**TRD:** specifications/InteriorScience-ExportSnackbar-TRD.md

## Context Read

- BRD: 3 features (PDF export, download UI, snackbar wiring)
- TRD: 6 design constraints, 6 edge cases
- Existing: ExportModule registered, PDFKit installed, notistack installed + provider wrapping root
- No snackbar usage in any component currently

## Clarifying Questions Auto-Answered

| # | Question | AI Decision | Rationale | Source |
|---|----------|------------|-----------|--------|
| 1 | 2 specs or 1? | 2 specs (independent) | Export is backend+frontend, snackbar is frontend-only. Can be implemented in parallel. | [AI-DECIDED] |
| 2 | Spec numbering? | 027 and 028 | Continues from SPEC-026 | [AI-DECIDED] |
| 3 | PDF library? | PDFKit (already installed) | No new dependency needed | [AI-DECIDED] |
| 4 | Download pattern? | Authenticated fetch + blob + object URL | TRD ES-DC-2 requires this. window.open loses Bearer token. | [TRD Recommended] |
