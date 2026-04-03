# Technical Requirements Document — Replicate AI Visualization (Phase 1)

## 1. Technical Summary

Replace the Sharp mock transform engine in the AI worker with Replicate Cloud API calls for Stable Diffusion image generation. The `visualization.processor.ts` checks for Replicate API key → calls Replicate → downloads result → stores locally. Falls back to existing self-hosted Sharp/ONNX transforms when Replicate is unavailable. Frontend adds a one-time consent dialog before first AI use.

## 2. Architecture

```
Current flow (no change to frontend/API):
  Frontend → POST /api/ai/visualization → API creates job → BullMQ queue
  
AI Worker (visualization.processor.ts) — MODIFIED:
  Job arrives →
    1. Check REPLICATE_API_TOKEN env var
    2. If set + consent given:
       → Build prompt (existing prompt-builder.ts)
       → Call Replicate API: send photo + prompt + params
       → Wait for result (5-30 sec)
       → Download generated image from Replicate URL
       → Store locally (existing R2/storage pattern)
       → Model version: 'replicate-{model}-v1'
       → No watermark
    3. If not set OR Replicate fails:
       → Fall back to existing Sharp/ONNX transforms
       → Model version: 'mock-v1'
       → "AI Preview" watermark added
    4. Create Visualization record (existing pattern)
    5. Update job status → COMPLETED
```

## 3. New Dependencies

| Package | App | Purpose |
|---------|-----|---------|
| `replicate` | ai-worker | Official Replicate Node.js SDK |

## 4. Files to Create/Modify

| Action | File | Description |
|--------|------|-------------|
| CREATE | `apps/ai-worker/src/models/replicate-client.ts` | Replicate API wrapper: init client, generate image, download result |
| MODIFY | `apps/ai-worker/src/processors/visualization.processor.ts` | Check for Replicate key → call replicate-client → fallback to mock |
| MODIFY | `apps/ai-worker/package.json` | Add `replicate` npm package |
| CREATE | `apps/web/components/ui/ai-consent-dialog.tsx` | One-time consent dialog before first AI generation |
| MODIFY | `apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx` | Show consent dialog before first Generate click |

## 5. Design Constraints

1. **RA-DC-1:** Replicate API key MUST be in env var `REPLICATE_API_TOKEN`. Never in frontend code, never in git.
2. **RA-DC-2:** If `REPLICATE_API_TOKEN` is not set, system MUST fall back to self-hosted transforms silently. No errors shown to user.
3. **RA-DC-3:** Generated image MUST be downloaded from Replicate and stored locally immediately. Never depend on Replicate URL persistence.
4. **RA-DC-4:** Consent dialog MUST appear before first AI generation. Stored in localStorage. Declining disables AI features.
5. **RA-DC-5:** Timeout for Replicate call: 120 seconds. If exceeded, fall back to self-hosted.
6. **RA-DC-6:** All existing constraints (DC-1 through DC-14, P2-DC, P3-DC) remain in effect.

## 6. Edge Case Decisions

| # | Category | Question | Decision | Rationale |
|---|----------|----------|----------|-----------|
| RA-E1 | Failure | Replicate returns error? | Catch → fall back to self-hosted → log warning → model version 'mock-fallback-v1' | Users always get a result |
| RA-E2 | Privacy | User declines consent? | Disable AI visualization. Show message. Core non-AI features still work. | Respect user choice |
| RA-E3 | Config | API key missing? | Fall back to self-hosted automatically. Log `Replicate key not configured`. | Same as mock mode today |
| RA-E4 | Performance | Replicate cold start (30-60s)? | Show: "Starting AI engine (first time may take up to 60 seconds)..." | Honest UX |
| RA-E5 | Security | API key exposure? | Key only in ai-worker env. Never sent to frontend. | Standard secret management |
| RA-E6 | Data | Replicate image URL expires? | Download immediately → store locally → never depend on URL persistence | Already our pattern |
| RA-E7 | Concurrency | Multiple simultaneous generations? | Each BullMQ job calls Replicate independently. Rate limits cap daily total. | No architecture change needed |

## 7. Replicate Integration Details

### API Call Pattern

```typescript
import Replicate from 'replicate';

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

const output = await replicate.run(
  "stability-ai/sdxl:model-version-hash",  // or best model found
  {
    input: {
      image: photoBase64OrUrl,          // room photo
      prompt: positivePrompt,            // from prompt-builder
      negative_prompt: negativePrompt,   // from prompt-builder
      num_inference_steps: preset === 'final' ? 50 : 20,
      guidance_scale: 7.5,
      // For inpainting (Phase 2):
      // mask: maskBase64,
      // strength: 0.8,
    }
  }
);
// output = URL string or array of URL strings
```

### Model Selection Strategy

Explore these Replicate models for interior design visualization:
1. `stability-ai/sdxl` — General purpose, high quality
2. `stability-ai/stable-diffusion-inpainting` — With mask support
3. `jagilley/controlnet-inpainting` — ControlNet + inpainting
4. Interior design fine-tuned community models
5. Select best based on: quality for interior scenes, speed, cost, ControlNet support

Make model ID configurable via env var `REPLICATE_MODEL_ID` so we can swap models without code changes.

## 8. Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Replicate rate limits our account | Low | Medium | Monitor usage, implement client-side throttling |
| Generated images don't match room perspective | Medium | High | Use ControlNet model that accepts structure image. Test multiple models. |
| Replicate deprecates chosen model | Low | Medium | Model ID is configurable env var. Easy to swap. |
| Cold start latency frustrates users | Medium | Low | Show progress message. Subsequent requests are fast. |
| Cost exceeds budget at scale | Low | Medium | Rate limits cap usage. Monitor daily cost via Replicate dashboard. |

## 9. Open Technical Questions

1. **Best Replicate model for interior design** — Must be evaluated by testing. Configurable via env var.
2. **Image-to-image vs text-to-image** — Image-to-image (send room photo + prompt) produces better room-preserving results than pure text-to-image. Use image-to-image mode.
3. **ControlNet availability on Replicate** — Verify that chosen model supports ControlNet conditioning to preserve room geometry.
