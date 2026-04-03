# Spec Index — Export UI + Snackbar Wiring

**BRD:** specifications/InteriorScience-ExportSnackbar-BRD.md
**TRD:** specifications/InteriorScience-ExportSnackbar-TRD.md
**Date:** 2026-04-03
**Total Specs:** 2 (SPEC-027 and SPEC-028)

## Execution Order

| # | Spec File | Title | BRD Features | Prerequisites | Status |
|---|-----------|-------|-------------|--------------|--------|
| 027 | SPEC-027.md | PDF Export + Download UI | ES-F1, ES-F2 | None | Not Started |
| 028 | SPEC-028.md | Snackbar Wiring | ES-F3 | None | Not Started |

## Dependency Graph

```
SPEC-027 (PDF + Download UI)    SPEC-028 (Snackbar Wiring)
        (independent — no dependencies between them)
```

## Implementation Instructions

- Both specs are independent and can be implemented in parallel
- SPEC-027 is backend + frontend (PDF generation + download buttons)
- SPEC-028 is frontend-only (add useSnackbar to 12+ files)
- Use `/Implement_Complete_Advanced specifications/specs/InteriorScience-ExportSnackbar/`
