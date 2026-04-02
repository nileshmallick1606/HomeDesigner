# Design Decisions — InteriorScience Phase 2

**Designed by:** Design_Advanced (autonomous)
**Date:** 2026-04-02
**BRD:** specifications/InteriorScience-Phase2-BRD.md
**TRD:** specifications/InteriorScience-Phase2-TRD.md

## Context Read

- Phase 2 BRD: 13 features (P2-F1 to P2-F13), 12 user stories
- Phase 2 TRD: 9 design constraints (P2-DC-1 to P2-DC-9), 10 edge cases, 4 open questions
- Phase 1: 9 specs all implemented — 13 NestJS backend modules functional, frontend ~30% complete
- Existing code patterns: MUI tree-shaking imports, apiClient with localStorage token, direct API calls for media (window.location.hostname pattern)

## Clarifying Questions Auto-Answered

| # | Question | AI Decision | Rationale | Source |
|---|----------|------------|-----------|--------|
| 1 | WebSocket: single vs separate gateways? | Single gateway with event namespacing | TRD recommends this. Simpler to manage one connection per client. | [TRD Recommended] |
| 2 | Template seed data count? | 12 templates (2 per room type) | TRD recommends 12. Enough to demonstrate library without bloat. | [TRD Recommended] |
| 3 | Fabric.js v5 vs v6? | v6 for TypeScript-native support | TRD recommends v6. Aligns with TS-everywhere approach. | [TRD Recommended] |
| 4 | PDF styling: minimal vs branded? | Branded with header, colors, typography | TRD recommends branded. Better for contractor sharing. | [TRD Recommended] |
| 5 | Spec numbering: restart at 001 or continue from Phase 1? | Continue from SPEC-010 to avoid confusion with Phase 1 specs | Phase 1 ended at SPEC-009. Continuous numbering avoids ambiguity. | [AI-DECIDED] |
| 6 | Separate spec folder or same as Phase 1? | Separate folder: InteriorScience-Phase2 | Different BRD/TRD, different phase. Clean separation. | [AI-DECIDED] |
| 7 | Auth context: validate token on every page load? | Validate once on AuthProvider mount, cache result for session | Calling /api/users/me on every navigation is wasteful. Validate once, use cached user data. Re-validate on 401 during API calls. | [AI-DECIDED] |
| 8 | Mock AI watermark: overlay text or metadata-only? | Visible text overlay "AI Preview (Mock)" on generated images | P2-E1 requires visible difference. Text overlay is unambiguous. Remove when real AI is integrated. | [AI-DECIDED] |

## Architecture Decision

Phase 2 architecture adds frontend UI layers to existing backend, plus AI worker:

```
┌──────────────────────────────────────────────────┐
│  FRONTEND (Next.js 15) — Phase 2 Additions       │
│                                                    │
│  AuthProvider (wraps all /main routes)             │
│    ├── Dashboard (fetches projects) ✓ done         │
│    ├── Profile (fetch/edit user, logout) ← NEW     │
│    ├── Room Detail                                 │
│    │   ├── Photos ✓ done                           │
│    │   ├── CategorySelector → AI Request ← NEW     │
│    │   ├── Designs list + BeforeAfterSlider ← NEW  │
│    │   ├── Budget editor ← NEW                     │
│    │   └── Comments panel ← NEW                    │
│    ├── Project Detail                              │
│    │   ├── Rooms ✓ done                            │
│    │   ├── Budget summary ← NEW                    │
│    │   ├── Share dialog ← NEW                      │
│    │   └── Comments panel ← NEW                    │
│    ├── Library (template grid) ← NEW               │
│    ├── Capture (camera API) ← NEW                  │
│    └── Notification bell in header ← NEW           │
│                                                    │
│  Socket.IO client ← NEW                           │
│  Recharts (dynamic import) ← NEW                  │
│  Fabric.js (dynamic import) ← NEW                 │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────┴───────────────────────────┐
│  BACKEND (NestJS 10) — Phase 2 Additions          │
│                                                    │
│  WebSocket Gateway (events.gateway.ts) ← NEW      │
│  Export Module (export.service.ts) ← NEW           │
│  Template seed data ← NEW                         │
│  All other modules ✓ done                          │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────┴───────────────────────────┐
│  AI WORKER — Phase 2 (complete rewrite)           │
│                                                    │
│  BullMQ consumer → Redis                           │
│  segmentation.processor.ts ← NEW                   │
│  visualization.processor.ts ← NEW                  │
│  mock-ai.ts (Sharp transforms) ← NEW              │
│  Prisma client + R2/local storage ← NEW            │
└──────────────────────────────────────────────────┘
```

## Spec Decomposition Decision

7 specs, continuing numbering from Phase 1:

| Spec | Title | BRD Features | Prerequisites |
|------|-------|-------------|--------------|
| SPEC-010 | Auth Context + Profile | P2-F1, P2-F2 | None (Phase 1 done) |
| SPEC-011 | AI Worker Mock Pipeline | P2-F3 | None |
| SPEC-012 | Visualization Request & Display UI | P2-F4, P2-F5 | SPEC-010, SPEC-011 |
| SPEC-013 | Budget & Templates UI | P2-F6, P2-F10 | SPEC-010 |
| SPEC-014 | Collaboration UI (Share, Comments, Notifications) | P2-F7, P2-F8, P2-F9 | SPEC-010 |
| SPEC-015 | Camera Capture & Export | P2-F11, P2-F12 | SPEC-010, SPEC-012 |
| SPEC-016 | Fabric.js Design Editor | P2-F13 | SPEC-012 |

Rationale: SPEC-010 (auth) is foundation. SPEC-011 (AI worker) is independent backend work. SPEC-012 needs both. SPEC-013/014 branch independently from SPEC-010. SPEC-015/016 are lowest priority.

## TRD Open Questions Resolved

| # | Open Question | AI Answer | Source |
|---|-------------|-----------|--------|
| 1 | Single vs separate WebSocket gateways | Single gateway with event namespacing | [TRD Recommended] |
| 2 | Template seed data count | 12 templates (2 per room type) | [TRD Recommended] |
| 3 | Fabric.js version | v6 (TypeScript-native) | [TRD Recommended] |
| 4 | PDF styling | Branded with InteriorScience header | [TRD Recommended] |

## Design Review (via /review_design — dual-lens)

**Iterations:** 1
**Total issues found:** 8
**All Critical and Moderate issues:** RESOLVED

### Architect Lens (5 issues)

| # | Severity | Issue | Spec | Fix Applied |
|---|----------|-------|------|-------------|
| A1 | Critical | Wrong API endpoint paths (/api/designs/ vs /api/ai/designs/) | SPEC-012 | Fixed 10+ occurrences |
| A2 | Critical | References non-existent file (designs.controller.ts) | SPEC-016 | Fixed to ai.controller.ts |
| A3 | Critical | Wrong canvas save endpoint path | SPEC-016 | Fixed to /api/ai/designs/:id |
| A4 | Critical | Budget editor field mismatch with backend upsert API | SPEC-013 | Fixed field names to match backend |
| A5 | Moderate | Export download auth failure (window.open loses Bearer token) | SPEC-015 | Fixed to fetch + blob download pattern |

### UI/UX Lens (3 issues)

| # | Severity | Issue | Spec | Fix Applied |
|---|----------|-------|------|-------------|
| U1 | Moderate | Generate button missing loading indicator | SPEC-012 | Added spinner + "Generating..." text |
| U2 | Moderate | Comments panel missing loading/submitting states | SPEC-014 | Added skeleton + submitting state |
| U3 | Moderate | Budget editor missing error handling | SPEC-013 | Added Snackbar errors + form preservation |

**Unresolved items:** None — all Critical and Moderate issues fixed.
