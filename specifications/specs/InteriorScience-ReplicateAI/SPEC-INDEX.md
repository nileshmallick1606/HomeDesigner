# Spec Index — Replicate AI Visualization

**BRD:** specifications/InteriorScience-ReplicateAI-BRD.md
**TRD:** specifications/InteriorScience-ReplicateAI-TRD.md
**Date:** 2026-04-03
**Total Specs:** 2 (SPEC-029 and SPEC-030)

## Execution Order

| # | Spec File | Title | BRD Features | Prerequisites | Status |
|---|-----------|-------|-------------|--------------|--------|
| 029 | SPEC-029.md | Replicate Client + Visualization Processor | RA-1, RA-3, RA-4, RA-5, RA-6, RA-7 | None | Not Started |
| 030 | SPEC-030.md | AI Consent Dialog | RA-2 | SPEC-029 | Not Started |

## Dependency Graph

```
SPEC-029 (Replicate Backend) → SPEC-030 (Consent UI)
```

## Implementation Instructions

- SPEC-029 is backend (ai-worker) — Replicate client + processor rewrite
- SPEC-030 is frontend — consent dialog before first AI generation
- Must have REPLICATE_API_TOKEN set to test SPEC-029
- Sign up at replicate.com and get API token first
