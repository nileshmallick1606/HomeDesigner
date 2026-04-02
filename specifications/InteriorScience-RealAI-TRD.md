# Technical Requirements Document — Real AI Model Integration

## 1. Summary

Replace mock Sharp transforms in the AI worker with real ONNX-based AI models. Phased: SAM segmentation first (4a), then SD 1.5 + ControlNet visualization (4b), then prompt tuning (4c).

## 2. Architecture Changes

### AI Worker (apps/ai-worker/) — Major Rewrite

```
apps/ai-worker/src/
├── main.ts                          # Unchanged — BullMQ bootstrap
├── processors/
│   ├── segmentation.processor.ts    # REWRITE — real SAM inference
│   └── visualization.processor.ts   # REWRITE — real SD + ControlNet
├── models/
│   ├── mock-ai.ts                   # KEEP — fallback transforms
│   ├── sam.ts                       # NEW — SAM ONNX wrapper
│   ├── stable-diffusion.ts          # NEW — SD 1.5 ONNX wrapper
│   ├── controlnet.ts                # NEW — ControlNet preprocessors
│   ├── prompt-builder.ts            # NEW — category → prompt mapping
│   └── model-manager.ts             # NEW — download, cache, load models
├── lib/
│   ├── prisma.ts                    # Unchanged
│   └── storage.ts                   # Unchanged
└── config/
    └── models.ts                    # NEW — model paths, URLs, versions
```

### Model Management

```
Model download on first run:
  model-manager.ts checks if model files exist in /models/ volume
    → If missing: download from HuggingFace (SAM, SD 1.5, ControlNet)
    → Cache in Docker volume (model-cache)
    → Log download progress
    → Load into ONNX Runtime session

Model files (Docker volume: model-cache):
  /models/sam-vit-b.onnx              (~375MB)
  /models/sd15-unet.onnx              (~1.7GB)
  /models/sd15-vae-decoder.onnx       (~150MB)
  /models/sd15-text-encoder.onnx      (~470MB)
  /models/controlnet-canny.onnx       (~1.4GB)
  /models/controlnet-depth.onnx       (~1.4GB)
  Total: ~5.5GB
```

### Inference Pipeline

```
Segmentation (SAM):
  Photo → Resize to 1024x1024 → Normalize → SAM encoder → Automatic mask generation
  → Post-process: label masks by position/size (top=ceiling, bottom=floor, large=wall, small=fixture)
  → Output: labeled mask image + elements JSON

Visualization (SD 1.5 + ControlNet):
  Photo → Canny edge detection (Sharp) → Depth estimation (MiDaS or simple)
  → Build prompt from category + room type
  → CLIP text encode prompt → SD 1.5 UNet denoise with ControlNet conditioning
  → VAE decode → Post-process (resize to original dimensions, color match)
  → Output: visualization image
```

## 3. New Dependencies

| Package | App | Purpose |
|---------|-----|---------|
| onnxruntime-node | ai-worker | Run ONNX AI models on CPU |

## 4. Design Constraints

- AI-DC-1: Models MUST be downloaded lazily on first use, not baked into Docker image (5.5GB is too large for image)
- AI-DC-2: Model download progress MUST be logged. Worker should NOT crash if download fails — mark job as FAILED with retry.
- AI-DC-3: If ONNX inference fails, MUST fall back to mock transforms (existing mock-ai.ts). Never leave user with no result.
- AI-DC-4: Model version MUST be tracked: 'sam-vit-b-v1' for segmentation, 'sd15-cn-v1' for visualization. Distinct from 'mock-v1'.
- AI-DC-5: Memory management: load model → run inference → keep model loaded for subsequent jobs. Unload if idle >5 minutes to free RAM.
- AI-DC-6: All Phase 1/2/3 constraints remain in effect.

## 5. Edge Cases

| # | Question | Decision |
|---|----------|----------|
| AI-E1 | Model download takes >10 minutes? | Show "Downloading AI models (first time only)..." in job status. Timeout after 30 minutes. |
| AI-E2 | Not enough RAM for SD inference? | Catch OOM error, fall back to mock. Log warning. SD 1.5 needs ~4-8GB. |
| AI-E3 | SAM produces poor segmentation? | Allow user to manually adjust segments (existing manual selection component). |
| AI-E4 | SD output is blurry or unrealistic? | Increase inference steps (20→50). Add negative prompts. Quality preset option. |
| AI-E5 | Multiple users queue jobs while model downloads? | Jobs wait in queue. First job triggers download, subsequent jobs process after download completes. |

## 6. Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| onnxruntime-node incompatible with Node 24 | Medium | High | Test early. Pin to compatible version. |
| SD 1.5 too slow on CPU (>2 minutes) | High | Medium | Use LCM scheduler (fewer steps). Accept longer times with clear UX. Quality preset: draft=fast. |
| Model files corrupt after download | Low | Medium | Verify checksums. Re-download on corruption. |
| 32GB RAM insufficient for SD + SAM loaded simultaneously | Medium | Medium | Load one model at a time. Unload after idle. |

## 7. Open Questions

1. **HuggingFace model source:** Use official HuggingFace Hub models or pre-converted ONNX? **Recommendation:** Use pre-converted ONNX from huggingface.co/onnx-community or convert ourselves.
2. **Depth estimation:** MiDaS ONNX (~100MB) or simple gradient-based? **Recommendation:** Start with gradient-based (Sharp), add MiDaS later if quality insufficient.
3. **CLIP tokenizer:** Need a JS tokenizer for prompt encoding. **Recommendation:** Use @xenova/transformers (JS port of HuggingFace tokenizers).
