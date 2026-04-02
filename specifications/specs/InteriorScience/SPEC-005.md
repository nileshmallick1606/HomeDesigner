# SPEC-005 — AI Segmentation Pipeline (SAM)

**Parent Feature:** InteriorScience MVP
**Spec Number:** 005 of 9
**Prerequisites:** SPEC-004

## Status: Not Started

### 1. Objective

Implement the AI room segmentation pipeline using the Segment Anything Model (SAM). When a user uploads a room photo, they can trigger segmentation which identifies room elements (walls, floor, ceiling, windows, doors, fixtures). These elements become selectable layers for category-based visualization in SPEC-006.

- **Before:** Room photos uploaded and stored, but elements not identified
- **After:** Users can trigger SAM segmentation on any room photo. AI Worker processes the request asynchronously via BullMQ. Segmented elements are displayed as selectable overlays on the photo.
- **Success criteria:** Segmentation request queued within 1 second. SAM processes and returns element masks. Elements displayed as selectable overlays on the room photo. 80%+ accuracy on element detection (walls, floor, ceiling, fixtures).

### 2. Architecture

```
Segmentation Flow:
  User views room photo → taps "Detect Elements"
    → Client: POST /api/ai/segmentation { roomPhotoId }
    → API: Validate photo exists, check rate limits (DC-4)
    → API: Create AiJob record (status: QUEUED, type: SEGMENTATION)
    → API: Enqueue BullMQ job with priority (paid > free)
    → API: Return { jobId, status: "queued" }
    → Client: Subscribe to WebSocket for job updates

  AI Worker (separate process):
    → Picks job from BullMQ queue (priority-ordered)
    → Downloads photo from R2
    → Runs SAM inference (ONNX Runtime for CPU optimization)
    → Generates element masks (PNG masks per element)
    → Labels each element (wall, floor, ceiling, window, door, fixture, etc.)
    → Uploads masks to R2
    → Updates Segmentation record (status: COMPLETED, elements JSON)
    → Publishes completion event via Redis pub/sub
    → API forwards to client via WebSocket

  Client receives completion:
    → Fetches segmentation data (element masks + labels)
    → Overlays selectable mask layers on room photo
    → User can tap elements to select for editing (used by SPEC-006/007)

AI Worker Process (Docker container):
  ┌─────────────────────────────┐
  │       AI Worker             │
  │                             │
  │  BullMQ Consumer            │
  │    ↓                        │
  │  Download photo from R2     │
  │    ↓                        │
  │  SAM (ONNX Runtime)         │
  │    ↓                        │
  │  Post-process masks         │
  │    ↓                        │
  │  Upload masks to R2         │
  │    ↓                        │
  │  Update DB + notify         │
  └─────────────────────────────┘
```

Error Flow:
```
SAM inference fails →
  Retry with exponential backoff (max 3 attempts, DC-1/E1) →
  Update AiJob (attempts++, error message) →
  If all retries fail → status: FAILED →
  Notify user: "Segmentation failed. You can retry or use manual selection."

AI Worker offline →
  Jobs remain in Redis queue (DC-6) →
  Non-AI features continue working →
  User sees "AI temporarily unavailable" →
  When worker recovers → queued jobs process in order

Queue overloaded →
  Circuit breaker at configurable threshold (DC-4) →
  User sees queue position and estimated wait time →
  "High demand" message if circuit breaker trips
```

### 3. Design Constraints

- DC-1: All AI processing MUST be asynchronous via BullMQ job queue. API must never perform synchronous AI inference. Job status queryable via WebSocket or polling.
- DC-4: AI job queue MUST implement priority levels (paid > free) and per-user rate limiting. Queue depth monitored with configurable circuit breaker.
- DC-6: Application MUST function when AI worker is offline. AI availability is not a hard dependency for non-AI features.
- DC-10: Every AI output MUST store the model version. Outputs are immutable — new runs create new records.
- DC-14: All API endpoints MUST validate input via class-validator DTOs.
- TRD E1: Retry with exponential backoff (max 3). Never lose original photo. Queue-based ensures job persistence.
- TRD E4: Free-tier rate limit: 10 AI generations/day **combined across segmentation AND visualization** (shared counter). Paid users get priority queue and higher limits (50/day). The rate limit counter is tracked per user in Redis with daily reset at midnight UTC.
- TRD §12: AI generation <60 seconds on CPU (target).
- PRD F5: SAM-based detection of walls, floor, ceiling, windows, doors, fixtures. 80%+ accuracy.

### 4. Detailed Design

#### 4a. Database / Schema Changes
- No new schema — Segmentation and AiJob models from SPEC-002
- Ensure indexes on AiJob (status, priority, createdAt) for efficient queue polling

#### 4b. Backend / API Changes

**File: `apps/api/src/ai/ai.module.ts`**
- Imports: PrismaModule, BullModule (register SEGMENTATION queue), R2Module
- Providers: AiService, SegmentationService
- Controllers: AiController

**File: `apps/api/src/ai/ai.controller.ts`**
- POST /api/ai/segmentation — Request segmentation { roomPhotoId }
- GET /api/ai/jobs/:jobId — Get job status
- GET /api/ai/segmentation/:roomPhotoId — Get segmentation results
- POST /api/ai/segmentation/:id/retry — Retry failed segmentation
- WebSocket gateway for job status updates

**File: `apps/api/src/ai/ai.service.ts`**
- requestSegmentation(): Validate photo, check rate limits, create AiJob, enqueue BullMQ job
- getJobStatus(): Return job status, queue position, estimated wait
- getRateLimitStatus(): Check user's daily generation count vs tier limit
- Circuit breaker: If queue depth > threshold, reject new jobs with "high demand" message

**File: `apps/api/src/ai/segmentation.service.ts`**
- getSegmentation(): Fetch segmentation result for a room photo
- listSegmentations(): List all segmentations for a room

**File: `apps/api/src/ai/ai.gateway.ts`** (WebSocket)
- @WebSocketGateway for real-time job status updates
- Client subscribes to job:${jobId} channel
- Server publishes status changes: QUEUED → PROCESSING → COMPLETED/FAILED
- **IMPORTANT:** This is an interim gateway. SPEC-009 introduces a unified `realtime.gateway.ts` that consolidates all WebSocket events (AI jobs, comments, presence). If SPEC-009 is implemented first, AI job events should be added directly to the unified gateway instead of creating this separate one. If this gateway is built first, it must be refactored into the unified gateway during SPEC-009 implementation.

**File: `apps/api/src/ai/dto/request-segmentation.dto.ts`**
- roomPhotoId: UUID (required, exists validation)

**AI Worker (separate process/container):**

**File: `apps/ai-worker/src/main.ts`**
- BullMQ worker process entry point
- Connects to Redis, registers job processors
- Graceful shutdown handling

**File: `apps/ai-worker/src/processors/segmentation.processor.ts`**
- BullMQ processor for SEGMENTATION jobs
- Downloads photo from R2
- Runs SAM inference via ONNX Runtime
- Post-processes masks: label each segment, filter small segments, merge overlapping
- Uploads mask images to R2: /{userId}/segmentation/{segId}/{element}.png
- Updates Segmentation record: status COMPLETED, elements JSON with labels and mask URLs
- Publishes completion event to Redis pub/sub
- Error handling: catch → retry logic per DC-1

**File: `apps/ai-worker/src/models/sam.ts`**
- SAM model loader using ONNX Runtime
- Image preprocessing (resize to SAM input size, normalize)
- Run inference with automatic mode (detect all elements)
- Post-processing: convert raw masks to labeled segments
- Element labeling heuristic: position-based (top = ceiling, bottom = floor, large contiguous = wall, small distinct = fixture/window/door)
- Model version tracking

**File: `apps/ai-worker/src/models/model-manager.ts`**
- Downloads and caches ONNX model files
- Model versioning (tracks which version is loaded)
- Memory management (load/unload models as needed)

**File: `apps/ai-worker/package.json`**
- Dependencies: bullmq, onnxruntime-node, sharp, @aws-sdk/client-s3, @prisma/client, ioredis

**File: `docker/Dockerfile.ai-worker`**
- Python-free ONNX Runtime Node.js container
- Model files baked in or downloaded at startup
- Resource limits: 32GB RAM (as per Decision #10)

#### 4c. Frontend / UI Changes

**File: `apps/web/components/ai/segmentation-overlay.tsx`**
- Overlays segmentation masks on room photo
- Each element is a colored semi-transparent layer
- Tap an element to select it (highlights with border)
- Element labels shown on tap (tooltip: "Wall", "Floor", etc.)
- Toggle all/none selection
- Legend showing element types and colors

**File: `apps/web/components/ai/job-status.tsx`**
- Shows AI job progress: queued (with position) → processing (spinner) → complete (checkmark) / failed (retry button)
- WebSocket subscription for real-time updates
- Estimated wait time display
- "AI unavailable" state when worker is offline

**File: `apps/web/components/ai/manual-selection.tsx`**
- Fallback for when SAM segmentation is poor
- User draws selection polygon on photo (touch-friendly)
- Labels the selection (select from dropdown: wall, floor, etc.)
- Saves as manual segmentation

**Update: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx`**
- Add "Detect Elements" button on room photos
- Show segmentation status indicator
- When segmented: show element overlays
- Element selection UI for use by visualization (SPEC-006)

#### 4d. Shared / Cross-cutting Changes

**File: `packages/shared/src/types/ai.ts`**
- AiJobStatus, AiJobType, SegmentationElement enums
- AiJobDto, SegmentationDto, SegmentationElementDto interfaces

**File: `docker-compose.yml` update:**
- Add ai-worker service with resource limits
- Volume mount for model files
- Depends on Redis

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| CREATE | apps/api/src/ai/ai.module.ts | AI module | Med |
| CREATE | apps/api/src/ai/ai.controller.ts | AI job endpoints | Med |
| CREATE | apps/api/src/ai/ai.service.ts | Job queueing, rate limiting | High |
| CREATE | apps/api/src/ai/segmentation.service.ts | Segmentation queries | Low |
| CREATE | apps/api/src/ai/ai.gateway.ts | WebSocket for job updates | Med |
| CREATE | apps/api/src/ai/dto/*.ts | AI DTOs | Low |
| CREATE | apps/ai-worker/src/main.ts | Worker entry point | Med |
| CREATE | apps/ai-worker/src/processors/segmentation.processor.ts | SAM job processor | High |
| CREATE | apps/ai-worker/src/models/sam.ts | SAM model wrapper | High |
| CREATE | apps/ai-worker/src/models/model-manager.ts | Model loading/caching | Med |
| CREATE | apps/ai-worker/package.json | Worker dependencies | Low |
| CREATE | docker/Dockerfile.ai-worker | AI worker Docker image | Med |
| CREATE | apps/web/components/ai/segmentation-overlay.tsx | Element overlay UI | Med |
| CREATE | apps/web/components/ai/job-status.tsx | Job progress component | Med |
| CREATE | apps/web/components/ai/manual-selection.tsx | Manual fallback | Med |
| CREATE | packages/shared/src/types/ai.ts | Shared AI types | Low |
| MODIFY | apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx | Add segmentation UI | Med |
| MODIFY | apps/api/src/app.module.ts | Import AiModule | Low |
| MODIFY | docker-compose.yml | Add ai-worker service | Med |

### 6. Dependency & Reference Check

#### Backend Wiring
- npm packages (API): @nestjs/bull or @nestjs/bullmq, @nestjs/websockets, @nestjs/platform-socket.io
- npm packages (Worker): bullmq, onnxruntime-node, sharp, @aws-sdk/client-s3, ioredis
- AiModule registered in AppModule
- BullModule configured with Redis connection
- WebSocket gateway registered

#### Frontend Wiring
- npm packages: socket.io-client (for WebSocket)
- Segmentation components imported in room detail page

#### Infrastructure
- AI worker added to Docker Compose
- SAM ONNX model files: download during Docker build or first run
- Redis used for BullMQ queue + pub/sub

### 7. Implementation Plan

**Step 1:** Create AI worker scaffold
- Files: apps/ai-worker/package.json, apps/ai-worker/src/main.ts, apps/ai-worker/tsconfig.json
- Action: create
- Details: BullMQ worker process. Connects to Redis. Registers processors. Graceful shutdown.

**Step 2:** Create SAM model wrapper
- Files: apps/ai-worker/src/models/sam.ts, apps/ai-worker/src/models/model-manager.ts
- Action: create
- Details: ONNX Runtime integration. Model loading with version tracking. Image preprocessing. Inference with automatic segmentation mode. Post-processing masks with element labeling.

**Step 3:** Create segmentation job processor
- Files: apps/ai-worker/src/processors/segmentation.processor.ts
- Action: create
- Details: BullMQ processor. Download photo → SAM inference → upload masks → update DB → publish event. Retry with exponential backoff (DC-1).

**Step 4:** Create AI worker Docker configuration
- Files: docker/Dockerfile.ai-worker
- Action: create
- Details: Node.js container with ONNX Runtime. Model files. 32GB RAM limit.

**Step 5:** Create backend AI module
- Files: apps/api/src/ai/ai.module.ts, ai.controller.ts, ai.service.ts, segmentation.service.ts, ai.gateway.ts, dto/*
- Action: create
- Details: Job queueing with priority (DC-4). Rate limiting per user/tier. WebSocket gateway for real-time updates. Circuit breaker for queue overload.

**Step 6:** Register modules and update Docker Compose
- Files: apps/api/src/app.module.ts, docker-compose.yml
- Action: modify
- Details: Import AiModule. Add ai-worker service to Docker Compose with resource limits.

**Step 7:** Create shared AI types
- Files: packages/shared/src/types/ai.ts
- Action: create

**Step 8:** Create frontend segmentation components
- Files: apps/web/components/ai/segmentation-overlay.tsx, job-status.tsx, manual-selection.tsx
- Action: create
- Details: Element overlay with selection. Job status with WebSocket. Manual fallback selection tool.

**Step 9:** Update room detail page
- Files: apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx
- Action: modify
- Details: Add "Detect Elements" button. Show segmentation status. Element overlays when complete.

### 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| SAM ONNX model too large for 32GB RAM allocation | High | Use SAM-ViT-B (smallest variant, ~375MB). Quantize to float16. Monitor memory during inference. |
| SAM accuracy <80% on interior photos | Med | Implement manual selection fallback. Fine-tune with interior photos over time. Allow users to correct segments. |
| CPU inference too slow (>60 seconds) | Med | Use SAM-ViT-B + ONNX optimizations. Resize input to max 1024px. Accept longer times with clear progress UI. |
| BullMQ queue data loss on Redis restart | Med | Configure Redis persistence (RDB + AOF). Queue jobs with removeOnComplete: false for audit trail. |
| WebSocket connection drops on mobile | Med | Fallback to polling every 5 seconds if WebSocket disconnects. Auto-reconnect strategy. |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests
- **AiService.requestSegmentation:** Creates job, enqueues to BullMQ, returns jobId
- **AiService.requestSegmentation:** Rejects when rate limit exceeded (DC-4)
- **AiService.requestSegmentation:** Rejects when circuit breaker tripped
- **AiService.getJobStatus:** Returns correct status and queue position
- **SegmentationProcessor:** Processes job successfully, creates segmentation record
- **SegmentationProcessor:** Retries on failure, respects max attempts (DC-1)
- **SAM model:** Preprocesses image correctly (resize, normalize)
- **SAM model:** Post-processes masks with correct labels
- **Rate limiting:** Tracks per-user daily count, resets at midnight

#### 9b. Integration Tests
- **Full segmentation flow:** Upload photo → request segmentation → worker processes → result stored → API returns segments
- **Priority queue:** Paid user job processed before free user job when both queued
- **Rate limiting:** Free user blocked after 10 generations/day
- **Worker offline → recovery:** Queue job → stop worker → start worker → job processes
- **WebSocket updates:** Client receives real-time status changes
- **Circuit breaker:** Enqueue many jobs → circuit trips → new requests rejected with message

#### 9c. E2E UI Automation Tests
- **Segmentation flow:** Login → room with photo → "Detect Elements" → see processing → elements appear as overlays
- **Element selection:** Tap wall segment → highlights → tap floor → wall deselects, floor selects
- **Manual selection fallback:** Use manual selection tool → draw polygon → label as "wall"
- **Job status updates:** Real-time status shown (queued → processing → complete)
- **AI unavailable:** Worker offline → user sees "AI temporarily unavailable" → non-AI features work
- **Retry failed:** Segmentation fails → "Retry" button → re-queues successfully

### 10. Verification Criteria
- [ ] Segmentation request creates BullMQ job (DC-1)
- [ ] Priority queue: paid users processed first (DC-4)
- [ ] Per-user rate limiting enforced (DC-4, 10/day free)
- [ ] Circuit breaker trips at threshold (DC-4)
- [ ] Application works when AI worker is offline (DC-6)
- [ ] Model version stored with segmentation result (DC-10)
- [ ] Retry with exponential backoff on failure (3 max, DC-1)
- [ ] WebSocket delivers real-time job updates
- [ ] SAM processes room photo and returns element masks
- [ ] Elements displayed as selectable overlays on photo
- [ ] Manual selection fallback works
- [ ] AI worker Docker container starts and processes jobs
- [ ] All endpoints validate input (DC-14)
