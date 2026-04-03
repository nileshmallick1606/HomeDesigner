# SPEC-029 — Replicate Client + Visualization Processor

**Parent Feature:** Replicate AI Visualization, Spec 029 of 030 (1 of 2)
**Spec Number:** 029
**Prerequisites:** None (existing ai-worker with mock/enhanced visualization)
**BRD Features:** RA-1 (Replicate engine), RA-3 (fallback), RA-4 (presets), RA-5 (model selection), RA-6 (rate limits), RA-7 (no watermark)

## Status: Not Started

### 1. Objective

Integrate the Replicate cloud AI platform as the primary visualization engine in the ai-worker, replacing the self-hosted Stable Diffusion path with API calls to Replicate-hosted models. The Replicate client handles image upload (as base64), model invocation, result download, and error handling. The visualization processor gains a three-tier execution flow: Replicate (preferred) -> self-hosted SD (if configured) -> mock fallback (always available). When Replicate produces a result, no watermark is applied.

- **Before:** The visualization processor has two paths: (1) `enableRealAI=true` calls `generateVisualization()` from `stable-diffusion.ts` which requires a local SD + ControlNet model setup, or (2) `mockVisualization()` from `mock-ai.ts` which applies Sharp color transforms + watermark. There is no cloud AI option. Users who cannot run local SD models are stuck with mock previews.
- **After:** When `REPLICATE_API_TOKEN` is set in environment variables, the processor calls Replicate's cloud API as the first choice. The model is configurable via `REPLICATE_MODEL_ID` (defaulting to `stability-ai/sdxl:latest`). Replicate handles all GPU inference — no local GPU needed. The quality preset (draft/final) maps to inference step counts (20/50). If Replicate fails (timeout, rate limit, model error), the processor falls back to mock visualization with watermark and logs the failure. If `REPLICATE_API_TOKEN` is not set, the processor follows the existing `enableRealAI` -> mock flow unchanged.
- **Success criteria:** (1) `replicate` npm package installed in ai-worker. (2) `replicate-client.ts` can call Replicate API and return an image buffer. (3) Processor tries Replicate first when token is configured. (4) Fallback to mock works on any Replicate error. (5) No watermark on Replicate-generated images. (6) Model ID is configurable via env var. (7) 120-second timeout on Replicate calls. (8) Rate limit errors are caught and produce clear log messages.

### 2. Architecture

```
apps/ai-worker/
├── package.json                          (MODIFY — add replicate npm package)
├── src/
│   ├── models/
│   │   ├── mock-ai.ts                    (KEEP — fallback, no changes)
│   │   ├── stable-diffusion.ts           (KEEP — secondary path, no changes)
│   │   └── replicate-client.ts           (CREATE — Replicate API wrapper)
│   └── processors/
│       └── visualization.processor.ts    (MODIFY — add Replicate as primary path)
```

**Data flow:**

```
BullMQ job arrives
  → visualization.processor.ts
    → isReplicateConfigured()?
      → YES:
        → generateVisualization(photoBuffer, prompt, negativePrompt, preset)
          → convert photoBuffer to base64 data URI
          → replicate.run(modelId, { input: { image, prompt, negative_prompt, steps, guidance_scale } })
          → result is URL string → fetch → download as Buffer
          → return { imageBuffer, modelVersion: 'replicate-<modelId>' }
        → useWatermark = false
        → on ANY error: log, fall through to mock fallback
      → NO:
        → enableRealAI?
          → YES: existing stable-diffusion.ts path
          → NO: mockVisualization() + watermark
  → upload result → create Visualization record → complete job
```

### 3. Design Constraints

| ID | Constraint | Implementation |
|----|-----------|----------------|
| RA-DC-1 | API key stored in environment variable, never in code | `replicate-client.ts` reads `REPLICATE_API_TOKEN` from `process.env`. The Replicate SDK constructor accepts this token. No hardcoded keys anywhere. `.env.example` documents the variable name without a value. |
| RA-DC-2 | Fallback when no API key is set | `isReplicateConfigured()` returns `false` if `REPLICATE_API_TOKEN` is unset or empty. Processor skips Replicate path entirely and falls through to existing `enableRealAI` / mock flow. No errors thrown for missing key. |
| RA-DC-3 | Download and store result locally | After `replicate.run()` returns a URL, the client fetches the image bytes via `fetch()` and returns them as a `Buffer`. The processor then uploads to project storage via `storage.upload()` as with all other visualization paths. No external URLs stored in the database. |
| RA-DC-5 | 120-second timeout on Replicate calls | `replicate.run()` is wrapped in a `Promise.race()` with a 120-second timeout. If the timeout fires first, the promise rejects with a clear `ReplicateTimeoutError` message, triggering fallback. |
| RA-DC-6 | Existing constraints still apply | All existing design constraints from previous specs (model version tracking, thumbnail generation, job status updates) remain in force. Replicate path stores `modelVersion: 'replicate-<modelId>'` for tracking. |

### 4. Detailed Design

#### 4a. Database / Schema Changes

No schema changes. The existing fields handle all new data:
- `Visualization.modelVersion: String?` — Stores `'replicate-stability-ai/sdxl:latest'` or similar for Replicate results.
- `Visualization.generationParams: Json?` — Stores Replicate-specific metadata: `{ provider: 'replicate', modelId, preset, steps, guidanceScale }`.
- `Visualization.prompt: String?` — Stores the positive prompt sent to Replicate.
- `AiJob.status` / `AiJob.error` — Unchanged, used for job lifecycle as before.

#### 4b. Backend / API Changes

**File: `apps/ai-worker/package.json`** (MODIFY)
- Add dependency: `"replicate": "^1.0.0"` (or latest stable)
- Install command: `pnpm add replicate` from `apps/ai-worker/` directory

**File: `apps/ai-worker/src/models/replicate-client.ts`** (CREATE)

```typescript
import Replicate from 'replicate';

const logger = {
  log: (msg: string) => console.log(`[ReplicateClient] ${msg}`),
  error: (msg: string) => console.error(`[ReplicateClient] ${msg}`),
};

const REPLICATE_TIMEOUT_MS = 120_000; // 120 seconds

/**
 * Check if Replicate is configured (API token present in environment).
 */
export function isReplicateConfigured(): boolean {
  const token = process.env.REPLICATE_API_TOKEN?.trim();
  return !!token && token.length > 0;
}

/**
 * Initialize and return a Replicate client instance.
 * Only call this when isReplicateConfigured() is true.
 */
function createClient(): Replicate {
  return new Replicate({
    auth: process.env.REPLICATE_API_TOKEN!.trim(),
  });
}

interface ReplicateResult {
  imageBuffer: Buffer;
  modelVersion: string;
}

/**
 * Generate a visualization using Replicate's cloud API.
 *
 * @param photoBuffer - Original room photo as Buffer
 * @param prompt - Positive prompt for image generation
 * @param negativePrompt - Negative prompt to avoid artifacts
 * @param preset - Quality preset: 'draft' (20 steps) or 'final' (50 steps)
 * @returns Image buffer and model version string
 * @throws On timeout (120s), rate limit, model not found, or network error
 */
export async function generateVisualization(
  photoBuffer: Buffer,
  prompt: string,
  negativePrompt: string,
  preset: 'draft' | 'final' = 'draft',
): Promise<ReplicateResult> {
  const client = createClient();
  const modelId = process.env.REPLICATE_MODEL_ID?.trim() || 'stability-ai/sdxl:latest';
  const steps = preset === 'final' ? 50 : 20;
  const guidanceScale = 7.5;

  // Convert photo to base64 data URI for Replicate input
  const base64 = photoBuffer.toString('base64');
  const mimeType = 'image/jpeg'; // Room photos are JPEG from upload pipeline
  const dataUri = `data:${mimeType};base64,${base64}`;

  logger.log(`Calling Replicate model: ${modelId}, preset: ${preset}, steps: ${steps}`);

  // Run with timeout
  const replicatePromise = client.run(modelId as `${string}/${string}:${string}`, {
    input: {
      image: dataUri,
      prompt,
      negative_prompt: negativePrompt,
      num_inference_steps: steps,
      guidance_scale: guidanceScale,
    },
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Replicate timeout: model ${modelId} did not respond within ${REPLICATE_TIMEOUT_MS / 1000}s`)), REPLICATE_TIMEOUT_MS);
  });

  let output: unknown;
  try {
    output = await Promise.race([replicatePromise, timeoutPromise]);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);

    // Classify error for clear logging
    if (errMsg.includes('timeout')) {
      logger.error(`Timeout after ${REPLICATE_TIMEOUT_MS / 1000}s: ${errMsg}`);
      throw new Error(`Replicate timeout: ${errMsg}`);
    }
    if (errMsg.includes('rate limit') || errMsg.includes('429')) {
      logger.error(`Rate limited by Replicate: ${errMsg}`);
      throw new Error(`Replicate rate limit exceeded: ${errMsg}`);
    }
    if (errMsg.includes('not found') || errMsg.includes('404')) {
      logger.error(`Model not found: ${modelId} — ${errMsg}`);
      throw new Error(`Replicate model not found: ${modelId}`);
    }

    logger.error(`Replicate API error: ${errMsg}`);
    throw error;
  }

  // Replicate returns a URL (string) or array of URLs — extract the result URL
  let resultUrl: string;
  if (typeof output === 'string') {
    resultUrl = output;
  } else if (Array.isArray(output) && typeof output[0] === 'string') {
    resultUrl = output[0];
  } else {
    throw new Error(`Unexpected Replicate output format: ${JSON.stringify(output).substring(0, 200)}`);
  }

  // Download the generated image
  logger.log(`Downloading result from: ${resultUrl.substring(0, 80)}...`);
  const response = await fetch(resultUrl);
  if (!response.ok) {
    throw new Error(`Failed to download Replicate result: HTTP ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuffer);

  logger.log(`Downloaded ${imageBuffer.length} bytes from Replicate`);

  return {
    imageBuffer,
    modelVersion: `replicate-${modelId}`,
  };
}
```

Key design decisions:
- `createClient()` is called per-invocation, not cached as a singleton, because the token could theoretically change (container restart with new env). The Replicate SDK is lightweight — no session state.
- `Promise.race()` for timeout rather than AbortController, because the Replicate SDK's `run()` method handles its own polling internally and AbortController support varies.
- Error classification (timeout, rate limit, model not found) provides clear log messages for ops debugging. All errors propagate to the processor's catch block for fallback.
- The `modelId` type cast `as \`\${string}/\${string}:\${string}\`` satisfies the Replicate SDK's template literal type for model identifiers.

**File: `apps/ai-worker/src/processors/visualization.processor.ts`** (MODIFY)

Current flow (2 tiers): `enableRealAI` -> mock.
New flow (3 tiers): Replicate -> `enableRealAI` -> mock.

Changes:
1. Add import at top: `import { isReplicateConfigured, generateVisualization as replicateGenerate } from '../models/replicate-client';`
2. Add import for prompt builder (already exists from SPEC-026): `import { buildPrompt, QUALITY_PRESETS } from '../models/prompt-builder';`
3. Replace the `enableRealAI` conditional block with the three-tier flow:

```typescript
// Build structured prompt (from SPEC-026 prompt-builder)
const { positive, negative } = buildPrompt({
  category: category || 'OTHER',
});
const qualityPreset = (preset as 'draft' | 'final') || 'draft';

if (isReplicateConfigured()) {
  // Tier 1: Replicate cloud AI (preferred)
  try {
    logger.log('Attempting Replicate cloud visualization...');
    const result = await replicateGenerate(photoBuffer, positive, negative, qualityPreset);
    resultBuffer = result.imageBuffer;
    modelVersion = result.modelVersion;
    prompt = positive;
    useWatermark = false; // RA-7: No watermark for Replicate
    logger.log(`Replicate visualization successful: ${modelVersion}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error(`Replicate failed, falling back to mock: ${errMsg}`);
    resultBuffer = await mockVisualization(photoBuffer, category || 'OTHER');
    modelVersion = 'mock-fallback-v1';
    prompt = `Mock ${category} visualization (Replicate fallback)`;
    useWatermark = true;
  }
} else if (enableRealAI) {
  // Tier 2: Self-hosted SD + ControlNet (existing path)
  try {
    logger.log('Attempting SD + ControlNet visualization...');
    const result = await generateVisualization(
      photoBuffer,
      category || 'OTHER',
      undefined,
      undefined,
      qualityPreset,
    );
    resultBuffer = result.imageBuffer;
    modelVersion = result.modelVersion;
    prompt = result.prompt;
    useWatermark = false;
    logger.log(`SD visualization successful: ${modelVersion}`);
  } catch (sdError) {
    logger.error(`SD failed, falling back to mock: ${sdError}`);
    resultBuffer = await mockVisualization(photoBuffer, category || 'OTHER');
    modelVersion = 'mock-v1';
    prompt = `Mock ${category} visualization (SD fallback)`;
    useWatermark = true;
  }
} else {
  // Tier 3: Mock visualization (always available)
  logger.log('Using mock visualization (no AI provider configured)');
  resultBuffer = await mockVisualization(photoBuffer, category || 'OTHER');
  modelVersion = 'mock-v1';
  prompt = `Mock ${category} visualization`;
  useWatermark = true;
}
```

4. Update the `generationParams` stored in the Visualization record to include the provider:

```typescript
generationParams: {
  category,
  preset: qualityPreset,
  provider: isReplicateConfigured() ? 'replicate' : (enableRealAI ? 'self-hosted' : 'mock'),
  mode: useWatermark ? 'mock' : 'real',
  modelVersion,
  positivePrompt: positive,
  negativePrompt: negative,
  timestamp: new Date().toISOString(),
} as any,
```

#### 4c. Frontend / UI Changes

No frontend changes. This spec is backend-only. The visualization result flows through the same storage upload and Visualization record creation as all other paths. The frontend displays the result identically regardless of provider.

#### 4d. Shared / Cross-cutting Changes

**Environment variables** (document in `.env.example` or docker-compose):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REPLICATE_API_TOKEN` | No | (unset) | Replicate API token. When set, enables cloud AI visualization. Get from replicate.com/account/api-tokens. |
| `REPLICATE_MODEL_ID` | No | `stability-ai/sdxl:latest` | Replicate model identifier. Format: `owner/model:version`. Can be changed to use different models (e.g., `stability-ai/stable-diffusion:latest`). |

**Docker-compose update** (optional, for documentation):
- Add commented-out environment variables to the ai-worker service:
  ```yaml
  environment:
    # REPLICATE_API_TOKEN=your-token-here   # Enable cloud AI
    # REPLICATE_MODEL_ID=stability-ai/sdxl:latest  # Optional model override
  ```

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| MODIFY | apps/ai-worker/package.json | Add `replicate` npm dependency | Low |
| CREATE | apps/ai-worker/src/models/replicate-client.ts | Replicate API wrapper: isReplicateConfigured, generateVisualization | Med |
| MODIFY | apps/ai-worker/src/processors/visualization.processor.ts | Add Replicate as primary tier in 3-tier execution flow | Med |

### 6. Dependency & Reference Check

#### External Dependencies

| Dependency | Version | Size | Purpose |
|-----------|---------|------|---------|
| `replicate` | ^1.0.0 | ~50KB | Official Replicate Node.js SDK. Handles API authentication, model invocation, prediction polling, and result retrieval. Zero native dependencies — pure JS. |

#### Internal Dependencies
- `mock-ai.ts` — Unchanged. Still exported for fallback use. Called when Replicate fails or when no AI provider is configured.
- `stable-diffusion.ts` — Unchanged. Still the second-tier path when `ENABLE_REAL_AI=true` but Replicate is not configured.
- `prompt-builder.ts` (from SPEC-026) — Used to build structured prompts from category. If SPEC-026 is not yet implemented, the processor can fall back to the existing basic prompt construction.
- `storage` — Used by processor to upload results. No changes.
- `prisma` — Used by processor to update job status and create Visualization records. No schema changes.

#### Backward Compatibility
- When `REPLICATE_API_TOKEN` is not set, behavior is **identical** to current code. The Replicate path is entirely skipped.
- When `REPLICATE_API_TOKEN` is set and `ENABLE_REAL_AI` is also true, Replicate takes priority. Self-hosted SD is never reached unless Replicate is not configured.
- The `modelVersion` string for Replicate results uses the `replicate-` prefix to distinguish from self-hosted model versions.
- Existing Visualization records and API responses are unaffected — same schema, same fields.

### 7. Implementation Plan

**Step 1:** Install replicate npm package
- File: apps/ai-worker/package.json
- Action: `pnpm add replicate` from apps/ai-worker directory
- Verify: `pnpm typecheck` passes, package appears in package.json dependencies

**Step 2:** Create Replicate client module
- File: apps/ai-worker/src/models/replicate-client.ts
- Action: create — implement `isReplicateConfigured()`, `generateVisualization()` with base64 encoding, timeout, error classification, result download
- Key: use `Promise.race()` for 120s timeout, classify errors (timeout, rate limit, model not found)
- Key: handle both string and array output formats from Replicate

**Step 3:** Update visualization processor with three-tier flow
- File: apps/ai-worker/src/processors/visualization.processor.ts
- Action: modify — import replicate-client, add Replicate as first tier before `enableRealAI` check
- Key: Replicate path sets `useWatermark = false` (RA-7)
- Key: Replicate catch block falls back to mock with `modelVersion: 'mock-fallback-v1'`
- Key: Update `generationParams` to include `provider` field

**Step 4:** Update environment documentation
- Files: `.env.example`, docker-compose.yml (comments only)
- Action: document `REPLICATE_API_TOKEN` and `REPLICATE_MODEL_ID` variables

**Step 5:** Verify end-to-end
- Set `REPLICATE_API_TOKEN` → trigger visualization → verify Replicate is called → result has no watermark → `modelVersion` starts with `replicate-`
- Unset `REPLICATE_API_TOKEN` → trigger visualization → verify Replicate is skipped → existing flow unchanged
- Set invalid token → trigger visualization → verify fallback to mock → clear error log

### 8. Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|-----------|
| Replicate API is down or unreachable | Med | Low | Catch block falls back to mock visualization. Users always get a result. Log error for ops alerting. Replicate has 99.9% uptime SLA. |
| Rate limit exceeded (RA-6) | Med | Med | Error classification detects 429 responses and logs clearly. Fallback to mock ensures user is not blocked. For production, monitor rate limit headers and implement backoff. |
| Replicate model output format changes | Med | Low | Handle both string and array output formats. If neither matches, throw with descriptive error including the actual output (truncated). Fallback to mock. |
| Base64 encoding of large photos is slow or OOM | Low | Low | Room photos are resized during upload (max 2048px). A 2048x2048 JPEG is ~2MB raw, ~2.7MB base64. Well within memory limits. Encoding takes <100ms. |
| 120s timeout too short for complex models | Low | Med | SDXL on Replicate typically completes in 10-30s. 120s is generous. If a different model needs more time, `REPLICATE_TIMEOUT_MS` can be made configurable via env var in a future iteration. |
| Replicate charges per prediction — cost overruns | Med | Med | Development uses personal API key with spending limits set on replicate.com. Production deployment should set budget alerts. Cost is ~$0.02-0.05 per SDXL prediction. |
| Invalid REPLICATE_API_TOKEN (typo, expired) | Low | Med | Replicate SDK throws an auth error on first call. Caught by the try/catch, falls back to mock. Logger shows clear "Replicate API error" message with the auth failure. |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests

**replicate-client.test.ts:**
- `isReplicateConfigured()` returns `false` when `REPLICATE_API_TOKEN` is unset
- `isReplicateConfigured()` returns `false` when `REPLICATE_API_TOKEN` is empty string
- `isReplicateConfigured()` returns `false` when `REPLICATE_API_TOKEN` is whitespace only
- `isReplicateConfigured()` returns `true` when `REPLICATE_API_TOKEN` has a value
- `generateVisualization()` converts photo buffer to correct base64 data URI format
- `generateVisualization()` uses default model ID `stability-ai/sdxl:latest` when `REPLICATE_MODEL_ID` is unset
- `generateVisualization()` uses custom model ID from `REPLICATE_MODEL_ID` env var
- `generateVisualization()` with preset='draft' passes `num_inference_steps: 20`
- `generateVisualization()` with preset='final' passes `num_inference_steps: 50`
- `generateVisualization()` handles string output from Replicate (single URL)
- `generateVisualization()` handles array output from Replicate (array of URLs, takes first)
- `generateVisualization()` throws on unexpected output format with descriptive message
- `generateVisualization()` throws on timeout after 120 seconds
- `generateVisualization()` throws with "rate limit" message on 429 error
- `generateVisualization()` throws with "model not found" message on 404 error
- `generateVisualization()` returns `{ imageBuffer, modelVersion }` with correct modelVersion format
- `generateVisualization()` downloads image from result URL and returns as Buffer

**visualization.processor.test.ts (Replicate-specific additions):**
- When Replicate is configured: processor calls `replicateGenerate`, not `mockVisualization`
- When Replicate succeeds: `useWatermark` is false, `modelVersion` starts with `replicate-`
- When Replicate fails: processor falls back to mock, `modelVersion` is `mock-fallback-v1`
- When Replicate is not configured and `enableRealAI` is true: processor calls SD path (existing behavior)
- When Replicate is not configured and `enableRealAI` is false: processor calls mock (existing behavior)
- Visualization record `generationParams.provider` is `'replicate'` when Replicate is used

#### 9b. Integration Tests

- Full Replicate path with mocked Replicate SDK: set `REPLICATE_API_TOKEN`, mock `replicate.run()` to return a URL, mock `fetch` to return image bytes → verify processor creates Visualization with `modelVersion: 'replicate-...'` and no watermark
- Replicate fallback path: set `REPLICATE_API_TOKEN`, mock `replicate.run()` to throw → verify processor falls back to mock, creates Visualization with `modelVersion: 'mock-fallback-v1'` and watermark
- Replicate timeout path: set `REPLICATE_API_TOKEN`, mock `replicate.run()` to hang → verify timeout fires at 120s, processor falls back to mock
- No token path: unset `REPLICATE_API_TOKEN` → verify processor skips Replicate entirely, follows existing `enableRealAI` / mock flow
- Job status updates: verify `AiJob.status` transitions through PROCESSING -> COMPLETED (or FAILED) regardless of which tier handles the visualization

#### 9c. E2E / Smoke Tests

- With valid `REPLICATE_API_TOKEN`: trigger visualization job → verify Replicate API is called → result image appears in storage → Visualization record has `provider: 'replicate'` in generationParams → no watermark on output image
- With invalid `REPLICATE_API_TOKEN`: trigger visualization job → verify Replicate call fails → fallback to mock → result has watermark → clear error in logs
- Without `REPLICATE_API_TOKEN`: trigger visualization job → verify identical behavior to pre-Replicate codebase → mock output with watermark
- Model ID override: set `REPLICATE_MODEL_ID=stability-ai/stable-diffusion:latest` → verify that model ID is used in the API call
- Rate limit simulation: configure Replicate mock to return 429 → verify fallback and clear log message

### 10. Verification Criteria

- [ ] `replicate` package installed in apps/ai-worker/package.json and imports resolve
- [ ] `replicate-client.ts` exports `isReplicateConfigured()` that checks `REPLICATE_API_TOKEN` env var
- [ ] `replicate-client.ts` exports `generateVisualization()` that calls Replicate API
- [ ] Photo buffer is converted to base64 data URI before sending to Replicate
- [ ] Default model is `stability-ai/sdxl:latest`, configurable via `REPLICATE_MODEL_ID` (RA-5)
- [ ] Draft preset sends `num_inference_steps: 20`, Final sends `num_inference_steps: 50` (RA-4)
- [ ] `guidance_scale` is set to 7.5
- [ ] 120-second timeout wraps the Replicate call (RA-DC-5)
- [ ] Timeout, rate limit (RA-6), and model-not-found errors produce clear, distinct error messages
- [ ] Replicate output URL is fetched and image bytes returned as Buffer (RA-DC-3)
- [ ] Both string and array output formats from Replicate are handled
- [ ] `visualization.processor.ts` tries Replicate first when token is set (RA-1)
- [ ] Replicate success sets `useWatermark = false` (RA-7)
- [ ] Replicate failure falls back to `mockVisualization()` with watermark (RA-3)
- [ ] When token is not set, existing `enableRealAI` / mock flow is unchanged (RA-DC-2)
- [ ] Visualization record stores `modelVersion: 'replicate-<modelId>'` for Replicate results
- [ ] Visualization record `generationParams` includes `provider` field
- [ ] `pnpm typecheck` passes in ai-worker
- [ ] All existing tests continue to pass (mock and SD paths unchanged)
- [ ] No hardcoded API keys anywhere in the codebase (RA-DC-1)
