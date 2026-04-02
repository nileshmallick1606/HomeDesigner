# SPEC-025 — Stable Diffusion 1.5 + ControlNet Visualization

**Parent Feature:** Real AI Integration, Spec 025 of 026 (2 of 3)
**Spec Number:** 025
**Prerequisites:** SPEC-024 (Model Manager infrastructure)
**BRD Features:** AI-F2 (SD + ControlNet visualization)

## Status: Not Started

### 1. Objective

Replace the mock color-transform visualization with real Stable Diffusion 1.5 + ControlNet image generation via ONNX Runtime. The system generates photorealistic interior design visualizations conditioned on the original room photo, preserving room geometry via ControlNet edge/depth conditioning.

- **Before:** Visualization uses `mockVisualization()` in `mock-ai.ts` — Sharp color tints per category (blue for CIVIL, cyan for BATHROOM, etc.). Results are obviously filtered versions of the original photo with an "AI Preview" watermark. No real generative AI is involved.
- **After:** Visualization runs the full Stable Diffusion 1.5 pipeline: CLIP text encoding of the design prompt → ControlNet conditioning from the original photo (Canny edges or depth map) → UNet denoising (20 steps draft, 50 steps final) → VAE decoding to output image. Results are photorealistic room renders that preserve the original room's geometry while applying the requested design changes. Real AI outputs have no watermark. Mock fallback retains the watermark.
- **Success criteria:** (1) SD 1.5 ONNX models download lazily via model manager from SPEC-024. (2) ControlNet Canny edge preprocessing produces valid conditioning images. (3) Full SD pipeline generates coherent room visualization images. (4) Fallback to mock on any failure (AI-DC-3). (5) No watermark on real AI outputs; watermark kept on mock outputs.

### 2. Architecture

```
apps/ai-worker/
├── package.json                              (MODIFY — add @xenova/transformers)
├── src/
│   ├── config/
│   │   └── models.ts                         (MODIFY — add SD 1.5 + ControlNet model entries)
│   ├── models/
│   │   ├── mock-ai.ts                        (KEEP — fallback, no changes)
│   │   ├── model-manager.ts                  (KEEP — from SPEC-024, no changes)
│   │   ├── sam.ts                            (KEEP — from SPEC-024, no changes)
│   │   ├── stable-diffusion.ts               (CREATE — SD 1.5 ONNX pipeline wrapper)
│   │   └── controlnet.ts                     (CREATE — ControlNet preprocessors)
│   └── processors/
│       └── visualization.processor.ts        (MODIFY — try real SD+ControlNet → fallback to mock)
```

**Data flow:**

```
BullMQ visualization job arrives
  → visualization.processor.ts
    → modelManager.ensureModel('sd15-text-encoder')
    → modelManager.ensureModel('sd15-unet')
    → modelManager.ensureModel('sd15-vae-decoder')
    → modelManager.ensureModel('sd15-controlnet-canny')
    → controlnet.cannyEdges(photoBuffer) → edge map
    → controlnet.prepareCondition(edgeMap) → ControlNet input tensor
    → stableDiffusion.encode(prompt) → text embeddings (via @xenova/transformers CLIP tokenizer)
    → stableDiffusion.denoise(latents, textEmbeds, controlnetCondition, steps) → denoised latents
    → stableDiffusion.decode(latents) → image buffer
    → post-process (resize to original dimensions, no watermark)
  → on ANY error: fall back to mockVisualization(photoBuffer, category) + addWatermark()
  → upload result → create Visualization record → complete job
```

**Model sizes (total ~5.1GB):**
- `sd15-text-encoder`: ~500MB (CLIP ViT-L/14 text encoder ONNX)
- `sd15-unet`: ~3.4GB (UNet with ControlNet integration ONNX)
- `sd15-vae-decoder`: ~200MB (VAE decoder ONNX)
- `sd15-controlnet-canny`: ~1.0GB (ControlNet Canny model ONNX)

### 3. Design Constraints

| ID | Constraint | Implementation |
|----|-----------|----------------|
| AI-DC-3 | Fallback to mock on any failure | `visualization.processor.ts` wraps entire SD pipeline in try/catch. On failure, calls `mockVisualization()` + `addWatermark()`. Visualization record gets `modelVersion: 'mock-v1'` for mock, `'sd15-cn-v1'` for real. |
| AI-DC-4 | Model version tracking | Visualization record stores `modelVersion: 'sd15-cn-v1'` for real output. `generationParams` JSON stores all generation metadata: steps, model versions, prompt, conditioning type. |
| AI-DC-5 | Memory management (unload idle) | All 4 SD models managed by model-manager from SPEC-024. Each session unloads after 5 min idle independently. Peak memory: ~8GB for all 4 sessions loaded simultaneously. |
| AI-E2 | OOM handling | If `onnxruntime` throws allocation error, catch it specifically, log memory stats via `process.memoryUsage()`, fall back to mock. Consider running inference with `ort.env.wasm.numThreads = 2` to limit parallel memory. |

### 4. Detailed Design

#### 4a. Database / Schema Changes

No schema changes. The existing `Visualization` model already has:
- `modelVersion: String?` — stores `'sd15-cn-v1'` or `'mock-v1'`
- `generationParams: Json?` — stores full generation metadata
- `prompt: String?` — stores the text prompt used
- `imageUrl: String?` — stores the result image URL
- `thumbnailUrl: String?` — stores the thumbnail URL

#### 4b. Backend / API Changes

**File: `apps/ai-worker/package.json`** (MODIFY)
- Add dependency: `"@xenova/transformers": "^3.3.0"`
- Install command: `pnpm add @xenova/transformers` from `apps/ai-worker/`
- Purpose: CLIP tokenizer for text prompt encoding. Provides `AutoTokenizer.from_pretrained()` which loads the CLIP tokenizer vocabulary and handles BPE tokenization entirely in JavaScript.

**File: `apps/ai-worker/src/config/models.ts`** (MODIFY)
- Add 4 new entries to MODEL_REGISTRY:
```typescript
'sd15-text-encoder': {
  name: 'sd15-text-encoder',
  version: 'sd15-cn-v1',
  url: 'https://huggingface.co/onnx-community/stable-diffusion-v1-5/resolve/main/text_encoder/model.onnx',
  filePath: '/app/models/sd15-text-encoder/model.onnx',
  checksum: '<sha256>',
  sizeBytes: 500_000_000,
},
'sd15-unet': {
  name: 'sd15-unet',
  version: 'sd15-cn-v1',
  url: 'https://huggingface.co/onnx-community/stable-diffusion-v1-5/resolve/main/unet/model.onnx',
  filePath: '/app/models/sd15-unet/model.onnx',
  checksum: '<sha256>',
  sizeBytes: 3_400_000_000,
},
'sd15-vae-decoder': {
  name: 'sd15-vae-decoder',
  version: 'sd15-cn-v1',
  url: 'https://huggingface.co/onnx-community/stable-diffusion-v1-5/resolve/main/vae_decoder/model.onnx',
  filePath: '/app/models/sd15-vae-decoder/model.onnx',
  checksum: '<sha256>',
  sizeBytes: 200_000_000,
},
'sd15-controlnet-canny': {
  name: 'sd15-controlnet-canny',
  version: 'sd15-cn-v1',
  url: 'https://huggingface.co/onnx-community/controlnet-canny/resolve/main/model.onnx',
  filePath: '/app/models/sd15-controlnet-canny/model.onnx',
  checksum: '<sha256>',
  sizeBytes: 1_000_000_000,
},
```

**File: `apps/ai-worker/src/models/controlnet.ts`** (CREATE)

Responsibilities:
- `cannyEdges(imageBuffer: Buffer): Promise<Buffer>` — Canny edge detection using Sharp:
  1. Convert to grayscale
  2. Apply Gaussian blur (sigma 1.4) to reduce noise
  3. Apply Sobel-like convolution kernel for gradient magnitude
  4. Threshold at configurable value (default 100) for binary edge map
  5. Return as single-channel PNG buffer
- `depthEstimate(imageBuffer: Buffer): Promise<Buffer>` — Simple gradient-based depth estimation using Sharp:
  1. Convert to grayscale
  2. Apply vertical gradient (top = far/dark, bottom = near/bright) via linear gradient overlay
  3. Blend original luminance with gradient at 50% to approximate monocular depth
  4. Return as single-channel PNG buffer
  5. Note: This is a rough heuristic. MiDaS ONNX model can be added later for accuracy.
- `prepareCondition(conditionImage: Buffer, targetWidth: number, targetHeight: number): Promise<Float32Array>` — Resize condition image to target dimensions (must match SD latent space * 8, typically 512x512). Normalize to [0, 1]. Return as Float32Array in CHW format (1 x 3 x H x W, replicate single channel to 3 channels).

**File: `apps/ai-worker/src/models/stable-diffusion.ts`** (CREATE)

Responsibilities:
- `tokenize(prompt: string): Promise<number[]>` — Uses `@xenova/transformers` `AutoTokenizer` to load CLIP tokenizer (cached after first load). Tokenizes prompt to token IDs. Pads/truncates to 77 tokens (CLIP max length).
- `encode(textEncoderSession: InferenceSession, tokenIds: number[]): Promise<Float32Array>` — Runs CLIP text encoder ONNX session. Input: token IDs tensor (1 x 77 int64). Output: text embeddings tensor (1 x 77 x 768).
- `encodeNegative(textEncoderSession: InferenceSession, negativePrompt: string): Promise<Float32Array>` — Same as encode but for the negative prompt (unconditional guidance). Used for classifier-free guidance.
- `denoise(unetSession: InferenceSession, controlnetSession: InferenceSession, params: DenoiseParams): Promise<Float32Array>` — Core denoising loop:
  1. Initialize random latents (1 x 4 x 64 x 64 for 512x512 output) with configurable seed
  2. Set up noise scheduler (DDPM with configurable steps)
  3. For each step:
     a. Run ControlNet: input = latents + controlnet condition → output = mid/down block residuals
     b. Run UNet: input = latents + text embeddings + ControlNet residuals → output = noise prediction
     c. Apply classifier-free guidance: `noise_pred = uncond + guidance_scale * (cond - uncond)`
     d. Scheduler step: update latents
  4. Return final denoised latents
- `decode(vaeDecoderSession: InferenceSession, latents: Float32Array): Promise<Buffer>` — Runs VAE decoder. Input: latents (1 x 4 x 64 x 64). Output: decoded image pixels (1 x 3 x 512 x 512). Scale from [-1, 1] to [0, 255]. Convert to Sharp buffer and resize to target dimensions. Return as WebP buffer.

Types:
```typescript
interface DenoiseParams {
  textEmbeddings: Float32Array;
  negativeEmbeddings: Float32Array;
  controlnetCondition: Float32Array;
  steps: number;           // 20 for draft, 50 for final
  guidanceScale: number;   // 7.5 default
  seed?: number;           // Random if not provided
  width: number;           // 512 (SD 1.5 native)
  height: number;          // 512 (SD 1.5 native)
}
```

Model version constant: `SD_MODEL_VERSION = 'sd15-cn-v1'`

**File: `apps/ai-worker/src/processors/visualization.processor.ts`** (MODIFY)

Current: directly calls `mockVisualization()` then `addWatermark()`.

New logic:
```
1. Update job status → PROCESSING
2. Download photo buffer
3. Try real SD+ControlNet:
   a. Update job result: { phase: 'Loading models...' }
   b. Load all 4 model sessions via modelManager.ensureModel()
   c. Update job result: { phase: 'Preparing image...' }
   d. const edgeMap = await controlnet.cannyEdges(photoBuffer)
   e. const condition = await controlnet.prepareCondition(edgeMap, 512, 512)
   f. Update job result: { phase: 'Encoding prompt...' }
   g. Build prompt from category (basic version — SPEC-026 adds full prompt engineering)
   h. const tokenIds = await sd.tokenize(prompt)
   i. const textEmbeds = await sd.encode(textEncoderSession, tokenIds)
   j. const negEmbeds = await sd.encodeNegative(textEncoderSession, 'blurry, low quality')
   k. Update job result: { phase: 'Generating visualization...', step: 0, totalSteps: steps }
   l. const latents = await sd.denoise(unetSession, controlnetSession, {
        textEmbeddings: textEmbeds, negativeEmbeddings: negEmbeds,
        controlnetCondition: condition, steps: 20, guidanceScale: 7.5,
        width: 512, height: 512
      })
      — During denoise, update job result with current step every 5 steps
   m. Update job result: { phase: 'Decoding image...' }
   n. let resultBuffer = await sd.decode(vaeDecoderSession, latents)
   o. NO watermark for real AI output
   p. modelVersion = SD_MODEL_VERSION
   q. promptText = prompt
4. Catch → fall back:
   a. logger.error('SD pipeline failed, falling back to mock: ' + error.message)
   b. let resultBuffer = await mockVisualization(photoBuffer, category)
   c. resultBuffer = await addWatermark(resultBuffer)  // Watermark ONLY for mock
   d. modelVersion = 'mock-v1'
   e. promptText = `Mock ${category} visualization`
5. Upload result image + generate/upload thumbnail
6. Create Visualization record with:
   - prompt: promptText
   - modelVersion: modelVersion
   - generationParams: { category, mode: modelVersion === 'mock-v1' ? 'mock' : 'real',
       steps, guidanceScale, conditioningType: 'canny', timestamp }
7. Complete job
```

#### 4c. Frontend / UI Changes

No frontend changes in this spec. The visualization output is served via the same `Visualization.imageUrl` and `Visualization.thumbnailUrl` fields. The room detail page already displays visualizations from these URLs. Real AI outputs will simply look better and lack the watermark.

#### 4d. Shared / Cross-cutting Changes

**Memory considerations:**
- All 4 SD model sessions loaded simultaneously: ~8GB peak RAM
- Combined with SAM from SPEC-024 (~1.5GB): ~9.5GB total if both loaded
- Docker limit is 32GB — comfortable headroom
- Model manager idle unload (SPEC-024 AI-DC-5) will free unused sessions after 5 minutes
- If SAM and SD are never used at the same time, peak is ~8GB

**Concurrency consideration:**
- The ai-worker `visualization` queue has `concurrency: 2` in main.ts
- Two simultaneous SD inferences would need ~16GB — still within 32GB limit
- If memory becomes tight, reduce visualization concurrency to 1 in main.ts

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| MODIFY | apps/ai-worker/package.json | Add @xenova/transformers dependency | Low |
| MODIFY | apps/ai-worker/src/config/models.ts | Add 4 SD/ControlNet model entries to registry | Low |
| CREATE | apps/ai-worker/src/models/controlnet.ts | Canny edge detection, depth estimation, condition preparation | Med |
| CREATE | apps/ai-worker/src/models/stable-diffusion.ts | Full SD 1.5 ONNX pipeline: tokenize, encode, denoise, decode | High |
| MODIFY | apps/ai-worker/src/processors/visualization.processor.ts | Try SD+ControlNet → fallback to mock, remove watermark for real | Med |

### 6. Dependency & Reference Check

#### External Dependencies
- `@xenova/transformers ^3.3.0` — JavaScript port of HuggingFace transformers. Used only for CLIP tokenizer (`AutoTokenizer`). Downloads tokenizer vocabulary (~1MB) on first use, caches locally. No Python dependency.
- `onnxruntime-node` — Already installed from SPEC-024. Used for all 4 SD model sessions.
- `sharp` — Already installed. Used by ControlNet preprocessors for edge detection and image manipulation.

#### Internal Dependencies (from SPEC-024)
- `model-manager.ts` — Used via `modelManager.ensureModel()` for all 4 SD models. No changes to model manager needed.
- `config/models.ts` — Extended with 4 new entries. Same interface, just more entries.
- `mock-ai.ts` — `mockVisualization()` and `addWatermark()` still imported for fallback path.

#### API Dependencies
- `ai.controller.ts` — No changes. POST /api/ai/visualization already passes `category` and `options` to the queue. The visualization processor consumes these from job data.
- `ai.service.ts` — No changes. `requestVisualization()` already enqueues with `category` in job data.

#### HuggingFace Model Sources
- Text encoder: `onnx-community/stable-diffusion-v1-5` — text_encoder/model.onnx
- UNet: `onnx-community/stable-diffusion-v1-5` — unet/model.onnx
- VAE decoder: `onnx-community/stable-diffusion-v1-5` — vae_decoder/model.onnx
- ControlNet Canny: `onnx-community/controlnet-canny` — model.onnx
- All pre-converted to ONNX. Total first-download: ~5.1GB.

### 7. Implementation Plan

**Step 1:** Install @xenova/transformers
- File: apps/ai-worker/package.json
- Action: `pnpm add @xenova/transformers` from apps/ai-worker directory
- Verify: import resolves, `pnpm typecheck` passes

**Step 2:** Add SD model entries to config
- File: apps/ai-worker/src/config/models.ts
- Action: modify — add 4 entries to MODEL_REGISTRY (text-encoder, unet, vae-decoder, controlnet-canny)

**Step 3:** Create ControlNet preprocessor module
- File: apps/ai-worker/src/models/controlnet.ts
- Action: create — implement cannyEdges (Sharp grayscale → blur → Sobel → threshold), depthEstimate (gradient overlay), prepareCondition (resize + normalize to tensor)
- Test: verify cannyEdges produces reasonable edge maps on sample room photos

**Step 4:** Create Stable Diffusion pipeline module
- File: apps/ai-worker/src/models/stable-diffusion.ts
- Action: create — implement tokenize (CLIP via @xenova/transformers), encode/encodeNegative (text encoder ONNX), denoise (ControlNet + UNet loop with scheduler), decode (VAE decoder → Sharp buffer)
- Key: DDPM noise scheduler implementation (alphas_cumprod, step function)
- Key: classifier-free guidance scale application

**Step 5:** Update visualization processor
- File: apps/ai-worker/src/processors/visualization.processor.ts
- Action: modify — add SD+ControlNet pipeline before mock fallback, remove watermark for real outputs, update job phases, store generation metadata in Visualization.generationParams

**Step 6:** Verify end-to-end
- Trigger visualization job via API
- Confirm models download on first run
- Confirm output image is generated (or falls back to mock)
- Confirm no watermark on real output, watermark on mock

### 8. Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|-----------|
| OOM during SD inference (~8GB for 4 models + tensors) | High | Med | 32GB Docker limit provides headroom. Reduce visualization concurrency from 2 to 1 if needed. Model manager unloads idle models. Catch allocation errors and fall back to mock (AI-E2). |
| SD 1.5 ONNX produces low-quality or incoherent images | Med | Med | Start with 20-step draft. Tune guidance scale (default 7.5). ControlNet conditioning preserves room geometry. SPEC-026 adds prompt engineering for quality. |
| @xenova/transformers CLIP tokenizer fails to load | Med | Low | Fallback: hardcode BPE vocabulary for common interior design tokens. Or fall back to mock. Log error for investigation. |
| ControlNet Canny edges too noisy or too sparse | Med | Med | Tune Gaussian blur sigma (1.0-2.0) and threshold (50-150). Provide configurable parameters. Poor edges degrade output quality but don't crash — SD still generates, just less geometry-faithful. |
| 5.1GB model download takes too long on slow networks | Med | Med | Models download lazily on first job (AI-DC-1). Progress logged (AI-DC-2). Users see "Downloading models..." phase. Subsequent jobs are instant. Docker volume persists across restarts. |
| DDPM scheduler implementation bugs (noise scheduling) | High | Med | Use well-known alpha schedule from SD 1.5 paper. Test against reference outputs. Bugs produce garbage images — caught by visual inspection. Fall back to mock on NaN/Inf detection. |
| Multiple concurrent SD jobs exhaust memory | High | Low | Visualization queue concurrency is 2. Two simultaneous jobs need ~16GB. Monitor `process.memoryUsage()`. If approaching limit, queue jobs sequentially by reducing concurrency to 1. |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests

**controlnet.test.ts:**
- `cannyEdges()` produces a valid PNG buffer from a sample image
- `cannyEdges()` output is grayscale (single channel when inspected)
- `cannyEdges()` edge pixels are binary (0 or 255 after threshold)
- `depthEstimate()` produces gradient from dark (top) to light (bottom)
- `prepareCondition()` resizes to target dimensions (512x512)
- `prepareCondition()` produces Float32Array of correct length (3 * 512 * 512)
- `prepareCondition()` normalizes values to [0, 1] range
- `prepareCondition()` replicates single channel to 3 channels

**stable-diffusion.test.ts:**
- `tokenize()` produces array of integers, length 77 (padded)
- `tokenize()` handles empty string (produces padding tokens only)
- `tokenize()` handles long string (truncates to 77 tokens)
- `encode()` calls session.run with correct input tensor shape (1 x 77)
- `encode()` returns Float32Array of correct embedding size
- `encodeNegative()` works same as encode but with negative prompt
- `denoise()` runs correct number of steps (verify loop count)
- `denoise()` applies classifier-free guidance (verify formula)
- `denoise()` returns latents of correct shape (1 x 4 x 64 x 64)
- `decode()` returns a valid image buffer (WebP format)
- `decode()` scales pixel values from [-1,1] to [0,255]

**visualization.processor.test.ts (updated):**
- Real path: processor calls all 4 ensureModel, runs pipeline, creates Visualization with `modelVersion: 'sd15-cn-v1'`
- Real path: no watermark applied (verify buffer does not contain watermark SVG overlay)
- Fallback path: mock pipeline failure → calls mockVisualization + addWatermark → `modelVersion: 'mock-v1'`
- Generation params stored correctly in Visualization.generationParams JSON

#### 9b. Integration Tests

- Full visualization pipeline with mocked ONNX sessions: verify data flows from photo download → edge detection → CLIP encoding → denoise → decode → upload → Visualization record
- Fallback integration: force model loading to throw → verify entire processor falls back cleanly, creates valid Visualization record with mock data
- Phase update integration: verify job.result updates at each phase (Loading models → Preparing image → Encoding prompt → Generating visualization → Decoding image)
- Memory tracking: run visualization and verify `process.memoryUsage().heapUsed` stays under 16GB

#### 9c. E2E / Smoke Tests

- With model volume empty: trigger visualization job → verify all 4 models download → visualization completes with `modelVersion: 'sd15-cn-v1'`
- With models cached: trigger job → no downloads → completes faster
- Force SD failure (delete UNet model file mid-processing): verify fallback to mock
- Visual inspection: real SD output should show room geometry preserved (walls, floor, ceiling match original photo edges)
- Watermark check: real output has no watermark text overlay; mock output has "AI Preview" watermark

### 10. Verification Criteria

- [ ] `@xenova/transformers` installed in apps/ai-worker/package.json and imports resolve
- [ ] `models.ts` config defines all 4 SD/ControlNet models with URLs, paths, versions
- [ ] `controlnet.ts` produces valid Canny edge maps from room photos
- [ ] `controlnet.ts` prepares condition tensors in correct shape and range
- [ ] `stable-diffusion.ts` tokenizes prompts to 77-token sequences via CLIP
- [ ] `stable-diffusion.ts` encodes text to embedding tensors via ONNX text encoder
- [ ] `stable-diffusion.ts` runs denoising loop with ControlNet conditioning
- [ ] `stable-diffusion.ts` decodes latents to image buffers via VAE decoder
- [ ] `visualization.processor.ts` tries real SD+ControlNet first (AI-DC-3 fallback)
- [ ] Real AI outputs have NO watermark
- [ ] Mock fallback outputs retain "AI Preview" watermark
- [ ] Visualization record stores correct `modelVersion` — `'sd15-cn-v1'` or `'mock-v1'` (AI-DC-4)
- [ ] `generationParams` JSON includes steps, guidanceScale, conditioningType, mode
- [ ] Job result updates with phase info during processing
- [ ] OOM errors caught and handled with mock fallback (AI-E2)
- [ ] `pnpm typecheck` passes in ai-worker
- [ ] All existing tests continue to pass
