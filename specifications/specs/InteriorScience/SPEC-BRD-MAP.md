# Spec → PRD Requirement Mapping — InteriorScience MVP

## Spec Inventory

| Spec | Title | Prerequisites | PRD Features |
|------|-------|--------------|-------------|
| SPEC-001 | Project Scaffolding & Infrastructure | None | F13 (partial) |
| SPEC-002 | Database Schema & Authentication | SPEC-001 | F1 |
| SPEC-003 | Project & Room Management | SPEC-002 | F2, F3 |
| SPEC-004 | Photo Pipeline | SPEC-003 | F4 |
| SPEC-005 | AI Segmentation Pipeline (SAM) | SPEC-004 | F5 |
| SPEC-006 | AI Visualization Pipeline (SD + ControlNet) | SPEC-005 | F6 |
| SPEC-007 | Visualization Experience | SPEC-006 | F7, F8 |
| SPEC-008 | Design Templates & Budget Tracking | SPEC-003 | F9, F10 |
| SPEC-009 | Collaboration, Sharing & Export | SPEC-003 | F11, F12 |

## Traceability Matrix

| Spec | Section | PRD Features Covered | TRD Design Constraints |
|------|---------|---------------------|----------------------|
| SPEC-001 §4b | Backend scaffold | F13 (API foundation) | DC-14 |
| SPEC-001 §4c | Frontend scaffold + PWA | F13 (PWA, responsive, mobile-first) | DC-12, DC-13 |
| SPEC-001 §4d | Docker + CI/CD | F13 (infrastructure) | — |
| SPEC-002 §4a | Database schema | F1 (all data models) | DC-7, DC-9 |
| SPEC-002 §4b | Auth API | F1 (registration, login, OAuth, RBAC) | DC-9, DC-14 |
| SPEC-002 §4c | Auth frontend | F1 (login/register pages) | DC-13 |
| SPEC-003 §4b | Projects API | F2 (project CRUD, budget, members) | DC-8, DC-9, DC-14 |
| SPEC-003 §4b | Rooms API | F3 (room CRUD, types) | DC-9, DC-14 |
| SPEC-003 §4c | Dashboard + navigation | F2, F3 (project list, room list, bottom tabs) | DC-13 |
| SPEC-004 §4b | Upload API + R2 storage | F4 (capture, upload, storage) | DC-2, DC-3, DC-5, DC-14 |
| SPEC-004 §4c | Camera + gallery UI | F4 (in-app capture, gallery upload) | DC-13 |
| SPEC-005 §4b | SAM job queue + worker | F5 (AI segmentation, element detection) | DC-1, DC-4, DC-6, DC-10, DC-14 |
| SPEC-005 §4c | Segmentation overlay UI | F5 (selectable element layers) | DC-13 |
| SPEC-006 §4b | SD+CN job queue + worker | F6 (category-based visualization) | DC-1, DC-4, DC-10, DC-14 |
| SPEC-006 §4c | Category selector + visualization UI | F6 (category selection, AI preview) | DC-13 |
| SPEC-007 §4c | Before/after slider | F7 (slider + side-by-side comparison) | DC-13 |
| SPEC-007 §4c | Fabric.js editor | F8 (editing, annotation, undo/redo) | DC-11, DC-13 |
| SPEC-008 §4b | Templates API | F9 (template library, browsing, applying) | DC-14 |
| SPEC-008 §4b | Budgets API | F10 (budget tracking, aggregation) | DC-14 |
| SPEC-008 §4c | Library page + budget UI | F9, F10 (library tab, budget charts) | DC-13 |
| SPEC-009 §4b | Sharing API | F11 (share links, roles, real-time) | DC-14 |
| SPEC-009 §4b | Comments + WebSocket | F11 (comments, WebSocket updates) | DC-14 |
| SPEC-009 §4b | Export API | F12 (image export, PDF export) | DC-14 |
| SPEC-009 §4c | Sharing + comments + export UI | F11, F12 (share dialog, comments, export) | DC-13 |

## Coverage Check

| PRD Feature | Covered In Spec(s) | Status |
|------------|-------------------|--------|
| F1 — User Registration & Profiles | SPEC-002 | Covered |
| F2 — Project Management | SPEC-003 | Covered |
| F3 — Room Management | SPEC-003 | Covered |
| F4 — Photo Capture & Upload | SPEC-004 | Covered |
| F5 — AI Room Segmentation | SPEC-005 | Covered |
| F6 — Category-Based Visualization | SPEC-006 | Covered |
| F7 — Before/After Comparison | SPEC-007 | Covered |
| F8 — Photo Editing Tools | SPEC-007 | Covered |
| F9 — Design Templates Library | SPEC-008 | Covered |
| F10 — Budget Tracking | SPEC-008 | Covered |
| F11 — Project Sharing & Collaboration | SPEC-009 | Covered |
| F12 — Save & Export | SPEC-009 | Covered |
| F13 — Responsive Mobile-First UI | SPEC-001 (foundation), all specs (implementation) | Covered |

## Design Constraint Coverage

| DC # | Constraint | Covered In Spec(s) | Status |
|------|-----------|-------------------|--------|
| DC-1 | Async AI via BullMQ | SPEC-005, SPEC-006 | Covered |
| DC-2 | Original photo in R2 before AI | SPEC-004 | Covered |
| DC-3 | Resumable/chunked upload (tus) | SPEC-004 | Covered |
| DC-4 | AI priority queue + rate limits | SPEC-005, SPEC-006 | Covered |
| DC-5 | EXIF stripping + magic byte validation | SPEC-004 | Covered |
| DC-6 | App works when AI offline | SPEC-005 | Covered |
| DC-7 | Cascading user deletion | SPEC-002 | Covered |
| DC-8 | Project-level locking (5min) | SPEC-003 | Covered |
| DC-9 | Tenant-scoped queries + RLS | SPEC-002, SPEC-003 | Covered |
| DC-10 | Model version on AI outputs + immutability | SPEC-005, SPEC-006 | Covered |
| DC-11 | Fabric.js canvas state serialization | SPEC-007 | Covered |
| DC-12 | Valid PWA (Lighthouse >90) | SPEC-001 | Covered |
| DC-13 | TTI <3s, bundle <500KB gzipped | SPEC-001, all specs | Covered |
| DC-14 | class-validator DTOs on all endpoints | All specs | Covered |

## Uncovered Requirements

None — all 13 MVP features (F1-F13) and all 14 design constraints (DC-1 to DC-14) are covered by the 9 specs.

**Note:** Post-MVP features (F14-F24) are explicitly out of scope for this design. The architecture accommodates future extension (e.g., Three.js foundation in SPEC-001 for F15, WebSocket in SPEC-009 for F18 team collab).
