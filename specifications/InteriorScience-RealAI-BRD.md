# Business Requirements Document — Real AI Model Integration

## 1. Executive Summary

- **Product:** InteriorScience (existing MVP — Real AI integration)
- **Summary:** Replace the mock AI visualization pipeline (Sharp color transforms) with real AI models: SAM (Segment Anything Model) for room element segmentation, and Stable Diffusion 1.5 + ControlNet for realistic visualization generation. This is a phased approach: Phase 4a adds real segmentation, Phase 4b adds real visualization, Phase 4c adds fine-tuning.

## 2. Current State

- AI Worker uses Sharp mock transforms (tint, saturation, brightness)
- "AI Preview" watermark on all generated images
- Full BullMQ pipeline working (queue → process → store → display)
- Before/after comparison working end-to-end
- All 23 specs implemented, MVP functionally complete

## 3. Phased Feature Requirements

### AI-F1: Real SAM Segmentation (Phase 4a)
**Priority:** P0 — Foundation
**Description:** Replace mock edge detection with real SAM (Segment Anything Model) for accurate room element identification. Users see real walls, floor, ceiling, windows, doors, fixtures as selectable layers.
**Acceptance Criteria:**
- SAM-ViT-B ONNX model downloaded and loaded via onnxruntime-node
- Input: room photo → Output: labeled element masks (wall, floor, ceiling, window, door, fixture)
- 80%+ accuracy on interior room photos
- Processing time <30 seconds on CPU
- Segmentation masks stored in local storage with labeled elements JSON
- Frontend displays segmentation overlays on room photos (selectable elements)
- Fallback: if SAM fails or is too slow, existing mock segmentation as fallback

### AI-F2: Real Stable Diffusion + ControlNet Visualization (Phase 4b)
**Priority:** P0 — Core USP
**Description:** Replace mock color transforms with Stable Diffusion 1.5 + ControlNet for realistic room visualization. Users see photorealistic before/after previews of renovation changes.
**Acceptance Criteria:**
- SD 1.5 ONNX model + ControlNet (Canny + Depth) loaded via onnxruntime-node
- Input: room photo + segmentation mask + category prompt → Output: realistic visualization
- ControlNet preserves room geometry (walls, perspective, windows)
- Category-specific prompts produce appropriate results (wall paint, tiles, cabinets, etc.)
- Processing time <60 seconds on CPU (target), <10 seconds on GPU
- Remove "AI Preview" watermark from real AI outputs
- Model version tracking: 'sd15-controlnet-v1' (distinct from 'mock-v1')
- Graceful degradation: if SD inference fails, fall back to mock transforms

### AI-F3: Prompt Engineering & Quality Tuning (Phase 4c)
**Priority:** P1
**Description:** Optimize prompts per category for high-quality interior design visualizations. Add negative prompts, style modifiers, and quality presets.
**Acceptance Criteria:**
- Each category has optimized positive + negative prompt templates
- Quality presets: Draft (20 steps, fast) and Final (50 steps, quality)
- Users can choose preset before generating
- Prompt includes room context (room type, category, sub-category)
- Results are visually convincing and preserve room identity

## 4. User Stories

| # | As a | I want to | So that | Priority |
|---|------|-----------|---------|----------|
| US-AI-1 | Homeowner | See accurate room element detection | I can select specific walls/floors to change | P0 |
| US-AI-2 | Homeowner | See realistic AI-generated room previews | I can make confident renovation decisions | P0 |
| US-AI-3 | Homeowner | Choose draft vs final quality | I can get quick previews or detailed results | P1 |

## 5. Dependencies

| Dependency | Status | Impact |
|-----------|--------|--------|
| onnxruntime-node | Not installed | Required for all AI models |
| SAM-ViT-B ONNX model (~375MB) | Not downloaded | Required for AI-F1 |
| SD 1.5 ONNX model (~2-4GB) | Not downloaded | Required for AI-F2 |
| ControlNet ONNX models (~1-2GB each) | Not downloaded | Required for AI-F2 |
| 32GB+ RAM on AI worker | Docker configured | Already set in docker-compose |

## 6. Out of Scope
- GPU inference optimization (CPU-only for this phase)
- Custom LoRA fine-tuning with user data
- Real-time AR preview
- Multiple model selection by user
