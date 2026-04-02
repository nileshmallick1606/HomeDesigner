# Spec Index — InteriorScience Phase 2

**BRD:** specifications/InteriorScience-Phase2-BRD.md
**TRD:** specifications/InteriorScience-Phase2-TRD.md
**Date:** 2026-04-02
**Total Specs:** 7 (SPEC-010 through SPEC-016)

## Execution Order

| # | Spec File | Title | BRD Features | Prerequisites | Status |
|---|-----------|-------|-------------|--------------|--------|
| 010 | SPEC-010.md | Auth Context + Profile | P2-F1, P2-F2 | None | Not Started |
| 011 | SPEC-011.md | AI Worker Mock Pipeline | P2-F3 | None | Not Started |
| 012 | SPEC-012.md | Visualization Request & Display UI | P2-F4, P2-F5 | SPEC-010, SPEC-011 | Not Started |
| 013 | SPEC-013.md | Budget & Templates UI | P2-F6, P2-F10 | SPEC-010 | Not Started |
| 014 | SPEC-014.md | Collaboration UI | P2-F7, P2-F8, P2-F9 | SPEC-010 | Not Started |
| 015 | SPEC-015.md | Camera Capture & Export | P2-F11, P2-F12 | SPEC-010, SPEC-012 | Not Started |
| 016 | SPEC-016.md | Fabric.js Design Editor | P2-F13 | SPEC-012 | Not Started |

## Dependency Graph

```
SPEC-010 (Auth + Profile)     SPEC-011 (AI Worker)
    ├→ SPEC-013 (Budget + Templates)
    ├→ SPEC-014 (Share + Comments + Notifications)
    └→ SPEC-012 (Visualization UI) ←── SPEC-011
         ├→ SPEC-015 (Camera + Export)
         └→ SPEC-016 (Fabric.js Editor)
```

**Note:** SPEC-010 and SPEC-011 are independent and can run in parallel. SPEC-013 and SPEC-014 branch independently from SPEC-010. SPEC-015 and SPEC-016 are lowest priority.

## Implementation Instructions

- Use `/implement_RLZN` to implement one spec at a time, in order
- Use `/Implement_Complete_Advanced specifications/specs/InteriorScience-Phase2/` to implement all sequentially
- SPEC-010 + SPEC-011 can run in parallel (no dependency between them)
- SPEC-013 + SPEC-014 can run in parallel after SPEC-010
