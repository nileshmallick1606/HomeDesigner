# Design Decisions — Replicate AI Visualization

**Designed by:** Design_Advanced (autonomous)
**Date:** 2026-04-03
**BRD:** specifications/InteriorScience-ReplicateAI-BRD.md
**TRD:** specifications/InteriorScience-ReplicateAI-TRD.md

## Context Read

- BRD: 7 requirements, gathered via interactive /requirements_RLZN with user
- TRD: 6 design constraints, 7 edge cases, 3 open questions
- User chose: Replicate, phased approach, dev API key, one-time consent, self-hosted fallback
- Existing: visualization.processor.ts with mock/enhanced Sharp transforms, prompt-builder.ts, model-manager.ts

## Clarifying Questions Auto-Answered

| # | Question | AI Decision | Rationale | Source |
|---|----------|------------|-----------|--------|
| 1 | 1 spec or 2? | 2 (backend + frontend) | Backend is ai-worker changes, frontend is consent dialog. Independent concerns. | [AI-DECIDED] |
| 2 | Spec numbering? | 029-030 | Continues from SPEC-028 | [AI-DECIDED] |
| 3 | How to send image to Replicate? | Base64 data URI | Replicate accepts base64 or URLs. Our images are local files, so base64 is simplest. No need to expose a public URL. | [AI-DECIDED] |
| 4 | Default model? | `stability-ai/sdxl` with image-to-image mode | SDXL produces higher quality than SD 1.5. Image-to-image preserves room structure better than text-to-image. Configurable via env var. | [AI-DECIDED] |

## TRD Open Questions Resolved

| # | Open Question | AI Answer | Source |
|---|-------------|-----------|--------|
| 1 | Best Replicate model | Start with `stability-ai/sdxl`, make configurable | [AI-DECIDED] |
| 2 | Image-to-image vs text-to-image | Image-to-image (preserves room) | [TRD Recommended] |
| 3 | ControlNet on Replicate | Evaluate during implementation, fall back to img2img if unavailable | [AI-DECIDED] |
