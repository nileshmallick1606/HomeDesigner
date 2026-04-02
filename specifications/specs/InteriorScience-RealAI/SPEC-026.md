# SPEC-026 — Prompt Engineering & Quality Presets

**Parent Feature:** Real AI Integration, Spec 026 of 026 (3 of 3)
**Spec Number:** 026
**Prerequisites:** SPEC-025 (SD 1.5 + ControlNet Visualization)
**BRD Features:** AI-F3 (Prompt tuning + quality presets)

## Status: Not Started

### 1. Objective

Implement structured prompt engineering that maps design categories to optimized Stable Diffusion prompts, and add a quality preset system (Draft/Final) that controls inference step count. This transforms the basic prompt construction from SPEC-025 into a category-aware, template-driven prompt builder with style modifiers, negative prompts, and safety guardrails.

- **Before:** SPEC-025 uses a basic prompt like `"CIVIL interior design"` with a minimal negative prompt `"blurry, low quality"`. All categories produce similarly generic prompts. No quality control — hardcoded 20 steps. No way for users to choose between fast preview and high-quality final render.
- **After:** Each design category (CIVIL, BATHROOM, KITCHEN, FURNISHINGS, ELECTRICAL, OTHER) has a dedicated prompt template that incorporates sub-category details (color, material, style, pattern) and appends photorealistic style modifiers. Comprehensive negative prompts prevent common SD artifacts. A Draft/Final toggle on the frontend lets users choose 20-step fast preview or 50-step high-quality render. The quality preset is stored with each visualization for tracking.
- **Success criteria:** (1) Each category generates a distinct, detailed prompt. (2) SubCategory fields (color, style, material, pattern) are interpolated into prompts. (3) Negative prompts eliminate common artifacts. (4) Draft (20 steps) completes in ~30s, Final (50 steps) in ~90s. (5) Frontend shows Draft/Final toggle. (6) OTHER category has content safety guardrails.

### 2. Architecture

```
apps/ai-worker/
├── src/
│   ├── models/
│   │   ├── prompt-builder.ts             (CREATE — category→prompt mapping + style modifiers)
│   │   └── stable-diffusion.ts           (MODIFY — accept steps from quality preset)
│   └── processors/
│       └── visualization.processor.ts    (MODIFY — use prompt-builder, read preset from job data)

apps/api/
├── src/
│   └── ai/
│       ├── ai.controller.ts              (MODIFY — accept preset parameter)
│       └── ai.service.ts                 (MODIFY — pass preset to job queue data)

apps/web/
├── app/(main)/projects/[id]/rooms/[roomId]/
│   └── page.tsx                          (MODIFY — add Draft/Final toggle)
```

**Data flow:**

```
Frontend: user selects category + toggles Draft/Final
  → POST /api/ai/visualization { roomPhotoId, category, subCategory, preset: 'draft'|'final' }
  → ai.service.ts enqueues BullMQ job with preset in job data
  → visualization.processor.ts reads preset from job data
    → promptBuilder.buildPrompt(category, subCategory, roomType) → { positive, negative }
    → sd.denoise(..., steps: preset === 'final' ? 50 : 20)
    → Visualization.generationParams stores { preset, steps, prompt }
```

### 3. Design Constraints

| ID | Constraint | Implementation |
|----|-----------|----------------|
| AI-DC-4 | Model version tracking includes preset info | `Visualization.generationParams` JSON stores `{ preset, steps, prompt, negativePrompt, modelVersion, guidanceScale, conditioningType }`. Full reproducibility metadata. |
| AI-DC-3 | Fallback to mock on failure | Prompt builder never throws — returns sensible defaults on any input. If SD pipeline fails, mock fallback uses the prompt for logging but generates via Sharp transforms. |
| Safety | OTHER category content guardrails | `prompt-builder.ts` validates custom/OTHER prompts against a blocklist of inappropriate terms. Rejects and substitutes with safe default prompt. Logs rejected prompts. |

### 4. Detailed Design

#### 4a. Database / Schema Changes

No schema changes. The existing fields handle all new data:
- `AiJob.result: Json?` — Can store `{ preset: 'draft' | 'final' }` during processing
- `Visualization.generationParams: Json?` — Already stores generation metadata; we add `preset`, `positivePrompt`, `negativePrompt` to this JSON
- `Visualization.prompt: String?` — Stores the final positive prompt text

#### 4b. Backend / API Changes

**File: `apps/ai-worker/src/models/prompt-builder.ts`** (CREATE)

Core function:
```typescript
interface PromptResult {
  positive: string;
  negative: string;
}

interface DesignInput {
  category: string;
  subCategory?: string;
  roomType?: string;
  color?: string;
  material?: string;
  style?: string;
  pattern?: string;
  mood?: string;
  temperature?: string;
}

function buildPrompt(input: DesignInput): PromptResult
```

**Style modifiers** (appended to all positive prompts):
```
", photorealistic interior design photography, professional lighting, 4k detail, sharp focus, architectural digest quality, high resolution"
```

**Base negative prompt** (used for all categories):
```
"blurry, deformed, unrealistic, cartoon, low quality, watermark, text, logo, signature, disfigured, bad anatomy, extra limbs, oversaturated, underexposed, overexposed, noise, grain, jpeg artifacts, out of focus"
```

**Category prompt templates:**

| Category | Positive Prompt Template |
|----------|------------------------|
| CIVIL | `"interior room with {color fallback='warm white'} painted walls, smooth finish, same furniture and layout preserved, {style fallback='modern'} aesthetic"` |
| BATHROOM_CAT | `"bathroom with {pattern fallback='subway'} {color fallback='white'} ceramic tiles on walls and floor, modern fixtures, clean grout lines, {style fallback='contemporary'} design"` |
| KITCHEN_CAT | `"kitchen with {style fallback='shaker'} {color fallback='white'} cabinets, {material fallback='granite'} countertop, organized, stainless steel appliances, {mood fallback='bright'} atmosphere"` |
| FURNISHINGS | `"interior room with {style fallback='modern'} furniture arrangement, {mood fallback='warm'} lighting, comfortable seating, coordinated decor, {color fallback='neutral'} color palette"` |
| ELECTRICAL | `"interior room with {style fallback='recessed'} modern light fixtures, {temperature fallback='warm white'} lighting, ambient illumination, well-lit spaces, {mood fallback='cozy'} atmosphere"` |
| OTHER | `"{customPrompt validated and sanitized}" + style modifiers` |

**Fallback values:** Each template field has a fallback (shown above) used when the corresponding `DesignInput` field is missing or empty. This ensures prompts are always complete.

**SubCategory parsing:** The `subCategory` string from the Design record may contain structured data like `"color:navy,style:modern"` or a free-text description. The prompt builder:
1. Tries to parse as comma-separated key:value pairs
2. Falls back to using the full string as a style descriptor
3. Extracts known keys: color, material, style, pattern, mood, temperature

**Category-specific negative prompt additions:**

| Category | Additional Negative Terms |
|----------|--------------------------|
| BATHROOM_CAT | `"dirty, stained, cracked tiles, mold, rust"` |
| KITCHEN_CAT | `"messy, dirty dishes, cluttered counters, grease"` |
| FURNISHINGS | `"broken furniture, torn fabric, scratched surfaces"` |
| ELECTRICAL | `"exposed wires, broken bulbs, flickering lights"` |

**OTHER category safety guardrails:**
```typescript
const BLOCKED_TERMS = [
  'nude', 'naked', 'explicit', 'nsfw', 'violence', 'weapon', 'gore',
  'drug', 'illegal', 'hate', 'offensive', /* ... extended blocklist */
];

function sanitizeCustomPrompt(prompt: string): string {
  const lower = prompt.toLowerCase();
  for (const term of BLOCKED_TERMS) {
    if (lower.includes(term)) {
      logger.warn(`Blocked term "${term}" in custom prompt. Using safe default.`);
      return 'clean modern interior room, neutral tones, minimalist design';
    }
  }
  // Also strip any HTML/script injection attempts
  return prompt.replace(/<[^>]*>/g, '').trim().substring(0, 500);
}
```

**Quality presets:**
```typescript
export const QUALITY_PRESETS = {
  draft: { steps: 20, guidanceScale: 7.5, label: 'Draft Preview' },
  final: { steps: 50, guidanceScale: 8.5, label: 'Final Quality' },
} as const;

export type QualityPreset = keyof typeof QUALITY_PRESETS;
```

Note: Final uses a slightly higher guidance scale (8.5 vs 7.5) for more prompt-faithful output at the cost of slightly less diversity.

**File: `apps/ai-worker/src/models/stable-diffusion.ts`** (MODIFY)
- The `denoise()` function already accepts `steps` as a parameter from SPEC-025. No changes needed to the SD module itself — the processor passes the preset-determined step count.

**File: `apps/ai-worker/src/processors/visualization.processor.ts`** (MODIFY)
- Read `preset` from `job.data` (default to `'draft'` if not provided)
- Replace basic prompt construction with `promptBuilder.buildPrompt()`:
  ```typescript
  const { positive, negative } = promptBuilder.buildPrompt({
    category: job.data.category,
    subCategory: job.data.subCategory,
    roomType: job.data.roomType,
  });
  ```
- Read steps and guidanceScale from `QUALITY_PRESETS[preset]`
- Pass to `sd.denoise()`: `{ steps: presetConfig.steps, guidanceScale: presetConfig.guidanceScale, ... }`
- Store in Visualization record:
  ```typescript
  generationParams: {
    category,
    subCategory,
    preset,
    mode: 'real', // or 'mock' in fallback
    steps: presetConfig.steps,
    guidanceScale: presetConfig.guidanceScale,
    positivePrompt: positive,
    negativePrompt: negative,
    conditioningType: 'canny',
    modelVersion: SD_MODEL_VERSION,
    timestamp: new Date().toISOString(),
  }
  ```
- Store `positive` in `Visualization.prompt` field

**File: `apps/api/src/ai/ai.controller.ts`** (MODIFY)
- Update `requestVisualization` body type to include optional `preset`:
  ```typescript
  @Body() body: {
    roomPhotoId: string;
    category: string;
    subCategory?: string;
    options?: Record<string, unknown>;
    preset?: 'draft' | 'final';
  },
  ```
- Pass `preset` through to `aiService.requestVisualization()`

**File: `apps/api/src/ai/ai.service.ts`** (MODIFY)
- Update `requestVisualization` to accept and pass `preset`:
  ```typescript
  async requestVisualization(
    userId: string,
    roomPhotoId: string,
    designData: {
      category: string;
      subCategory?: string;
      options?: Record<string, unknown>;
      preset?: 'draft' | 'final';
    },
  )
  ```
- Include `preset` in BullMQ job data:
  ```typescript
  await this.visualizationQueue.add(
    'visualize',
    { jobId: job.id, roomPhotoId, designId: design.id, userId, preset: designData.preset || 'draft', ...designData },
    { ... },
  );
  ```
- Store preset in AiJob.result for tracking:
  ```typescript
  await this.prisma.aiJob.update({
    where: { id: job.id },
    data: { result: { preset: designData.preset || 'draft' } },
  });
  ```

#### 4c. Frontend / UI Changes

**File: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx`** (MODIFY)

Add a Draft/Final toggle in the visualization generation section, between the CategorySelector and the "Generate" button.

New state:
```typescript
const [qualityPreset, setQualityPreset] = useState<'draft' | 'final'>('draft');
```

UI addition (insert between CategorySelector and Generate button):
```tsx
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, mb: 1 }}>
  <Typography variant="body2" color="text.secondary">Quality:</Typography>
  <Chip
    label="Draft"
    variant={qualityPreset === 'draft' ? 'filled' : 'outlined'}
    color={qualityPreset === 'draft' ? 'primary' : 'default'}
    onClick={() => setQualityPreset('draft')}
    size="small"
  />
  <Chip
    label="Final"
    variant={qualityPreset === 'final' ? 'filled' : 'outlined'}
    color={qualityPreset === 'final' ? 'primary' : 'default'}
    onClick={() => setQualityPreset('final')}
    size="small"
  />
  <Typography variant="caption" color="text.secondary">
    {qualityPreset === 'draft' ? '~30s, quick preview' : '~90s, high quality'}
  </Typography>
</Box>
```

Update the generate API call to include preset:
```typescript
// In the handleGenerate function (or equivalent):
const response = await apiClient.post('/ai/visualization', {
  roomPhotoId: room.photos[0].id,
  category: selectedCategory,
  subCategory: selectedSubCategory,  // if available
  preset: qualityPreset,
});
```

MUI components used: `Chip` (already imported or available from MUI), `Typography`, `Box` — all already imported in the page.

#### 4d. Shared / Cross-cutting Changes

**Regenerate endpoint update:**

`apps/api/src/ai/ai.service.ts` — `regenerateDesign()` currently does not pass a preset. Update it to:
1. Read the preset from the most recent Visualization's `generationParams.preset` for the design
2. Default to `'draft'` if not found
3. Pass it in the BullMQ job data

This ensures regenerated designs maintain their quality setting.

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| CREATE | apps/ai-worker/src/models/prompt-builder.ts | Category-to-prompt mapping, style modifiers, negative prompts, safety guardrails | Med |
| MODIFY | apps/ai-worker/src/processors/visualization.processor.ts | Use prompt-builder, read preset, store full metadata | Med |
| MODIFY | apps/api/src/ai/ai.controller.ts | Accept optional `preset` parameter in visualization body | Low |
| MODIFY | apps/api/src/ai/ai.service.ts | Pass preset to queue data, store in job result | Low |
| MODIFY | apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx | Add Draft/Final quality toggle chips | Low |

### 6. Dependency & Reference Check

#### No New External Dependencies
- `prompt-builder.ts` is pure TypeScript — no imports beyond standard library.
- All MUI components used in frontend (`Chip`, `Typography`, `Box`) are already available.

#### Internal Dependencies
- `prompt-builder.ts` is consumed by `visualization.processor.ts`. New file, no existing consumers.
- `visualization.processor.ts` already imports from `models/stable-diffusion.ts` (SPEC-025). Now also imports from `models/prompt-builder.ts`.
- `ai.controller.ts` already accepts a `body` with `options?: Record<string, unknown>`. Adding `preset` is backward-compatible (optional field).
- `ai.service.ts` already spreads `designData` into queue job data. Adding `preset` flows through naturally.
- Room detail page already calls `apiClient.post('/ai/visualization', ...)`. Adding `preset` to the body is additive.
- `regenerateDesign()` in `ai.service.ts` reads from existing Visualization records — no new data needed, just reads `generationParams.preset`.

#### Backward Compatibility
- `preset` is optional everywhere — defaults to `'draft'`. Existing API calls without `preset` work unchanged.
- Existing Visualization records without `preset` in `generationParams` are unaffected — they simply lack the field.
- Mock fallback path stores the prompt for logging but does not use it for image generation.

### 7. Implementation Plan

**Step 1:** Create prompt builder module
- File: apps/ai-worker/src/models/prompt-builder.ts
- Action: create — implement buildPrompt() with all 6 category templates, style modifiers, negative prompts, subCategory parsing, safety guardrails for OTHER
- Test: unit tests for each category, edge cases (empty input, blocked terms)

**Step 2:** Update visualization processor to use prompt builder
- File: apps/ai-worker/src/processors/visualization.processor.ts
- Action: modify — replace basic prompt with `promptBuilder.buildPrompt()`, read `preset` from job data, use `QUALITY_PRESETS` for steps/guidance, store full metadata in generationParams

**Step 3:** Update API controller to accept preset
- File: apps/api/src/ai/ai.controller.ts
- Action: modify — add `preset?: 'draft' | 'final'` to requestVisualization body type

**Step 4:** Update API service to pass preset
- File: apps/api/src/ai/ai.service.ts
- Action: modify — include `preset` in queue job data, store in AiJob.result, update regenerateDesign to read preset from previous visualization

**Step 5:** Add quality toggle to room detail page
- File: apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx
- Action: modify — add `qualityPreset` state, render Draft/Final Chip toggles, include preset in API call

**Step 6:** Verify end-to-end
- Select category + Draft → generate → verify 20-step output, generationParams shows `{ preset: 'draft', steps: 20 }`
- Select category + Final → generate → verify 50-step output, generationParams shows `{ preset: 'final', steps: 50 }`
- No preset → defaults to draft
- OTHER category with blocked term → safe default prompt used

### 8. Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|-----------|
| Prompt templates produce poor SD output for some categories | Med | Med | Iterative tuning needed. Start with templates above, evaluate outputs, adjust wording. Style modifiers provide baseline quality. Negative prompts prevent worst artifacts. |
| SubCategory parsing fails on unexpected formats | Low | Med | Parser is defensive: tries key:value pairs, falls back to using raw string as style, falls back to category defaults. Never throws. |
| Safety guardrails too aggressive (false positives on legitimate terms) | Low | Low | Blocklist is focused on clearly inappropriate terms. "drug" could false-positive on "drugstore" — refine to match whole words only using `\b` word boundaries in check. |
| Safety guardrails too lax (misses inappropriate content) | Med | Med | SD 1.5 itself has limited NSFW generation capability. Blocklist catches obvious terms. For production, add a CLIP-based image safety classifier on outputs (future enhancement, not in scope). |
| Final quality (50 steps) too slow for user expectations | Low | Med | ~90s is acceptable for "final quality". UI shows expected time estimate. Draft is default — users opt into longer wait. |
| Preset not passed through regenerate flow | Low | Med | Explicitly handle in Step 4: read preset from previous Visualization.generationParams. Default to 'draft' if missing. |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests

**prompt-builder.test.ts:**
- `buildPrompt({ category: 'CIVIL' })` positive includes "painted walls" and style modifiers
- `buildPrompt({ category: 'CIVIL' })` negative includes base negative terms
- `buildPrompt({ category: 'CIVIL', color: 'navy blue' })` positive includes "navy blue"
- `buildPrompt({ category: 'BATHROOM_CAT' })` positive includes "ceramic tiles"
- `buildPrompt({ category: 'BATHROOM_CAT' })` negative includes "dirty, stained, cracked tiles"
- `buildPrompt({ category: 'KITCHEN_CAT', material: 'marble' })` positive includes "marble countertop"
- `buildPrompt({ category: 'FURNISHINGS', mood: 'cozy' })` positive includes "cozy lighting"
- `buildPrompt({ category: 'ELECTRICAL', temperature: 'cool white' })` positive includes "cool white lighting"
- `buildPrompt({ category: 'OTHER' })` uses safe default prompt
- `buildPrompt({ category: 'OTHER', subCategory: 'some normal description' })` includes description
- `buildPrompt({ category: 'OTHER', subCategory: 'nude content' })` blocks and uses safe default
- All prompts end with style modifiers ("photorealistic interior design photography...")
- All negative prompts include base negative terms ("blurry, deformed, unrealistic...")
- `buildPrompt({})` (no category) returns sensible default (OTHER fallback)
- SubCategory parsing: `"color:red,style:modern"` extracts color=red, style=modern
- SubCategory parsing: `"rustic wooden"` used as style descriptor
- QUALITY_PRESETS.draft has steps=20, guidanceScale=7.5
- QUALITY_PRESETS.final has steps=50, guidanceScale=8.5

#### 9b. Integration Tests

- Visualization processor with prompt-builder: verify generated Visualization.prompt matches expected template for each category
- Visualization processor with preset='final': verify 50 steps passed to SD denoise, generationParams includes `{ preset: 'final', steps: 50 }`
- Visualization processor with preset='draft': verify 20 steps, generationParams includes `{ preset: 'draft', steps: 20 }`
- Visualization processor with no preset: defaults to draft (20 steps)
- API integration: POST /api/ai/visualization with `{ preset: 'final' }` → job data includes preset → processor reads it
- Regenerate integration: regenerate design → reads preset from previous visualization → uses same preset

#### 9c. E2E / UI Tests

- Room detail page: quality toggle renders with Draft selected by default
- Room detail page: click Final → chip highlights, shows "~90s, high quality" text
- Room detail page: click Draft → chip highlights, shows "~30s, quick preview" text
- Generate with Draft: API call includes `preset: 'draft'`
- Generate with Final: API call includes `preset: 'final'`
- Full flow: select CIVIL category + Final → generate → wait → visualization appears with no watermark, generationParams in DB has `preset: 'final'`
- OTHER category with safe prompt: generates normally
- Backward compatibility: old designs without preset in generationParams still display correctly

### 10. Verification Criteria

- [ ] `prompt-builder.ts` maps all 6 categories to distinct positive prompts
- [ ] All positive prompts include photorealistic style modifiers
- [ ] All prompts include comprehensive negative prompt terms
- [ ] Category-specific negative terms added (BATHROOM: dirty/stained, KITCHEN: messy, etc.)
- [ ] SubCategory values (color, material, style, pattern, mood, temperature) interpolated into prompts
- [ ] Fallback values used when subCategory fields are missing
- [ ] OTHER category validates against blocked terms and substitutes safe default
- [ ] Blocked term check uses word boundaries to avoid false positives
- [ ] Custom prompts truncated to 500 chars and HTML stripped
- [ ] QUALITY_PRESETS defines draft (20 steps, 7.5 guidance) and final (50 steps, 8.5 guidance)
- [ ] `ai.controller.ts` accepts optional `preset` parameter
- [ ] `ai.service.ts` passes `preset` in BullMQ job data
- [ ] `ai.service.ts` stores `preset` in AiJob.result
- [ ] `visualization.processor.ts` reads preset and uses correct step count
- [ ] `visualization.processor.ts` stores full metadata in Visualization.generationParams
- [ ] `regenerateDesign()` reads preset from previous visualization
- [ ] Room detail page shows Draft/Final toggle chips
- [ ] Draft is selected by default
- [ ] Time estimates shown for each preset
- [ ] Generate API call includes `preset` value
- [ ] `pnpm typecheck` passes in ai-worker and api
- [ ] All existing tests continue to pass
- [ ] Preset defaults to 'draft' when not provided (backward compatible)
