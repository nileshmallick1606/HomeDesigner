# Spec Index — InteriorScience MVP

**PRD:** specifications/InteriorScience-PRD.md
**TRD:** specifications/InteriorScience-TRD.md
**Date:** 2026-04-02
**Total Specs:** 9

## Execution Order

| # | Spec File | Title | PRD Features | Prerequisites | Status |
|---|-----------|-------|-------------|--------------|--------|
| 001 | SPEC-001.md | Project Scaffolding & Infrastructure | F13 (partial) | None | Done |
| 002 | SPEC-002.md | Database Schema & Authentication | F1 | SPEC-001 | Done |
| 003 | SPEC-003.md | Project & Room Management | F2, F3 | SPEC-002 | Done |
| 004 | SPEC-004.md | Photo Pipeline | F4 | SPEC-003 | Done |
| 005 | SPEC-005.md | AI Segmentation Pipeline (SAM) | F5 | SPEC-004 | Done |
| 006 | SPEC-006.md | AI Visualization Pipeline (SD + ControlNet) | F6 | SPEC-005 | Done |
| 007 | SPEC-007.md | Visualization Experience | F7, F8 | SPEC-006 | Done |
| 008 | SPEC-008.md | Design Templates & Budget Tracking | F9, F10 | SPEC-003 | Done |
| 009 | SPEC-009.md | Collaboration, Sharing & Export | F11, F12 | SPEC-003 | Done |

## Dependency Graph

```
SPEC-001 (Infrastructure)
    └→ SPEC-002 (DB + Auth)
         └→ SPEC-003 (Projects + Rooms)
              ├→ SPEC-004 (Photos)
              │    └→ SPEC-005 (Segmentation)
              │         └→ SPEC-006 (Visualization)
              │              └→ SPEC-007 (Before/After + Editor)
              ├→ SPEC-008 (Templates + Budget)  [independent branch]
              └→ SPEC-009 (Sharing + Export)     [independent branch]
```

**Note:** SPEC-008 and SPEC-009 are independent of SPEC-004 through SPEC-007. They can be implemented in parallel with the photo/AI pipeline if desired.

## Implementation Instructions

- Use `/implement_RLZN` to implement one spec at a time, in order
- Use `/Implement_Complete_Advanced` to implement all specs sequentially
- Always follow the numbered execution order
- Check prerequisites before starting each spec
- SPEC-008 and SPEC-009 can be started after SPEC-003 completes (they don't need the AI pipeline)
