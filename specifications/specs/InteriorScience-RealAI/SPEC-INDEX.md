# Spec Index — Real AI Model Integration

**BRD:** specifications/InteriorScience-RealAI-BRD.md
**TRD:** specifications/InteriorScience-RealAI-TRD.md
**Date:** 2026-04-02
**Total Specs:** 3 (SPEC-024 through SPEC-026)

## Execution Order

| # | Spec File | Title | BRD Features | Prerequisites | Status |
|---|-----------|-------|-------------|--------------|--------|
| 024 | SPEC-024.md | Model Manager + SAM Segmentation | AI-F1 | None | Not Started |
| 025 | SPEC-025.md | SD 1.5 + ControlNet Visualization | AI-F2 | SPEC-024 | Not Started |
| 026 | SPEC-026.md | Prompt Engineering & Quality Presets | AI-F3 | SPEC-025 | Not Started |

## Dependency Graph

```
SPEC-024 (Model Manager + SAM)
    └→ SPEC-025 (SD 1.5 + ControlNet)
         └→ SPEC-026 (Prompt Tuning + Quality Presets)
```

## Implementation Instructions

- SPEC-024 must be done first (model infrastructure + SAM)
- SPEC-025 builds on model manager from SPEC-024
- SPEC-026 is optimization/refinement of SPEC-025
- Use `/Implement_Complete_Advanced specifications/specs/InteriorScience-RealAI/`
- **IMPORTANT:** Requires ~6GB disk for model downloads on first run
- **IMPORTANT:** Requires 32GB+ RAM for inference (already configured in Docker)
