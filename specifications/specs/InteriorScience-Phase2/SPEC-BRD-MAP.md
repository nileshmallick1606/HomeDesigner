# Spec → BRD Requirement Mapping — InteriorScience Phase 2

## Spec Inventory

| Spec | Title | Prerequisites | BRD Features |
|------|-------|--------------|-------------|
| SPEC-010 | Auth Context + Profile | None | P2-F1, P2-F2 |
| SPEC-011 | AI Worker Mock Pipeline | None | P2-F3 |
| SPEC-012 | Visualization Request & Display UI | SPEC-010, SPEC-011 | P2-F4, P2-F5 |
| SPEC-013 | Budget & Templates UI | SPEC-010 | P2-F6, P2-F10 |
| SPEC-014 | Collaboration UI | SPEC-010 | P2-F7, P2-F8, P2-F9 |
| SPEC-015 | Camera Capture & Export | SPEC-010, SPEC-012 | P2-F11, P2-F12 |
| SPEC-016 | Fabric.js Design Editor | SPEC-012 | P2-F13 |

## Coverage Check

| BRD Feature | Covered In Spec(s) | Status |
|------------|-------------------|--------|
| P2-F1 — Route Protection & Auth Context | SPEC-010 | Covered |
| P2-F2 — Profile Page | SPEC-010 | Covered |
| P2-F3 — AI Worker Pipeline (Mock) | SPEC-011 | Covered |
| P2-F4 — Visualization Request & Display UI | SPEC-012 | Covered |
| P2-F5 — Design Detail Page | SPEC-012 | Covered |
| P2-F6 — Budget UI | SPEC-013 | Covered |
| P2-F7 — Share Dialog | SPEC-014 | Covered |
| P2-F8 — Comments Panel | SPEC-014 | Covered |
| P2-F9 — Notifications UI | SPEC-014 | Covered |
| P2-F10 — Templates Library UI | SPEC-013 | Covered |
| P2-F11 — Camera Capture Page | SPEC-015 | Covered |
| P2-F12 — Export Functionality | SPEC-015 | Covered |
| P2-F13 — Fabric.js Design Editor | SPEC-016 | Covered |

## Design Constraint Coverage

| DC # | Constraint | Covered In Spec(s) | Status |
|------|-----------|-------------------|--------|
| P2-DC-1 | Mock AI visually distinct output | SPEC-011 | Covered |
| P2-DC-2 | MUI patterns, mobile-first | All specs | Covered |
| P2-DC-3 | Fabric.js dynamic import | SPEC-016 | Covered |
| P2-DC-4 | Recharts dynamic import | SPEC-013 | Covered |
| P2-DC-5 | WebSocket auto-reconnect | SPEC-014 | Covered |
| P2-DC-6 | PDF server-side, max 50 pages | SPEC-015 | Covered |
| P2-DC-7 | Camera permission handling | SPEC-015 | Covered |
| P2-DC-8 | window.location.hostname pattern | All specs | Covered |
| P2-DC-9 | Phase 1 constraints remain | All specs | Covered |

## Uncovered Requirements

None — all 13 Phase 2 features and all 9 design constraints are covered.
