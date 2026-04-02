# Design Decisions — InteriorScience Phase 3

**Designed by:** Design_Advanced (autonomous)
**Date:** 2026-04-02
**BRD:** specifications/InteriorScience-Phase3-BRD.md
**TRD:** specifications/InteriorScience-Phase3-TRD.md

## Context Read

- Phase 3 BRD: 6 features (P3-F1 to P3-F6), 9 user stories
- Phase 3 TRD: 10 design constraints, 8 edge cases, 4 open questions
- UX Audit: 17 categories of issues identified (font, spacing, errors, accessibility, etc.)
- Existing: 16 specs implemented across Phase 1+2, 13 backend modules, 16+ frontend pages

## Clarifying Questions Auto-Answered

| # | Question | AI Decision | Rationale | Source |
|---|----------|------------|-----------|--------|
| 1 | Page transitions: framer-motion vs CSS? | CSS-only via MUI Fade | TRD recommends. Avoids new dependency. P3-DC-9 requires subtle 150-200ms. | [TRD Recommended] |
| 2 | Snackbar: MUI vs notistack? | notistack | TRD recommends. Built on MUI, adds stacking for free. | [TRD Recommended] |
| 3 | Breadcrumb depth on mobile? | Parent + current | TRD recommends collapse on mobile. Full path on desktop. | [TRD Recommended] |
| 4 | Template thumbnails? | Sharp-generated colored rectangles | TRD recommends. No external dependencies. | [TRD Recommended] |
| 5 | Split UX audit into how many specs? | 2 (foundation + polish) | P3-F1 is too large for one spec. Foundation (theme, font, header, skeleton) must come first, then polish (errors, animations, responsive). | [AI-DECIDED] |
| 6 | SPEC numbering? | Continue from 017 | Phase 2 ended at SPEC-016. | [AI-DECIDED] |

## TRD Open Questions Resolved

| # | Open Question | AI Answer | Source |
|---|-------------|-----------|--------|
| 1 | Page transitions library | CSS-only (MUI Fade) | [TRD Recommended] |
| 2 | Snackbar library | notistack | [TRD Recommended] |
| 3 | Breadcrumb depth | Full on desktop, parent+current on mobile | [TRD Recommended] |
| 4 | Template thumbnails | Sharp-generated | [TRD Recommended] |

## Design Review (dual-lens)

**Iterations:** 1
**Total issues found:** 6 (3 Critical, 3 Moderate)
**All issues:** RESOLVED

| # | Severity | Spec | Issue | Fix |
|---|----------|------|-------|-----|
| 1 | Critical | SPEC-019 | PATCH endpoint for canvasState doesn't exist | Changed to CREATE new endpoint |
| 2 | Critical | SPEC-019 | dto/ directory doesn't exist | Marked as explicit CREATE |
| 3 | Critical | SPEC-019 | Inconsistent path param :id vs :designId | Fixed to :designId everywhere |
| 4 | Moderate | SPEC-017 | statusColors keys PascalCase vs UPPERCASE | Fixed to UPPERCASE |
| 5 | Moderate | SPEC-018 | Landing gradient fails WCAG contrast | Added textShadow fix |
| 6 | Moderate | SPEC-021 | Gateway registration vague | Added explicit GatewayModule |
