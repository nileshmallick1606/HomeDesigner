# SPEC-007 — Visualization Experience (Before/After + Fabric.js Editor)

**Parent Feature:** InteriorScience MVP
**Spec Number:** 007 of 9
**Prerequisites:** SPEC-006

## Status: Not Started

### 1. Objective

Implement the before/after comparison experience (slider and side-by-side views) and the Fabric.js-based photo editing canvas (color adjustment, texture overlay, annotation/markup, text labels, undo/redo, canvas state serialization).

- **Before:** AI generates visualization images, but users have no way to compare them with originals or manually edit/annotate
- **After:** Smooth before/after slider comparison, side-by-side view, and a full Fabric.js editing canvas with annotations, color tools, undo/redo, and persistent canvas state (save/resume editing)
- **Success criteria:** Slider comparison works smoothly at 60fps on mid-range Android. Fabric.js canvas supports all editing tools. Canvas state serialized to JSON and persisted — user can close and resume exactly where they left off (DC-11).

### 2. Architecture

```
Before/After Comparison:
  ┌─────────────────────────────┐
  │  Original  │  Visualization │
  │   Photo    │   Photo        │
  │            │←── slider ──→  │
  └─────────────────────────────┘
  Implementation: Custom Canvas API (lightweight, no Fabric.js overhead)
  - Two images clipped by slider position
  - Touch drag to move slider
  - Swipe gesture for side-by-side mode toggle

Fabric.js Editor:
  ┌─────────────────────────────┐
  │  Toolbar (top)              │
  │  [Undo][Redo][Save][Export] │
  ├─────────────────────────────┤
  │                             │
  │   Fabric.js Canvas          │
  │   (room photo as background)│
  │   + editable objects        │
  │                             │
  ├─────────────────────────────┤
  │  Tool Sidebar (bottom on    │
  │  mobile, right on desktop)  │
  │  [Draw][Text][Shape][Color] │
  │  [Filter][Eraser]           │
  └─────────────────────────────┘

Canvas State Persistence (DC-11):
  User edits → Canvas state auto-saved to Design.canvasState (JSON)
    → On revisit, canvas restored from JSON exactly as left
  Save triggers: every 30 seconds auto-save + on blur/close + explicit save
```

### 3. Design Constraints

- DC-11: Fabric.js canvas state MUST be serialized to JSON and stored in DB for every design. Users must resume editing exactly where they left off.
- DC-13: 60fps canvas interaction on mid-range Android. Bundle size <500KB gzipped.
- PRD F7: Side-by-side and slider-based comparison. Swipe/drag to reveal. Smooth on mobile.
- PRD F8: Color adjustment, texture overlay, annotation/markup, text labels, undo/redo. Canvas state serialization.
- PRD §7: Pinch-zoom on photos/visualizations. Touch-friendly controls.
- AI-DECIDED #5: Lightweight custom Canvas for before/after slider, Fabric.js for full editor.

### 4. Detailed Design

#### 4a. Database / Schema Changes
- No new schema — Design.canvasState field stores Fabric.js JSON (from SPEC-002)
- DesignVersion records created on each explicit save (version history)

#### 4b. Backend / API Changes

**File: `apps/api/src/designs/designs.controller.ts` (update)**
- PATCH /api/designs/:id/canvas — Save canvas state (JSON body)
- GET /api/designs/:id/canvas — Get canvas state
- POST /api/designs/:id/versions — Create version snapshot
- GET /api/designs/:id/versions — List version history
- POST /api/designs/:id/export — Export design as image (server-side render via Sharp if needed)

**File: `apps/api/src/designs/designs.service.ts` (update)**
- saveCanvasState(): Validate JSON structure, store in Design.canvasState, auto-create version if significant change. **Conflict detection:** The save request includes an `expectedVersion` (timestamp or version number) of the last known state. If the server's current version is newer (another tab/session saved), the save is rejected with a 409 Conflict response. The frontend displays a dialog: "This design was modified elsewhere. Reload latest or overwrite?"
- getCanvasState(): Return current canvas state JSON
- createVersion(): Snapshot current state with version number, generate thumbnail
- listVersions(): Return version history with thumbnails
- exportAsImage(): Composite canvas layers into final image via Sharp, return download URL

#### 4c. Frontend / UI Changes

**File: `apps/web/components/comparison/before-after-slider.tsx`**
- Custom Canvas implementation (NOT Fabric.js — lightweight for performance)
- Draws original and visualization images side by side, clipped by slider position
- Touch/mouse drag on slider handle
- Smooth 60fps animation via requestAnimationFrame
- Responsive: fills container width
- Accessibility: keyboard arrow keys move slider

**File: `apps/web/components/comparison/side-by-side.tsx`**
- Two images in a horizontal layout (stacked on very small screens)
- Synchronized pinch-zoom between both images
- Labels: "Before" / "After"
- Toggle between slider and side-by-side modes

**File: `apps/web/components/comparison/comparison-view.tsx`**
- Container component with mode toggle (slider | side-by-side)
- Share button (exports comparison image)
- Full-screen mode for detailed inspection

**File: `apps/web/components/editor/fabric-canvas.tsx`**
- Fabric.js canvas wrapper component
- Loads room photo as non-editable background
- Loads visualization as overlay layer
- Initializes from saved canvas state JSON (DC-11)
- Auto-save every 30 seconds + on blur
- Pinch-to-zoom support on mobile
- Canvas resize on window/container resize

**File: `apps/web/components/editor/toolbar.tsx`**
- Top toolbar: Undo, Redo, Save, Export, Close
- Undo/redo stack management (Fabric.js history)
- Save triggers canvas state serialization
- Export downloads the canvas as PNG/JPEG

**File: `apps/web/components/editor/tool-panel.tsx`**
- Bottom panel on mobile (slides up), side panel on desktop
- Tools:
  - **Draw:** Free-hand drawing with color and brush size
  - **Text:** Add text labels with font, size, color options
  - **Shapes:** Rectangle, circle, arrow, line
  - **Color Picker:** Apply color overlay to selected area
  - **Filters:** Brightness, contrast, saturation adjustments on visualization layer
  - **Eraser:** Remove drawn objects
- Active tool highlighted
- Tool options panel (shows when tool selected)

**File: `apps/web/components/editor/undo-redo-manager.ts`**
- Canvas history stack (max 50 states)
- Push state on each user action
- Undo/redo traverse the stack
- Clear stack on new design load

**File: `apps/web/components/editor/canvas-state-manager.ts`**
- Serializes Fabric.js canvas to JSON (canvas.toJSON())
- Deserializes JSON back to canvas (canvas.loadFromJSON())
- Auto-save timer (30 seconds)
- Save on blur/visibility change (beforeunload, visibilitychange)
- Debounced save to prevent excessive API calls

**File: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx`**
- Design detail page
- Tabs: Comparison | Editor | Versions
- Comparison tab: before/after slider + side-by-side
- Editor tab: Fabric.js canvas with tools
- Versions tab: version history with thumbnails, restore button

**File: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/edit/page.tsx`**
- Full-screen editor view
- Fabric.js canvas fills viewport
- Toolbar overlay (semi-transparent)
- Tool panel at bottom
- Auto-save indicator ("Saved" / "Saving...")

#### 4d. Shared / Cross-cutting Changes

**File: `packages/shared/src/types/editor.ts`**
- CanvasState type, ToolType enum, DesignVersionDto interface

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| CREATE | apps/web/components/comparison/before-after-slider.tsx | Slider comparison | Med |
| CREATE | apps/web/components/comparison/side-by-side.tsx | Side-by-side view | Low |
| CREATE | apps/web/components/comparison/comparison-view.tsx | Comparison container | Low |
| CREATE | apps/web/components/editor/fabric-canvas.tsx | Fabric.js wrapper | High |
| CREATE | apps/web/components/editor/toolbar.tsx | Editor toolbar | Med |
| CREATE | apps/web/components/editor/tool-panel.tsx | Tool selection panel | Med |
| CREATE | apps/web/components/editor/undo-redo-manager.ts | History management | Med |
| CREATE | apps/web/components/editor/canvas-state-manager.ts | State persistence | High |
| CREATE | apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx | Design detail | Med |
| CREATE | apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/edit/page.tsx | Full editor | High |
| CREATE | packages/shared/src/types/editor.ts | Editor types | Low |
| MODIFY | apps/api/src/designs/designs.controller.ts | Add canvas/version endpoints | Med |
| MODIFY | apps/api/src/designs/designs.service.ts | Add canvas/version/export logic | Med |

### 6. Dependency & Reference Check

#### Frontend Wiring
- npm packages: fabric (v6+), add to apps/web/package.json
- Comparison components used in design detail page
- Editor components used in editor page
- Canvas state manager uses API client for save/load

#### Backend Wiring
- New endpoints on existing DesignsController
- Sharp for server-side image compositing (export feature)
- DesignVersion model from SPEC-002 schema

### 7. Implementation Plan

**Step 1:** Create before/after slider component
- Files: apps/web/components/comparison/before-after-slider.tsx
- Action: create
- Details: Custom Canvas API. Two images clipped by slider. Touch drag. 60fps. Keyboard accessible.

**Step 2:** Create side-by-side and comparison container
- Files: apps/web/components/comparison/side-by-side.tsx, comparison-view.tsx
- Action: create
- Details: Side-by-side with synced zoom. Mode toggle. Full-screen support.

**Step 3:** Create undo/redo and canvas state managers
- Files: apps/web/components/editor/undo-redo-manager.ts, canvas-state-manager.ts
- Action: create
- Details: History stack (50 states). Auto-save (30s + blur). Serialize/deserialize JSON.

**Step 4:** Create Fabric.js canvas wrapper
- Files: apps/web/components/editor/fabric-canvas.tsx
- Action: create
- Details: Initialize Fabric.js canvas. Load background image (room photo). Load overlay (visualization). Restore from saved JSON (DC-11). Pinch-zoom on mobile.

**Step 5:** Create toolbar and tool panel
- Files: apps/web/components/editor/toolbar.tsx, tool-panel.tsx
- Action: create
- Details: Undo/redo/save/export toolbar. Tool panel with draw, text, shapes, color, filters, eraser.

**Step 6:** Update backend design endpoints
- Files: apps/api/src/designs/designs.controller.ts, designs.service.ts
- Action: modify
- Details: Add canvas state save/load, version management, export endpoints.

**Step 7:** Create design detail and editor pages
- Files: apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx, edit/page.tsx
- Action: create
- Details: Design detail with comparison/editor/versions tabs. Full-screen editor view.

**Step 8:** Create shared editor types
- Files: packages/shared/src/types/editor.ts
- Action: create

### 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Fabric.js performance on low-end Android | High | Limit canvas resolution to viewport size, lazy load Fabric.js, test on target devices, offer "lite mode" without Fabric.js |
| Fabric.js bundle size exceeding DC-13 | Med | Dynamic import (next/dynamic), tree-shake unused features, only load on editor pages |
| Canvas state JSON too large for DB | Med | Compress JSON before storage (gzip), limit object count, warn user if state exceeds 1MB |
| Before/after slider janky on mobile | Med | Use requestAnimationFrame, avoid layout thrashing, GPU-composited layers |
| Auto-save conflicts with concurrent edits | Low | Auto-save is per-user — project locking (DC-8) prevents concurrent edits in MVP |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests
- **Before/after slider:** Slider position clips images correctly at 0%, 50%, 100%
- **Canvas state manager:** Serializes canvas to JSON correctly
- **Canvas state manager:** Deserializes JSON back to identical canvas state
- **Canvas state manager:** Auto-save fires every 30 seconds
- **Canvas state manager:** Save on blur/visibility change
- **Undo/redo manager:** Undo reverses last action
- **Undo/redo manager:** Redo re-applies undone action
- **Undo/redo manager:** Stack limited to 50 states
- **DesignsService.saveCanvasState:** Stores JSON in Design record
- **DesignsService.createVersion:** Creates version with incremented number
- **DesignsService.exportAsImage:** Composites layers into single image

#### 9b. Integration Tests
- **Canvas persistence round-trip:** Save canvas state → reload page → canvas restored exactly (DC-11)
- **Version history:** Save → create version → modify → create version → list shows 2 versions → restore first version
- **Export:** Edit canvas → export → downloadable image reflects edits
- **Before/after with real images:** Load original + visualization → slider works with actual image dimensions

#### 9c. E2E UI Automation Tests
- **Before/after slider:** Open design → slider visible → drag slider → both images visible
- **Side-by-side toggle:** Toggle mode → side-by-side view → toggle back → slider view
- **Editor flow:** Open editor → draw annotation → add text → undo → redo → save
- **Canvas persistence:** Edit → save → navigate away → return → edits preserved (DC-11)
- **Version history:** Edit → create version → edit more → versions tab shows history → restore old version
- **Export:** Open editor → export → file downloads

### 10. Verification Criteria
- [ ] Before/after slider renders at 60fps on mid-range Android
- [ ] Slider comparison works with touch drag
- [ ] Side-by-side view with synchronized zoom
- [ ] Fabric.js canvas initializes with room photo background
- [ ] All editing tools work: draw, text, shapes, color, filters, eraser
- [ ] Undo/redo works correctly (max 50 states)
- [ ] Canvas state serialized to JSON and stored in DB (DC-11)
- [ ] Canvas state restored exactly on revisit (DC-11)
- [ ] Auto-save every 30 seconds + on blur
- [ ] Version history with snapshots and restore
- [ ] Export generates downloadable image
- [ ] Fabric.js bundle loaded via dynamic import (bundle size DC-13)
- [ ] Pinch-to-zoom works on mobile
