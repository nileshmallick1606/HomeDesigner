# InteriorScience — Specification Progress

**Last Updated:** 2026-04-02

## Feature: InteriorScience MVP (Phase 1)

| Spec | Title | PRD Features | Prerequisites | Status | Date |
|------|-------|-------------|--------------|--------|------|
| SPEC-001 | Project Scaffolding & Infrastructure | F13 | None | Done | 2026-04-02 |
| SPEC-002 | Database Schema & Authentication | F1 | SPEC-001 | Done | 2026-04-02 |
| SPEC-003 | Project & Room Management | F2, F3 | SPEC-002 | Done | 2026-04-02 |
| SPEC-004 | Photo Pipeline | F4 | SPEC-003 | Done | 2026-04-02 |
| SPEC-005 | AI Segmentation Pipeline (SAM) | F5 | SPEC-004 | Done | 2026-04-02 |
| SPEC-006 | AI Visualization Pipeline (SD + ControlNet) | F6 | SPEC-005 | Done | 2026-04-02 |
| SPEC-007 | Visualization Experience | F7, F8 | SPEC-006 | Done | 2026-04-02 |
| SPEC-008 | Design Templates & Budget Tracking | F9, F10 | SPEC-003 | Done | 2026-04-02 |
| SPEC-009 | Collaboration, Sharing & Export | F11, F12 | SPEC-003 | Done | 2026-04-02 |

## Feature: InteriorScience Phase 2 (UI Completion + AI Worker)

| Spec | Title | BRD Features | Prerequisites | Status | Date |
|------|-------|-------------|--------------|--------|------|
| SPEC-010 | Auth Context + Profile | P2-F1, P2-F2 | None | Designed | 2026-04-02 |
| SPEC-011 | AI Worker Mock Pipeline | P2-F3 | None | Designed | 2026-04-02 |
| SPEC-012 | Visualization Request & Display UI | P2-F4, P2-F5 | SPEC-010, SPEC-011 | Designed | 2026-04-02 |
| SPEC-013 | Budget & Templates UI | P2-F6, P2-F10 | SPEC-010 | Designed | 2026-04-02 |
| SPEC-014 | Collaboration UI | P2-F7, P2-F8, P2-F9 | SPEC-010 | Designed | 2026-04-02 |
| SPEC-015 | Camera Capture & Export | P2-F11, P2-F12 | SPEC-010, SPEC-012 | Designed | 2026-04-02 |
| SPEC-016 | Fabric.js Design Editor | P2-F13 | SPEC-012 | Designed | 2026-04-02 |

## Phase 2 Dependency Graph

```
SPEC-010 (Auth + Profile)     SPEC-011 (AI Worker)
    ├→ SPEC-013 (Budget + Templates)
    ├→ SPEC-014 (Share + Comments + Notifications)
    └→ SPEC-012 (Visualization UI) ←── SPEC-011
         ├→ SPEC-015 (Camera + Export)
         └→ SPEC-016 (Fabric.js Editor)
```

## Documents
- Phase 1 PRD: specifications/InteriorScience-PRD.md
- Phase 1 TRD: specifications/InteriorScience-TRD.md
- Phase 1 Specs: specifications/specs/InteriorScience/
- Phase 2 BRD: specifications/InteriorScience-Phase2-BRD.md
- Phase 2 TRD: specifications/InteriorScience-Phase2-TRD.md
- Phase 2 Specs: specifications/specs/InteriorScience-Phase2/
