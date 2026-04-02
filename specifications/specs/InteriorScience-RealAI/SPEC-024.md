# SPEC-024 — Model Manager + SAM Segmentation

**Parent Feature:** Real AI Integration, Spec 024 of 026 (1 of 3)
**Spec Number:** 024
**Prerequisites:** None (MVP complete)
**BRD Features:** AI-F1 (SAM Segmentation) + Model Manager infrastructure

## Status: Not Started

### 1. Objective

Build the foundational model management infrastructure and replace mock segmentation with real SAM (Segment Anything Model) inference via ONNX Runtime. The model manager handles lazy downloading, caching, loading, and memory lifecycle for all AI models. SAM-ViT-B provides pixel-level room element segmentation (walls, floors, ceilings, windows, doors, fixtures).

- **Before:** Segmentation uses `mockSegmentation()` in `mock-ai.ts` — a Laplacian edge-detection filter via Sharp. Results are a simple edge map with hardcoded labels `['wall', 'floor', 'ceiling', 'window', 'door']`. No real AI models are loaded or used.
- **After:** On first segmentation job, the model manager lazily downloads SAM-ViT-B ONNX (~375MB) from HuggingFace onnx-community to `/models/` volume. Subsequent jobs reuse cached model files. SAM produces real per-pixel masks. A post-processing heuristic labels detected segments by position and size (top = ceiling, bottom = floor, large vertical = wall, rectangular = window/door, small = fixture). If SAM fails for any reason (download error, OOM, corrupt model), the processor transparently falls back to `mockSegmentation()` so users always get a result.
- **Success criteria:** (1) Model manager can download, cache, load, and unload ONNX models. (2) SAM inference produces multi-segment masks from real room photos. (3) Fallback to mock works if SAM fails. (4) Models auto-unload after 5 minutes idle. (5) Docker volume `/models/` persists across container restarts.

### 2. Architecture

```
apps/ai-worker/
├── package.json                          (MODIFY — add onnxruntime-node)
├── src/
│   ├── config/
│   │   └── models.ts                     (CREATE — model registry: URLs, paths, versions, checksums)
│   ├── models/
│   │   ├── mock-ai.ts                    (KEEP — fallback, no changes)
│   │   ├── model-manager.ts              (CREATE — download, load, cache, unload lifecycle)
│   │   └── sam.ts                        (CREATE — SAM-ViT-B ONNX wrapper)
│   └── processors/
│       └── segmentation.processor.ts     (MODIFY — try SAM → fallback to mock)

docker-compose.yml
└── ai-worker service
    └── volumes: model-cache:/app/models  (EXISTING — already configured)
```

**Data flow:**

```
BullMQ job arrives
  → segmentation.processor.ts
    → modelManager.ensureModel('sam-vit-b')
      → isModelDownloaded('/models/sam-vit-b/model.onnx')?
        → NO: downloadModel(url, '/models/sam-vit-b/model.onnx') + log progress
        → YES: skip download
      → loadModel('/models/sam-vit-b/model.onnx') → InferenceSession (cached in memory)
    → sam.preprocessImage(photoBuffer) → 1024x1024 normalized tensor
    → sam.runInference(session, tensorData) → raw masks
    → sam.postProcess(masks) → labeled elements JSON
  → on ANY error: fall back to mockSegmentation(photoBuffer)
  → upload mask → create Segmentation record → complete job
```

### 3. Design Constraints

| ID | Constraint | Implementation |
|----|-----------|----------------|
| AI-DC-1 | Lazy model download — never block worker startup | `ensureModel()` called inside job processor, not in `main.ts`. Worker starts immediately, model downloads on first job. |
| AI-DC-2 | Download progress logging | `downloadModel()` logs percentage at 10% intervals: `[ModelManager] Downloading sam-vit-b: 50% (187MB / 375MB)` |
| AI-DC-3 | Fallback to mock on any failure | `segmentation.processor.ts` wraps SAM path in try/catch. Catch block calls `mockSegmentation()`. Segmentation record gets `modelVersion: 'mock-v1'` for mock, `'sam-vit-b-v1'` for real. |
| AI-DC-4 | Model version tracking | Every Segmentation record stores `modelVersion`. Config registry in `models.ts` maps model name to version string. |
| AI-DC-5 | Memory management — unload idle models after 5 min | Model manager tracks `lastUsedAt` per loaded session. A `setInterval` (60s check) calls `session.release()` and removes from cache if idle > 5 min. |

### 4. Detailed Design

#### 4a. Database / Schema Changes

No schema changes. The existing `Segmentation.modelVersion` field (String, nullable) and `Segmentation.elements` (Json) already support real model outputs.

#### 4b. Backend / API Changes

**File: `apps/ai-worker/package.json`** (MODIFY)
- Add dependency: `"onnxruntime-node": "^1.21.0"`
- Install command: `pnpm add onnxruntime-node` from `apps/ai-worker/`

**File: `apps/ai-worker/src/config/models.ts`** (CREATE)
```typescript
export interface ModelConfig {
  name: string;
  version: string;
  url: string;            // HuggingFace onnx-community URL
  filePath: string;       // Local path under /models/ volume
  checksum: string;       // SHA-256 for integrity verification
  sizeBytes: number;      // Expected size for progress calculation
}

export const MODEL_REGISTRY: Record<string, ModelConfig> = {
  'sam-vit-b': {
    name: 'sam-vit-b',
    version: 'sam-vit-b-v1',
    url: 'https://huggingface.co/onnx-community/sam-vit-base/resolve/main/model.onnx',
    filePath: '/models/sam-vit-b/model.onnx',
    checksum: '<sha256-to-be-verified-at-implementation>',
    sizeBytes: 375_000_000,
  },
};

export const MODEL_BASE_PATH = process.env.MODEL_PATH || '/models';
export const MODEL_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
export const MODEL_CACHE_CHECK_INTERVAL_MS = 60 * 1000; // 1 minute
```

**File: `apps/ai-worker/src/models/model-manager.ts`** (CREATE)

Responsibilities:
- `downloadModel(config: ModelConfig): Promise<void>` — Streams model file from URL to disk. Creates parent directory. Logs progress at 10% intervals. Verifies checksum on completion. Throws on network error or checksum mismatch.
- `loadModel(config: ModelConfig): Promise<InferenceSession>` — Checks in-memory cache first. If not cached, creates `ort.InferenceSession.create(filePath)`. Stores in cache with `lastUsedAt` timestamp. Returns session.
- `ensureModel(modelName: string): Promise<InferenceSession>` — Orchestrates: check downloaded → download if needed → load → return session. This is the main entry point for processors.
- `isModelDownloaded(filePath: string): Promise<boolean>` — Checks `fs.existsSync` + file size matches expected.
- `unloadIdleModels(): void` — Called by interval timer. Iterates cache, releases sessions idle > 5 min.
- `shutdown(): Promise<void>` — Releases all sessions, clears cache. Called from `main.ts` shutdown handler.

Internal state:
```typescript
interface CachedModel {
  session: InferenceSession;
  lastUsedAt: number;
  config: ModelConfig;
}
private cache = new Map<string, CachedModel>();
```

Singleton pattern: export a single `modelManager` instance. Register the idle-check interval on first `ensureModel()` call (not at import time, to avoid startup side effects).

**File: `apps/ai-worker/src/models/sam.ts`** (CREATE)

Responsibilities:
- `preprocessImage(imageBuffer: Buffer): Promise<Float32Array>` — Uses Sharp to resize to 1024x1024 (letterbox, preserve aspect ratio, pad with zeros). Extracts raw RGB pixels. Normalizes to [0, 1] float range. Returns flat Float32Array in CHW format (3 x 1024 x 1024).
- `runInference(session: InferenceSession, imageData: Float32Array): Promise<Float32Array[]>` — Creates ONNX tensor from imageData. Runs `session.run()` with appropriate input names. Extracts mask outputs. Returns array of mask tensors.
- `postProcess(masks: Float32Array[], originalWidth: number, originalHeight: number): { labels: string[]; regions: Array<{ label: string; bbox: number[]; area: number }> }` — For each mask: threshold at 0.5, compute bounding box and area. Label by heuristic:
  - Top 20% of image, large area → `ceiling`
  - Bottom 20% of image, large area → `floor`
  - Large vertical regions → `wall`
  - Rectangular, mid-height, width > height → `window`
  - Tall rectangular, mid-height → `door`
  - Small regions → `fixture`
- `generateMaskImage(masks: Float32Array[], width: number, height: number): Promise<Buffer>` — Composites all masks into a single color-coded PNG (each label gets a distinct color). Used for the `maskUrl` upload.

Model version constant: `SAM_MODEL_VERSION = 'sam-vit-b-v1'`

**File: `apps/ai-worker/src/processors/segmentation.processor.ts`** (MODIFY)

Current: directly calls `mockSegmentation()`.

New logic:
```
1. Update job status → PROCESSING
2. Download photo
3. Try real SAM:
   a. Update job result with { phase: 'Downloading model...' } if model not yet downloaded
   b. const session = await modelManager.ensureModel('sam-vit-b')
   c. Update job result with { phase: 'Running segmentation...' }
   d. const imageData = await sam.preprocessImage(photoBuffer)
   e. const masks = await sam.runInference(session, imageData)
   f. const elements = sam.postProcess(masks, width, height)
   g. const maskBuffer = await sam.generateMaskImage(masks, width, height)
   h. modelVersion = SAM_MODEL_VERSION
4. Catch → fall back:
   a. logger.error('SAM failed, falling back to mock: ' + error.message)
   b. const maskBuffer = await mockSegmentation(photoBuffer)
   c. elements = { labels: ['wall','floor','ceiling','window','door'], note: 'Mock segmentation — edge detection only' }
   d. modelVersion = 'mock-v1'
5. Upload mask, create Segmentation record (with actual modelVersion), complete job
```

**File: `apps/ai-worker/src/main.ts`** (MODIFY — minor)
- Import `modelManager` from `./models/model-manager`
- In `shutdown()` handler, call `await modelManager.shutdown()` before closing workers

#### 4c. Frontend / UI Changes

No frontend changes. Segmentation is transparent to the UI — the `Segmentation` record is created with real or mock data and the existing API serves it the same way.

#### 4d. Shared / Cross-cutting Changes

**Docker volume mapping** (EXISTING — no changes needed):
- `docker-compose.yml` line 86: `model-cache:/app/models` already maps the named volume.
- The `MODEL_BASE_PATH` default of `/models` matches the volume mount at `/app/models` only if we use `/app/models`. Update `MODEL_BASE_PATH` default to `/app/models` to match Docker, or use `process.env.MODEL_PATH` set in docker-compose environment. Recommended: add `MODEL_PATH=/app/models` to docker-compose environment variables for ai-worker.

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| MODIFY | apps/ai-worker/package.json | Add onnxruntime-node dependency | Low |
| CREATE | apps/ai-worker/src/config/models.ts | Model registry with URLs, paths, versions, checksums | Low |
| CREATE | apps/ai-worker/src/models/model-manager.ts | Download, load, cache, unload lifecycle manager | High |
| CREATE | apps/ai-worker/src/models/sam.ts | SAM-ViT-B ONNX wrapper: preprocess, infer, postprocess | High |
| MODIFY | apps/ai-worker/src/processors/segmentation.processor.ts | Try SAM → fallback to mock | Med |
| MODIFY | apps/ai-worker/src/main.ts | Add modelManager.shutdown() to graceful shutdown | Low |
| MODIFY | docker-compose.yml | Add MODEL_PATH env var to ai-worker service | Low |

### 6. Dependency & Reference Check

#### External Dependencies
- `onnxruntime-node ^1.21.0` — Native ONNX Runtime bindings for Node.js. Provides `InferenceSession` for loading and running ONNX models. ~50MB installed (includes native binary). Requires Node 18+.
- `sharp` — Already installed. Used by SAM preprocessor for image resizing and pixel extraction, and by mask image generator.

#### Internal Dependencies
- `mock-ai.ts` — Unchanged. Still exported for fallback use in `segmentation.processor.ts`.
- `prisma` — Used by processor to update job status and create Segmentation records. No schema changes.
- `storage` — Used by processor to download photos and upload masks. No changes.
- `main.ts` — Needs minor update to call `modelManager.shutdown()`.

#### Docker / Infrastructure
- `model-cache` volume — Already defined in `docker-compose.yml`. Persists `/app/models` across container restarts.
- 32GB memory limit — Already configured via `deploy.resources.limits.memory: 32G`. SAM-ViT-B uses ~1.5GB RAM during inference.

#### HuggingFace Model Source
- URL: `https://huggingface.co/onnx-community/sam-vit-base/resolve/main/model.onnx`
- Pre-converted ONNX format — no Python/PyTorch conversion needed.
- First download: ~375MB, takes 1-5 minutes depending on network.

### 7. Implementation Plan

**Step 1:** Install onnxruntime-node
- File: apps/ai-worker/package.json
- Action: `pnpm add onnxruntime-node` from apps/ai-worker directory
- Verify: `pnpm typecheck` passes

**Step 2:** Create model config registry
- File: apps/ai-worker/src/config/models.ts
- Action: create — define ModelConfig interface, MODEL_REGISTRY with sam-vit-b entry, constants

**Step 3:** Create model manager
- File: apps/ai-worker/src/models/model-manager.ts
- Action: create — implement downloadModel, loadModel, ensureModel, isModelDownloaded, unloadIdleModels, shutdown
- Key: use `node:fs/promises` + `node:https` (or `fetch`) for streaming download with progress
- Key: singleton pattern, lazy interval registration

**Step 4:** Create SAM wrapper
- File: apps/ai-worker/src/models/sam.ts
- Action: create — implement preprocessImage, runInference, postProcess, generateMaskImage
- Key: correct tensor shape (1 x 3 x 1024 x 1024), CHW format, float32 normalization

**Step 5:** Update segmentation processor
- File: apps/ai-worker/src/processors/segmentation.processor.ts
- Action: modify — wrap existing logic in try/catch, add SAM path before mock fallback
- Key: update job.result with phase info for UI progress feedback

**Step 6:** Update main.ts shutdown
- File: apps/ai-worker/src/main.ts
- Action: modify — import modelManager, call shutdown() in graceful shutdown handler

**Step 7:** Update docker-compose environment
- File: docker-compose.yml
- Action: modify — add `MODEL_PATH=/app/models` to ai-worker environment list

### 8. Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|-----------|
| ONNX Runtime fails to load on Docker Linux | High | Low | onnxruntime-node supports Linux x64 natively. Test in Docker build step. If fails, fall back to mock (AI-DC-3). |
| SAM model download interrupted (network) | Med | Med | Implement atomic download: write to `.tmp` file, rename on completion. Partial files are not treated as downloaded. Retry on next job. |
| OOM during SAM inference (375MB model + image tensors) | Med | Low | 32GB Docker limit is ample for SAM (~1.5GB peak). Monitor with `process.memoryUsage()`. If OOM, catch and fall back to mock. |
| HuggingFace URL changes or becomes unavailable | Med | Low | Pin exact revision hash in URL. If download fails, mock fallback ensures users always get results. Log warning for ops alerting. |
| Checksum mismatch after download | Low | Low | Delete corrupt file, log error, fall back to mock. Next job retries download. |
| Idle unload timer fires during active inference | Low | Low | Update `lastUsedAt` at start of inference, not just at load time. Unload check skips sessions currently in use (add `inUse` flag). |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests

**model-manager.test.ts:**
- `isModelDownloaded()` returns false for missing file
- `isModelDownloaded()` returns true for existing file with correct size
- `isModelDownloaded()` returns false for file with wrong size (partial download)
- `loadModel()` caches session and returns same instance on second call
- `loadModel()` updates `lastUsedAt` on each access
- `unloadIdleModels()` releases sessions idle > 5 min
- `unloadIdleModels()` keeps sessions used within 5 min
- `ensureModel()` downloads if not present, then loads
- `ensureModel()` skips download if already present
- `shutdown()` releases all cached sessions

**sam.test.ts:**
- `preprocessImage()` resizes to 1024x1024 and produces Float32Array of correct length (3 * 1024 * 1024)
- `preprocessImage()` normalizes pixel values to [0, 1] range
- `preprocessImage()` preserves aspect ratio with letterboxing
- `postProcess()` labels top-region mask as ceiling
- `postProcess()` labels bottom-region mask as floor
- `postProcess()` labels large vertical region as wall
- `postProcess()` returns empty labels for no masks
- `generateMaskImage()` produces valid PNG buffer

**models.ts (config):**
- MODEL_REGISTRY contains 'sam-vit-b' entry with all required fields
- All file paths start with MODEL_BASE_PATH

#### 9b. Integration Tests

- Full segmentation processor with mocked ONNX session: processor calls ensureModel, runs SAM pipeline, creates Segmentation record with real model version
- Fallback path: mock onnxruntime to throw, verify processor falls back to mockSegmentation and creates record with `modelVersion: 'mock-v1'`
- Download progress logging: mock HTTP response with Content-Length, verify progress logs emitted at 10% intervals
- Job phase updates: verify job.result is updated with `{ phase: 'Downloading model...' }` and `{ phase: 'Running segmentation...' }` during processing

#### 9c. E2E / Smoke Tests

- With model volume empty: trigger segmentation job → verify model downloads → segmentation completes with `modelVersion: 'sam-vit-b-v1'`
- With model already cached: trigger segmentation job → verify no download occurs → completes faster
- Force SAM failure (corrupt model file): trigger job → verify fallback to mock → record has `modelVersion: 'mock-v1'`
- Container restart: verify model persists on volume and second run skips download

### 10. Verification Criteria

- [ ] `onnxruntime-node` installed in apps/ai-worker/package.json and imports resolve
- [ ] `models.ts` config defines sam-vit-b with URL, path, version, checksum, size
- [ ] `model-manager.ts` implements download with progress logging (AI-DC-2)
- [ ] `model-manager.ts` implements lazy download — no downloads at worker startup (AI-DC-1)
- [ ] `model-manager.ts` implements 5-minute idle unload (AI-DC-5)
- [ ] `sam.ts` preprocesses images to 1024x1024 normalized float tensors
- [ ] `sam.ts` runs ONNX inference and returns mask data
- [ ] `sam.ts` post-processes masks into labeled elements with position heuristic
- [ ] `segmentation.processor.ts` tries SAM first, falls back to mock on failure (AI-DC-3)
- [ ] `segmentation.processor.ts` updates job with phase info during processing
- [ ] Segmentation record stores correct `modelVersion` — real or mock (AI-DC-4)
- [ ] `main.ts` calls `modelManager.shutdown()` on graceful shutdown
- [ ] Docker volume `/app/models` persists models across container restarts
- [ ] `pnpm typecheck` passes in ai-worker
- [ ] All existing tests continue to pass (mock path unchanged)
