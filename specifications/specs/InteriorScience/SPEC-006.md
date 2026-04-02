# SPEC-006 — AI Visualization Pipeline (SD + ControlNet)

**Parent Feature:** InteriorScience MVP
**Spec Number:** 006 of 9
**Prerequisites:** SPEC-005

## Status: Not Started

### 1. Objective

Implement the AI visualization pipeline using Stable Diffusion 1.5 + ControlNet for category-based room visualization. Users select a renovation category (Civil, Furnishings, Bathroom, Kitchen, Electrical, Other), choose specific changes (wall color, tile pattern, flooring material, fixture replacement), and the AI generates a realistic modified room image preserving the original room geometry.

- **Before:** Room photos segmented with element masks, but no visualization generation
- **After:** Users can select a category and sub-option, trigger AI generation, and receive a realistic visualization of the room with the applied change. Generation is async via BullMQ with priority queue.
- **Success criteria:** User selects change → AI generates visualization within 60 seconds (CPU) → result is realistic with room geometry preserved → visualization stored with model version (DC-10).

### 2. Architecture

```
Visualization Flow:
  User views segmented room photo
    → Selects renovation category (e.g., "Bathroom")
    → Selects sub-option (e.g., "Tiles" → "Blue Marble")
    → Optionally selects specific elements to change (from segmentation)
    → Client: POST /api/ai/visualization { roomPhotoId, segmentationId, category, subCategory, options, selectedElements }
    → API: Validate, check rate limits (DC-4)
    → API: Create AiJob (type: VISUALIZATION) + Design record
    → API: Enqueue BullMQ job (priority: paid > free)
    → Client: Subscribe to WebSocket for updates

  AI Worker:
    → Picks VISUALIZATION job from queue
    → Downloads original photo + segmentation masks from R2
    → Builds ControlNet inputs:
        - Canny edge map (room geometry)
        - Depth map (perspective)
        - Segmentation mask (target elements only)
    → Constructs prompt from category + sub-option + style
    → Runs SD 1.5 + ControlNet inference (ONNX Runtime)
    → Post-processes output (match original dimensions, color correction)
    → Stores visualization in R2 (DC-10: with model version)
    → Creates Visualization record (immutable, DC-10)
    → Publishes completion via Redis pub/sub → WebSocket

Category → Prompt Mapping:
  Civil:
    - Wall Color: "interior room with {color} painted walls, same furniture"
    - Flooring: "interior room with {material} flooring, {pattern}"
    - Ceiling: "interior room with {style} ceiling design"
  Furnishings:
    - Furniture Style: "interior room with {style} furniture, modern/classic/rustic"
    - Curtains: "interior room with {style} {color} curtains"
  Bathroom:
    - Tiles: "bathroom with {pattern} {color} tiles on walls and floor"
    - Fixtures: "bathroom with {style} modern/classic sanitary fixtures"
    - Vanity: "bathroom with {style} vanity cabinet"
  Kitchen:
    - Cabinets: "kitchen with {style} {color} cabinets"
    - Countertops: "kitchen with {material} countertop, {color}"
    - Backsplash: "kitchen with {pattern} backsplash tiles"
  Electrical:
    - Lighting: "interior room with {style} lighting fixtures, {warm/cool}"
  Other:
    - Custom prompt input with safety guardrails
```

### 3. Design Constraints

- DC-1: All AI processing MUST be async via BullMQ. API never does synchronous inference.
- DC-4: Priority queue (paid > free). Per-user rate limits (shared counter with SPEC-005 segmentation — 10/day free, 50/day paid, combined across all AI operations). Circuit breaker.
- DC-10: Every visualization MUST store model version. Visualizations are immutable — new generations create new records, never overwrite.
- DC-14: All endpoints validate input via class-validator DTOs.
- TRD E1: Retry with exponential backoff (max 3 attempts).
- TRD §12: AI generation <60 seconds on CPU (MVP target).
- AI-DECIDED #2: SD 1.5 for MVP (CPU-friendly).
- AI-DECIDED #3: Canny + Depth ControlNet preprocessors.
- AI-DECIDED #4: Prompt engineering first, LoRA later.
- PRD F6: Category-based visualization with sub-options. AI generates modified room image.

### 4. Detailed Design

#### 4a. Database / Schema Changes
- No new schema — Design, Visualization, AiJob models from SPEC-002
- Design record links to room, stores category + subCategory + options
- Visualization record links to design, stores imageUrl + modelVersion + generationParams

#### 4b. Backend / API Changes

**File: `apps/api/src/ai/visualization.service.ts`**
- requestVisualization(): Create Design record + AiJob, enqueue BullMQ VISUALIZATION job
- getVisualization(): Fetch visualization with image URLs
- listVisualizationsForDesign(): All visualizations for a design (version history)
- Parameters: roomPhotoId, segmentationId, category, subCategory, options (color, material, style, pattern), selectedElements (array of element IDs from segmentation)

**File: `apps/api/src/ai/ai.controller.ts` (update)**
- POST /api/ai/visualization — Request visualization
- GET /api/ai/visualization/:designId — Get visualizations for a design
- POST /api/ai/visualization/:id/retry — Retry failed visualization
- GET /api/ai/jobs/estimate — Returns estimated processing time based on current queue depth and recent average job duration. Response: { estimatedSeconds: number, queueDepth: number }. Used by frontend to show expected wait time before user triggers generation.

**File: `apps/api/src/designs/designs.module.ts`**
- Imports: PrismaModule
- Providers: DesignsService
- Controllers: DesignsController

**File: `apps/api/src/designs/designs.controller.ts`**
- GET /api/rooms/:roomId/designs — List designs for a room
- GET /api/designs/:id — Get design detail with visualizations
- PATCH /api/designs/:id — Update design name, status
- DELETE /api/designs/:id — Delete design + visualizations

**File: `apps/api/src/designs/designs.service.ts`**
- findAllForRoom(): List designs with latest visualization thumbnail
- findById(): Design with all visualizations, canvas state
- update(): Name, status changes
- delete(): Cascade delete visualizations from R2 + DB

**AI Worker additions:**

**File: `apps/ai-worker/src/processors/visualization.processor.ts`**
- BullMQ processor for VISUALIZATION jobs
- Downloads photo + masks from R2
- Generates ControlNet inputs (canny edges via OpenCV/Sharp, depth estimation)
- Constructs prompt from category/sub-category/options mapping
- Runs SD 1.5 + ControlNet inference (ONNX Runtime)
- Post-processes: resize to original dimensions, color matching
- Uploads result to R2: /{userId}/visualizations/{vizId}/result.webp + thumbnail
- Creates Visualization record with model version (DC-10)
- Publishes completion event

**File: `apps/ai-worker/src/models/stable-diffusion.ts`**
- SD 1.5 model loader via ONNX Runtime
- ControlNet integration (canny + depth)
- Inference with configurable steps (20 for draft, 50 for final)
- Prompt encoding via CLIP text encoder
- Image decoder (VAE)
- Model version tracking

**File: `apps/ai-worker/src/models/controlnet.ts`**
- ControlNet preprocessors:
  - Canny edge detection (via Sharp edge detection or dedicated ONNX model)
  - Depth estimation (MiDaS or similar lightweight depth model)
- Control image generation from room photo
- Multi-ControlNet support (canny + depth simultaneously)

**File: `apps/ai-worker/src/prompts/prompt-builder.ts`**
- Maps category + subCategory + options to SD prompt
- Includes negative prompts (avoid deformed, blurry, unrealistic)
- Style modifiers (photorealistic, professional photography)
- Safety check: reject inappropriate prompt content

#### 4c. Frontend / UI Changes

**File: `apps/web/components/visualization/category-selector.tsx`**
- Category grid: Civil, Furnishings, Bathroom, Kitchen, Electrical, Other
- Each category shows icon + name
- Tapping opens sub-category options

**File: `apps/web/components/visualization/sub-category-panel.tsx`**
- Sub-category options panel (slides up from bottom on mobile)
- Options vary by category:
  - Civil → Wall Color (color picker), Flooring (material grid), Ceiling
  - Bathroom → Tiles (pattern/color), Fixtures (style), Vanity
  - Kitchen → Cabinets (style/color), Countertops (material), Backsplash
  - etc.
- Color pickers, material swatches, style previews
- "Generate Visualization" button with estimated wait time shown below (e.g., "Estimated time: ~45 seconds"). The estimate is fetched from GET /api/ai/jobs/estimate which returns average processing time based on recent job history and current queue depth. This sets user expectations BEFORE they commit to waiting.

**File: `apps/web/components/visualization/element-selector.tsx`**
- Uses segmentation overlay from SPEC-005
- User selects which elements to apply the change to
- "Select walls only" / "Select floor only" / "Select all" shortcuts

**File: `apps/web/components/visualization/visualization-result.tsx`**
- Displays generated visualization image
- Loading state with progress indicator (from job-status component)
- "Save to Design" button
- "Try Again" / "Adjust Options" buttons
- Thumbnail for design card

**Update: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx`**
- Add "Visualize" section after photos
- Category selector integration
- List of saved designs with thumbnails

#### 4d. Shared / Cross-cutting Changes

**File: `packages/shared/src/types/design.ts`**
- DesignCategory, DesignSubCategory enums
- DesignDto, VisualizationDto interfaces
- CategoryOptions type (maps category to available sub-options)

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| CREATE | apps/api/src/ai/visualization.service.ts | Visualization job management | High |
| CREATE | apps/api/src/designs/designs.module.ts | Designs module | Low |
| CREATE | apps/api/src/designs/designs.controller.ts | Design endpoints | Med |
| CREATE | apps/api/src/designs/designs.service.ts | Design CRUD | Med |
| CREATE | apps/ai-worker/src/processors/visualization.processor.ts | SD+CN job processor | High |
| CREATE | apps/ai-worker/src/models/stable-diffusion.ts | SD 1.5 ONNX wrapper | High |
| CREATE | apps/ai-worker/src/models/controlnet.ts | ControlNet preprocessors | High |
| CREATE | apps/ai-worker/src/prompts/prompt-builder.ts | Category → prompt mapping | Med |
| CREATE | apps/web/components/visualization/category-selector.tsx | Category grid | Med |
| CREATE | apps/web/components/visualization/sub-category-panel.tsx | Options panel | Med |
| CREATE | apps/web/components/visualization/element-selector.tsx | Element picker | Med |
| CREATE | apps/web/components/visualization/visualization-result.tsx | Result display | Med |
| CREATE | packages/shared/src/types/design.ts | Shared design types | Low |
| MODIFY | apps/api/src/ai/ai.controller.ts | Add visualization endpoints | Med |
| MODIFY | apps/api/src/app.module.ts | Import DesignsModule | Low |
| MODIFY | apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx | Add visualization UI | Med |

### 6. Dependency & Reference Check

#### Backend Wiring
- DesignsModule registered in AppModule
- VisualizationService added to AiModule
- BullModule queue: VISUALIZATION added

#### AI Worker
- SD 1.5 ONNX model files (~2-4GB)
- ControlNet ONNX model files (~1-2GB each)
- Depth estimation model (MiDaS, ~200MB)
- Total model storage: ~5-8GB

#### Frontend Wiring
- Category/visualization components imported in room detail page
- Reuses job-status and segmentation-overlay from SPEC-005

### 7. Implementation Plan

**Step 1:** Create SD 1.5 and ControlNet model wrappers
- Files: apps/ai-worker/src/models/stable-diffusion.ts, controlnet.ts
- Action: create
- Details: ONNX Runtime loading of SD 1.5, ControlNet (canny, depth). Inference pipeline with configurable steps. Model version tracking.

**Step 2:** Create prompt builder
- Files: apps/ai-worker/src/prompts/prompt-builder.ts
- Action: create
- Details: Category/sub-category/options to prompt mapping. Negative prompts. Safety checks.

**Step 3:** Create visualization job processor
- Files: apps/ai-worker/src/processors/visualization.processor.ts
- Action: create
- Details: Full pipeline: download → ControlNet inputs → prompt → SD inference → post-process → R2 → DB. Retry logic.

**Step 4:** Create backend visualization and designs services
- Files: apps/api/src/ai/visualization.service.ts, apps/api/src/designs/*
- Action: create
- Details: Job creation, design CRUD, visualization history.

**Step 5:** Update AI controller and register modules
- Files: apps/api/src/ai/ai.controller.ts, apps/api/src/app.module.ts
- Action: modify
- Details: Add visualization endpoints. Import DesignsModule.

**Step 6:** Create shared design types
- Files: packages/shared/src/types/design.ts
- Action: create

**Step 7:** Create frontend visualization components
- Files: apps/web/components/visualization/*
- Action: create
- Details: Category grid, sub-category panel with options, element selector, result display.

**Step 8:** Update room detail page
- Files: apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx
- Action: modify
- Details: Add "Visualize" section with category selector. Saved designs list.

### 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| SD 1.5 + ControlNet ONNX too slow on CPU (>2 min) | High | Use 20-step LCM/Turbo scheduler for draft, 50-step for final. Resize input to 512x512. Clear UX for wait time. |
| Generated images unrealistic or not matching room | High | ControlNet (canny+depth) preserves geometry. Carefully tuned prompts. User can retry with adjusted options. |
| ONNX model files too large for Docker image | Med | Download models at first run, cache in Docker volume. Don't bake into image. |
| ControlNet depth estimation inaccurate | Med | Start with canny-only if depth is problematic. Depth is enhancement, not required. |
| Category prompt mapping produces poor results | Med | Iterate on prompts, expose "advanced" prompt editing for architects, collect user feedback. |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests
- **PromptBuilder:** Maps each category+subcategory to correct prompt
- **PromptBuilder:** Negative prompts included
- **PromptBuilder:** Rejects inappropriate content
- **VisualizationService.requestVisualization:** Creates Design + AiJob + enqueues
- **VisualizationService:** Respects rate limits (DC-4)
- **DesignsService.findAllForRoom:** Returns designs with thumbnails
- **DesignsService.delete:** Cascades to visualizations
- **VisualizationProcessor:** Stores result with model version (DC-10)
- **VisualizationProcessor:** Creates immutable Visualization record (DC-10)

#### 9b. Integration Tests
- **Full visualization flow:** Photo + segmentation → request visualization → worker processes → result in R2 → API returns image URL
- **Design CRUD:** Create design via visualization → list → get detail → delete
- **Model versioning:** Two generations store different model versions (DC-10)
- **Immutability:** Re-generation creates new Visualization, doesn't overwrite (DC-10)
- **Priority queue:** Paid user processed before free user

#### 9c. E2E UI Automation Tests
- **Visualization flow:** Room with segmented photo → select category "Bathroom" → select "Tiles" → pick blue marble → "Generate" → loading → result displayed
- **Category browsing:** All 6 categories accessible → each has sub-options
- **Element selection:** Select specific walls → generate → only walls change
- **Design list:** Multiple visualizations saved → appear in room detail
- **Retry flow:** Generation fails → retry button → succeeds

### 10. Verification Criteria
- [ ] Visualization request creates async BullMQ job (DC-1)
- [ ] Priority queue and rate limiting work (DC-4)
- [ ] Model version stored with each visualization (DC-10)
- [ ] Visualizations are immutable records (DC-10)
- [ ] SD 1.5 + ControlNet generates room visualization
- [ ] Room geometry preserved via ControlNet
- [ ] All 6 categories have working prompt mappings
- [ ] Generated images stored in R2 with thumbnails
- [ ] Design CRUD works with visualization history
- [ ] All endpoints validate input (DC-14)
- [ ] Generation completes within 60 seconds (target)
