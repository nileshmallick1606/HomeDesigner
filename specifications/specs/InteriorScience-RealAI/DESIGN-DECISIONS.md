# Design Decisions — Real AI Model Integration

**Designed by:** Design_Advanced (autonomous)
**Date:** 2026-04-02
**BRD:** specifications/InteriorScience-RealAI-BRD.md
**TRD:** specifications/InteriorScience-RealAI-TRD.md

## Context Read

- BRD: 3 features (SAM segmentation, SD+ControlNet visualization, prompt tuning)
- TRD: 6 constraints, 5 edge cases, 3 open questions
- Existing AI worker: BullMQ with 2 processors (segmentation + visualization) using Sharp mock transforms
- Model files: none present, ~5.5GB total needed
- Docker Compose already allocates 32GB RAM to ai-worker

## Clarifying Questions Auto-Answered

| # | Question | AI Decision | Rationale | Source |
|---|----------|------------|-----------|--------|
| 1 | ONNX model source? | Pre-converted from HuggingFace onnx-community | TRD recommends. Avoids manual conversion complexity. | [TRD Recommended] |
| 2 | Depth estimation method? | Gradient-based via Sharp first, MiDaS later | TRD recommends. Simpler, add complexity only if needed. | [TRD Recommended] |
| 3 | CLIP tokenizer in JS? | @xenova/transformers | TRD recommends. Proven JS port of HuggingFace tokenizers. | [TRD Recommended] |
| 4 | Model manager: download at startup or lazy? | Lazy on first job (AI-DC-1) | Prevents blocking worker startup. Models cached after first download. | [AI-DECIDED] |
| 5 | Fallback behavior? | Always fall back to mock-ai.ts on any failure (AI-DC-3) | Users should never see "no result". Mock is always available. | [AI-DECIDED] |
| 6 | Separate model manager spec? | Yes — model manager is foundation for both SAM and SD | SAM and SD both need model download/load/cache. Extract to shared infrastructure. | [AI-DECIDED] |

## Spec Decomposition

3 specs continuing from SPEC-023:

| Spec | Title | BRD Feature | Prerequisites |
|------|-------|------------|--------------|
| SPEC-024 | Model Manager + SAM Segmentation | AI-F1 | None |
| SPEC-025 | Stable Diffusion + ControlNet Visualization | AI-F2 | SPEC-024 |
| SPEC-026 | Prompt Engineering & Quality Presets | AI-F3 | SPEC-025 |

Rationale: Model manager is needed by both SAM and SD — bundle with SAM (Phase 4a). SD depends on model manager from SPEC-024. Prompt tuning refines SD output.

## TRD Open Questions Resolved

| # | Open Question | AI Answer | Source |
|---|-------------|-----------|--------|
| 1 | ONNX model source | Pre-converted from onnx-community | [TRD Recommended] |
| 2 | Depth estimation | Gradient-based via Sharp | [TRD Recommended] |
| 3 | CLIP tokenizer | @xenova/transformers | [TRD Recommended] |
