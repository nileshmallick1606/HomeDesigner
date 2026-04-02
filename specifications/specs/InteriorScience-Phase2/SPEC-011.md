# SPEC-011 — AI Worker Mock Pipeline

**Parent Feature:** InteriorScience Phase 2
**Spec Number:** 011 of 016 (Phase 2: 2 of 7)
**Prerequisites:** None (Phase 1 complete)

## Status: Not Started

### 1. Objective

Implement BullMQ job processors in the AI worker that consume segmentation and visualization queues. In mock mode, use Sharp to apply image transformations that produce visually distinct before/after images, demonstrating the full pipeline without real ML models.

- **Before:** AI worker is a placeholder main.ts. Jobs queue in Redis but never process.
- **After:** Worker consumes both queues, processes jobs with Sharp mock transforms, stores results in local storage, updates DB status. Full QUEUED → PROCESSING → COMPLETED lifecycle works.
- **Success criteria:** Request segmentation → job processes within 5 seconds → result stored. Request visualization → job processes → before/after images visually different → "AI Preview (Mock)" watermark visible.

### 2. Architecture

```
AI Worker Process:
  main.ts → Connect to Redis → Register processors
    ├── segmentation.processor.ts
    │   └── Download photo → Sharp edge detection → Upload mask → Update Segmentation record
    └── visualization.processor.ts
        └── Download photo → Sharp category-based transform → Add watermark → Upload result → Update Visualization record

Mock Transforms by Category:
  CIVIL:        Blue tint (hue shift 200°) — simulates wall paint
  FURNISHINGS:  Warm brightness (+20%) — simulates new furniture lighting
  BATHROOM_CAT: Cyan saturation boost — simulates new tiles
  KITCHEN_CAT:  Green tint (hue shift 120°) — simulates cabinet color
  ELECTRICAL:   Warm temperature shift (yellow) — simulates new lighting
  OTHER:        Sepia tone — generic transformation

All outputs get "AI Preview (Mock)" text watermark overlay.
```

### 3. Design Constraints

- P2-DC-1: Mock mode MUST produce visually distinct before/after images with minimum 20% hue shift + "AI Preview (Mock)" watermark.
- P2-DC-8: Use window.location.hostname pattern — applies to URLs stored in DB for image serving.
- P2-DC-9: Phase 1 constraints remain — DC-1 (async BullMQ), DC-2 (original photo preserved), DC-10 (model version stored).
- P2-E1: If mock produces identical image, apply minimum 20% hue shift + watermark.

### 4. Detailed Design

#### 4a. Database / Schema Changes
- None — Segmentation, Visualization, AiJob models all exist

#### 4b. AI Worker Changes

**File: `apps/ai-worker/package.json`** (MODIFY)
- Add dependencies: @prisma/client, sharp, @aws-sdk/client-s3 (or local fs)

**File: `apps/ai-worker/src/main.ts`** (REWRITE)
- BullMQ Worker bootstrap
- Connect to Redis (REDIS_URL from env)
- Register segmentation and visualization processors
- Graceful shutdown on SIGINT/SIGTERM
- Log worker activity

**File: `apps/ai-worker/src/lib/prisma.ts`** (CREATE)
- Prisma client singleton for the worker process

**File: `apps/ai-worker/src/lib/storage.ts`** (CREATE)
- Local file storage (same as R2Service local fallback in API)
- upload(key, buffer), download(key), getPublicUrl(key)
- Reads from apps/api/uploads/ directory (shared with API)

**File: `apps/ai-worker/src/models/mock-ai.ts`** (CREATE)
- mockSegmentation(imageBuffer): Sharp edge detection → generate mask PNG
- mockVisualization(imageBuffer, category): Sharp hue/saturation/tint transforms based on category
- addWatermark(imageBuffer, text): Overlay "AI Preview (Mock)" text using Sharp composite
- All functions return Buffer

**File: `apps/ai-worker/src/processors/segmentation.processor.ts`** (CREATE)
- BullMQ Processor for 'segmentation' queue
- Steps: 
  1. Update AiJob status → PROCESSING
  2. Download original photo from storage
  3. Run mockSegmentation() → generate edge mask
  4. Upload mask to storage
  5. Create/update Segmentation record (status: COMPLETED, maskUrl, modelVersion: 'mock-v1')
  6. Update AiJob status → COMPLETED
- On error: increment attempts, if < maxAttempts throw to retry, else status → FAILED

**File: `apps/ai-worker/src/processors/visualization.processor.ts`** (CREATE)
- BullMQ Processor for 'visualization' queue
- Steps:
  1. Update AiJob status → PROCESSING
  2. Download original photo from storage
  3. Read category from job data
  4. Run mockVisualization(buffer, category) → transformed image
  5. Run addWatermark() → add "AI Preview (Mock)" text
  6. Upload result to storage
  7. Create/update Visualization record (status: COMPLETED, imageUrl, modelVersion: 'mock-v1', thumbnailUrl)
  8. Update AiJob status → COMPLETED
- On error: same retry logic

#### 4c. Frontend / UI Changes
- None (frontend consuming these results is SPEC-012)

#### 4d. Shared / Cross-cutting Changes
- AI worker needs access to same uploads/ directory as the API for local dev

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| MODIFY | apps/ai-worker/package.json | Add prisma, sharp, deps | Low |
| REWRITE | apps/ai-worker/src/main.ts | Full BullMQ worker bootstrap | Med |
| CREATE | apps/ai-worker/src/lib/prisma.ts | Prisma client singleton | Low |
| CREATE | apps/ai-worker/src/lib/storage.ts | Local file storage client | Med |
| CREATE | apps/ai-worker/src/models/mock-ai.ts | Mock AI transforms via Sharp | Med |
| CREATE | apps/ai-worker/src/processors/segmentation.processor.ts | Segmentation job processor | High |
| CREATE | apps/ai-worker/src/processors/visualization.processor.ts | Visualization job processor | High |

### 6. Dependency & Reference Check

#### AI Worker Wiring
- npm packages to add: @prisma/client@^6.19.3, sharp@^0.34.5
- Prisma client needs prisma generate to have been run (done in Phase 1)
- Worker reads from Redis (same instance as API)
- Worker reads/writes to apps/api/uploads/ (shared local storage)

### 7. Implementation Plan

**Step 1:** Update ai-worker package.json with new dependencies
- File: apps/ai-worker/package.json
- Action: modify
- Details: Add @prisma/client, sharp. Run pnpm install.

**Step 2:** Create Prisma client for worker
- File: apps/ai-worker/src/lib/prisma.ts
- Action: create
- Details: Singleton PrismaClient instance with DATABASE_URL from env.

**Step 3:** Create local storage client
- File: apps/ai-worker/src/lib/storage.ts
- Action: create
- Details: Read/write to apps/api/uploads/ directory. Generate public URLs matching API's /api/media/files/* pattern.

**Step 4:** Create mock AI transforms
- File: apps/ai-worker/src/models/mock-ai.ts
- Action: create
- Details: Sharp-based transforms for each category. Edge detection for segmentation. Watermark overlay function.

**Step 5:** Create segmentation processor
- File: apps/ai-worker/src/processors/segmentation.processor.ts
- Action: create
- Details: BullMQ processor consuming 'segmentation' queue. Full lifecycle with retry.

**Step 6:** Create visualization processor
- File: apps/ai-worker/src/processors/visualization.processor.ts
- Action: create
- Details: BullMQ processor consuming 'visualization' queue. Category-based transforms with watermark.

**Step 7:** Rewrite worker entry point
- File: apps/ai-worker/src/main.ts
- Action: rewrite
- Details: Bootstrap BullMQ workers for both queues. Connect to Redis. Graceful shutdown.

### 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Sharp crashes on corrupt/unsupported images | Med | Wrap all Sharp calls in try/catch. Mark job as FAILED on error. |
| Worker can't find uploads/ directory | Med | Create directory if not exists. Use absolute path from env or relative to api cwd. |
| Redis connection fails | Med | Retry connection with backoff. Log error and exit gracefully. |
| Prisma client version mismatch with API | Low | Both use same @prisma/client version from workspace. |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests
- mockSegmentation() produces a PNG buffer with edges
- mockVisualization() with each category produces visually different output
- addWatermark() adds text overlay to image
- Storage client writes and reads files correctly

#### 9b. Integration Tests
- Worker starts and connects to Redis
- Enqueue segmentation job → worker picks up → processes → DB updated to COMPLETED
- Enqueue visualization job → worker processes → result image stored → DB updated
- Failed job retries up to 3 times
- Job with invalid photo ID → status set to FAILED with error message

#### 9c. E2E UI Automation Tests
- (Deferred to SPEC-012 — this spec is backend-only)

### 10. Verification Criteria
- [ ] AI worker starts without errors
- [ ] Connects to Redis and registers both processors
- [ ] Segmentation job: QUEUED → PROCESSING → COMPLETED in DB
- [ ] Segmentation result: mask image stored in uploads/
- [ ] Visualization job: QUEUED → PROCESSING → COMPLETED in DB
- [ ] Visualization result: transformed image with watermark stored
- [ ] Model version 'mock-v1' recorded in both result types
- [ ] Failed jobs retry up to 3 times
- [ ] Worker shuts down gracefully on SIGTERM
