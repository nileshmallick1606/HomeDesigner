# SPEC-022 — AI Visualization Quality

**Parent Feature:** InteriorScience Phase 3
**Spec Number:** 022 of 022 (Phase 3: 6 of 6)
**Prerequisites:** None (independent)

## Status: Not Started

### 1. Objective

Improve the mock AI visualization transforms in the ai-worker to produce more convincing, distinctly different results per category. Upgrade the watermark to be less intrusive. All transforms must remain under 5 seconds.

- **Before:** Mock visualizations apply simple full-image tints (blue for CIVIL, cyan for BATHROOM, etc.) that look artificial and uniform. Watermark is large and dominates the image. All categories produce similar-looking results.
- **After:** Each category produces a noticeably different, more believable transformation. CIVIL uses selective tinting via contrast masking. BATHROOM/KITCHEN composites a subtle pattern texture overlay. FURNISHINGS applies vignette + selective brightness zones. ELECTRICAL uses warm glow with radial gradient. OTHER gets enhanced sepia with contrast boost. Watermark is semi-transparent, positioned in the bottom-right corner with smaller text.
- **Success criteria:** Each of the 6 category transforms produces visually distinct output. Transforms are believable (not obviously a single filter). Watermark is present but not dominating. Generation time < 5 seconds per image. All existing tests still pass.

### 2. Architecture

```
apps/ai-worker/src/models/mock-ai.ts (MODIFY)

mockVisualization(imageBuffer, category):
  ├── CIVIL: Selective wall tint
  │   ├── Extract high-contrast areas (edge detection → threshold → invert = wall mask)
  │   ├── Apply blue-grey tint to masked areas only (composite tinted version with mask)
  │   └── Slight overall brightness adjustment (+5%)
  │
  ├── BATHROOM_CAT: Pattern texture overlay
  │   ├── Generate subtle tile pattern via Sharp (repeating small rectangles SVG)
  │   ├── Composite pattern at low opacity (0.15) over image
  │   └── Boost saturation slightly (+10%) + cool color shift
  │
  ├── KITCHEN_CAT: Pattern texture overlay (different pattern)
  │   ├── Generate wood grain pattern via Sharp (horizontal lines SVG with noise)
  │   ├── Composite pattern at low opacity (0.12) over image
  │   └── Warm color shift + slight contrast boost
  │
  ├── FURNISHINGS: Vignette + brightness zones
  │   ├── Create radial vignette overlay (dark corners, bright center)
  │   ├── Composite vignette over image
  │   ├── Apply selective brightness: center 20% brighter, edges 10% darker
  │   └── Boost saturation (+15%) + warm modulation
  │
  ├── ELECTRICAL: Warm glow effect
  │   ├── Create radial gradient overlay (warm yellow-orange center, transparent edges)
  │   ├── Composite gradient at low opacity (0.2) using 'screen' blend
  │   ├── Increase overall brightness (+10%)
  │   └── Warm tint (amber tone) at reduced intensity
  │
  └── OTHER (default): Enhanced sepia with contrast
      ├── Apply sepia: desaturate to 30% + warm tint
      ├── Boost contrast via linear adjustment (1.2x)
      ├── Add subtle grain texture overlay (noise SVG at 0.05 opacity)
      └── Slight vignette for depth

addWatermark(imageBuffer, text):
  ├── Smaller font size: Math.max(12, Math.floor(width / 40))  (was /25)
  ├── Semi-transparent background: rgba(0,0,0,0.4)  (was 0.6)
  ├── Position: bottom-right corner with 8px margin
  ├── Text: "AI Preview" (shorter, was "AI Preview (Mock)")
  └── Output format remains webp quality 85
```

### 3. Design Constraints

- P3-DC-8: All Phase 1 and Phase 2 constraints remain in effect.
- Generation time must remain under 5 seconds (currently 2-3s). More complex transforms are acceptable but must not exceed the budget.
- Output format: webp quality 85 (unchanged).
- All transforms must work on any input image size/aspect ratio without crashing.
- No external dependencies beyond Sharp (already installed).

### 4. Detailed Design

#### 4a. Database / Schema Changes
- None.

#### 4b. Backend / API Changes
- None — changes are entirely within the ai-worker service.

#### 4c. Frontend / UI Changes
- None — visualizations are displayed using existing components. Improved quality is automatically visible.

#### 4d. Shared / Cross-cutting Changes

**File: `apps/ai-worker/src/models/mock-ai.ts`** (MODIFY)

**Function: `mockVisualization`** — Complete rewrite of the switch/case body.

CIVIL transform (selective wall tint):
```ts
case 'CIVIL': {
  const metadata = await sharp(imageBuffer).metadata();
  const w = metadata.width || 800;
  const h = metadata.height || 600;

  // Create a mask from high-contrast areas (approximates walls)
  const mask = await sharp(imageBuffer)
    .grayscale()
    .convolve({ width: 3, height: 3, kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] })
    .negate()
    .threshold(200)  // Keep only large flat areas (walls)
    .blur(3)         // Soften mask edges
    .png()
    .toBuffer();

  // Create tinted version (blue-grey wall color)
  const tinted = await sharp(imageBuffer)
    .tint({ r: 140, g: 160, b: 200 })
    .png()
    .toBuffer();

  // Composite: use mask to blend tinted version over original
  pipeline = sharp(imageBuffer)
    .composite([{ input: tinted, blend: 'over', raw: undefined }])
    .modulate({ brightness: 1.05 });
  // Note: Full masking requires extracting channels. Simplified approach:
  // Apply moderate tint to entire image + brighten. The mask-based approach
  // is aspirational; implement the best achievable with Sharp's API.
  break;
}
```

Practical CIVIL implementation (achievable with Sharp):
- Apply a moderate blue-grey tint (not full-image — use `tint` with muted values).
- Modulate brightness +5%, saturation -10% (simulates repainted walls muting color).
- Composite a subtle gradient overlay (lighter top, darker bottom) to simulate wall lighting.

BATHROOM_CAT transform (tile pattern overlay):
- Generate an SVG tile pattern: repeating 20x20 grid of thin-bordered rectangles in light grey.
- Use Sharp to create the pattern as a PNG buffer at image dimensions.
- Composite the pattern over the image at 15% opacity.
- Modulate: saturation +10%, brightness +3%.
- Apply a slight cool tint: tint({ r: 180, g: 210, b: 220 }).

KITCHEN_CAT transform (wood grain overlay):
- Generate an SVG with horizontal wavy lines in brown tones (simulates wood grain/countertop).
- Composite at 12% opacity.
- Modulate: saturation +5%, brightness +5%.
- Apply warm tint: tint({ r: 200, g: 180, b: 150 }).

FURNISHINGS transform (vignette + zones):
- Create a radial vignette SVG: transparent center, dark edges (rgba(0,0,0,0.3) at corners).
- Composite vignette over image.
- Modulate: brightness 1.15, saturation 1.15.
- Result: center of image is highlighted (simulating furniture focal point), edges recede.

ELECTRICAL transform (warm glow):
- Create a radial gradient SVG: warm yellow-orange center (rgba(255,200,100,0.25)), transparent at edges.
- Composite gradient with 'screen' blend mode (or 'add' if screen unavailable).
- Modulate: brightness 1.10.
- Apply warm tint at reduced strength: tint({ r: 230, g: 200, b: 160 }).

OTHER transform (enhanced sepia + grain):
- Modulate: saturation 0.3 (heavy desaturation).
- Tint: { r: 210, g: 180, b: 140 } (warm sepia).
- Generate noise SVG overlay (random small dots/specks in semi-transparent grey).
- Composite noise at 5% opacity.
- Apply a subtle vignette (same as FURNISHINGS but lighter, 0.15 opacity).
- Linear contrast boost: pipeline.linear(1.2, -(128 * 0.2)).

**Function: `addWatermark`** — Modify to be less intrusive.

Changes:
- Reduce font size: `Math.max(12, Math.floor(width / 40))` (was `/25`).
- Reduce background opacity: `rgba(0,0,0,0.4)` (was `0.6`).
- Shorter text: `"AI Preview"` (was `"AI Preview (Mock)"`).
- Smaller padding: 8px margin from bottom-right (was ~20px).
- Rounded corners: rx="3" (was rx="4").
- Result: watermark is visible but does not dominate the image.

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| MODIFY | apps/ai-worker/src/models/mock-ai.ts | Rewrite mockVisualization transforms for all 6 categories + improve watermark | High |

### 6. Dependency & Reference Check

#### Dependencies
- Sharp — already installed in apps/ai-worker. No new dependencies.
- No frontend changes. No backend API changes. No schema changes.

#### Callers
- mockVisualization() is called by the AI worker's job processor when generating visualizations.
- addWatermark() is called after mockVisualization() to add the watermark overlay.
- The function signatures remain identical — no callers need to change.

#### Output Format
- Output remains webp quality 85. No change to the response format or content type.
- Visualization images are stored at the same path and served the same way.

#### Image Constraints
- Input images vary in size (phone photos: 1000-4000px wide). All transforms must handle any dimensions.
- Sharp.metadata() provides width/height for SVG generation.
- SVG overlays must match input image dimensions exactly.

### 7. Implementation Plan

**Step 1:** Implement improved CIVIL transform
- File: apps/ai-worker/src/models/mock-ai.ts
- Action: modify
- Details: Replace simple tint with muted blue-grey tint + brightness modulation + gradient overlay. Creates a more realistic "repainted walls" effect.

**Step 2:** Implement BATHROOM_CAT transform
- File: apps/ai-worker/src/models/mock-ai.ts
- Action: modify
- Details: Generate tile pattern SVG at image dimensions. Composite at 15% opacity. Apply cool tint and saturation boost.

**Step 3:** Implement KITCHEN_CAT transform
- File: apps/ai-worker/src/models/mock-ai.ts
- Action: modify
- Details: Generate wood grain SVG pattern. Composite at 12% opacity. Apply warm tint and brightness boost.

**Step 4:** Implement FURNISHINGS transform
- File: apps/ai-worker/src/models/mock-ai.ts
- Action: modify
- Details: Create radial vignette SVG. Composite over image. Modulate brightness and saturation up. Creates focal-point effect.

**Step 5:** Implement ELECTRICAL transform
- File: apps/ai-worker/src/models/mock-ai.ts
- Action: modify
- Details: Create warm radial gradient SVG. Composite with screen blend. Boost brightness. Apply warm tint. Creates ambient lighting glow effect.

**Step 6:** Implement OTHER/default transform
- File: apps/ai-worker/src/models/mock-ai.ts
- Action: modify
- Details: Heavy desaturation + warm sepia tint + noise grain overlay + subtle vignette + contrast boost.

**Step 7:** Improve watermark
- File: apps/ai-worker/src/models/mock-ai.ts
- Action: modify
- Details: Reduce font size (width/40 vs width/25). Lower background opacity (0.4). Shorter text ("AI Preview"). Smaller margin (8px).

**Step 8:** Performance validation
- Action: test
- Details: Run each category transform on a test image (2000x1500). Verify all complete in < 5 seconds. Profile if any exceed 3 seconds.

### 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Complex transforms exceed 5-second budget | Med | Profile each transform individually. SVG generation + composite adds ~0.5-1s. Keep within budget. Simplify if needed. |
| SVG overlay dimension mismatch causes Sharp error | Med | Always read metadata first. Generate SVGs at exact image width x height. |
| Sharp composite blend modes not supporting 'screen' | Med | Test 'screen' blend. Fallback to 'over' with reduced opacity if not supported in Sharp version. |
| Transforms look worse than current simple tints | Med | Compare before/after visually. Keep current transforms as fallback. Each new transform should be an improvement. |
| Large images (4000px+) cause memory issues with multiple Sharp pipelines | Low | Each pipeline produces a buffer. For a 4000x3000 image, each buffer ~36MB. Multiple buffers in a single transform could use 100MB+. Ensure sequential processing, not parallel. |
| Watermark too small to be readable on small images | Low | Minimum font size of 12px. On a 400px-wide image: floor(400/40)=10 -> clamps to 12. Still readable. |
| Grain/noise overlay looks pixelated on high-res images | Low | Scale noise pattern relative to image size. Use small dots (1-2px) regardless of image dimensions. |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests
- mockVisualization('CIVIL'): returns buffer, output is webp, dimensions match input
- mockVisualization('BATHROOM_CAT'): returns buffer, output is webp
- mockVisualization('KITCHEN_CAT'): returns buffer, output is webp
- mockVisualization('FURNISHINGS'): returns buffer, output is webp
- mockVisualization('ELECTRICAL'): returns buffer, output is webp
- mockVisualization('OTHER'): returns buffer, output is webp (default case)
- mockVisualization with unknown category: returns buffer (falls to default)
- Each category produces a different output (buffer comparison — no two categories produce identical bytes for same input)
- addWatermark: returns buffer with watermark (output size > input size or equal, valid webp)
- addWatermark: works on small images (400x300)
- addWatermark: works on large images (4000x3000)
- All transforms complete in < 5 seconds for a 2000x1500 test image

#### 9b. Integration Tests
- Full visualization pipeline: input image -> mockVisualization(category) -> addWatermark -> output is valid webp
- Run all 6 categories through full pipeline -> all produce valid output
- Output images have different pixel data per category (hash comparison)
- Watermark text is "AI Preview" (verify via OCR or SVG inspection in test)
- Pipeline handles edge cases: very small image (100x100), very large image (4000x3000)
- Generation time for full pipeline (visualization + watermark) < 5 seconds

#### 9c. E2E UI Automation Tests
- Generate a CIVIL visualization -> before/after slider shows noticeably different images
- Generate a BATHROOM visualization -> output has visible pattern overlay effect
- Generate a FURNISHINGS visualization -> output has vignette/depth effect
- Watermark visible but not dominating the image (visual inspection)
- Generate visualizations for all categories -> each looks distinctly different
- Regenerate same category -> output is consistent (deterministic transforms)

### 10. Verification Criteria
- [ ] CIVIL transform: applies selective blue-grey tinting, not a uniform full-image tint
- [ ] CIVIL transform: includes brightness adjustment and gradient overlay
- [ ] BATHROOM_CAT transform: visible subtle tile pattern overlay
- [ ] BATHROOM_CAT transform: cool-toned color shift with saturation boost
- [ ] KITCHEN_CAT transform: visible subtle wood grain pattern overlay
- [ ] KITCHEN_CAT transform: warm color shift different from BATHROOM
- [ ] FURNISHINGS transform: vignette effect visible (dark corners, bright center)
- [ ] FURNISHINGS transform: warm saturation boost
- [ ] ELECTRICAL transform: warm glow effect visible (radial warm gradient)
- [ ] ELECTRICAL transform: overall brightness increase
- [ ] OTHER/default transform: sepia tone with visible grain texture
- [ ] OTHER/default transform: contrast boost compared to input
- [ ] All 6 categories produce visually distinct outputs from the same input image
- [ ] Watermark text is "AI Preview" (not "AI Preview (Mock)")
- [ ] Watermark font size is smaller than before (width/40 vs width/25)
- [ ] Watermark background opacity is 0.4 (semi-transparent, not dominant)
- [ ] Watermark positioned in bottom-right corner
- [ ] All transforms produce valid webp output at quality 85
- [ ] All transforms complete in < 5 seconds for a 2000x1500 image
- [ ] All transforms handle small images (400x300) without error
- [ ] All transforms handle large images (4000x3000) without error
- [ ] Function signatures unchanged — no caller modifications needed
- [ ] Existing pipeline integration works without changes
