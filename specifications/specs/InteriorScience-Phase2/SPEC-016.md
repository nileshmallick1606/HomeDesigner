# SPEC-016 — Fabric.js Design Editor

**Parent Feature:** InteriorScience Phase 2
**Spec Number:** 016 of 016 (Phase 2: 7 of 7)
**Prerequisites:** SPEC-012

## Status: Not Started

### 1. Objective

Build an interactive design editor using Fabric.js v6 that lets users annotate and modify AI-generated visualizations. The editor loads the room photo as a background with the visualization overlay, provides drawing/text/shapes tools, supports undo/redo, and auto-saves canvas state for persistence.

- **Before:** Design visualizations are view-only. No way to annotate, draw, or modify designs. Design.canvasState field exists but is unused.
- **After:** Users can open an editor page for any design, draw on the canvas, add text and shapes, undo/redo changes, and save their work. Canvas state persists across sessions via auto-save to the backend.
- **Success criteria:** Editor loads room photo as background + visualization as overlay. Drawing, text, and shape tools work. Undo/redo with 50-state history. Auto-save every 30s + on blur. Saved state restores correctly on reload. Fabric.js loaded via dynamic import (no SSR).

### 2. Architecture

```
Editor Page: /projects/:id/rooms/:roomId/designs/:designId/edit
  └── next/dynamic(() => import('canvas-editor'), { ssr: false })  (P2-DC-3)

canvas-editor.tsx:
  ├── Initialize Fabric.js Canvas (fabric.Canvas)
  │   ├── Load room photo as background image (fabric.Image.fromURL)
  │   └── Load visualization as overlay image (fabric.Image.fromURL, semi-transparent)
  ├── If Design.canvasState exists:
  │   └── canvas.loadFromJSON(canvasState) — restore previous session (P2-E8: try/catch)
  ├── Tools (via tool-panel.tsx):
  │   ├── Free draw (PencilBrush, adjustable color + width)
  │   ├── Text (IText, click to place, editable)
  │   ├── Shapes (Rect, Circle, Line — click+drag to create)
  │   ├── Color picker (stroke + fill)
  │   ├── Eraser (remove selected object or EraserBrush)
  │   └── Selection (default pointer mode)
  ├── Toolbar (via toolbar.tsx):
  │   ├── Undo (pop from history stack)
  │   ├── Redo (pop from redo stack)
  │   ├── Save (manual save to backend)
  │   └── Export (download canvas as PNG)
  └── Persistence:
      ├── Auto-save: setInterval 30s → canvas.toJSON() → PATCH /api/ai/designs/:id { canvasState }
      ├── On blur: window blur event → save
      └── On manual save: toolbar Save button → save + Snackbar confirmation

History Stack (undo/redo):
  ├── Max 50 states
  ├── On canvas change (object:added, object:modified, object:removed):
  │   └── Push canvas.toJSON() to history, clear redo stack
  ├── Undo: pop history → push current to redo → canvas.loadFromJSON(previous)
  └── Redo: pop redo → push current to history → canvas.loadFromJSON(next)
```

### 3. Design Constraints

- P2-DC-2: MUI component patterns for toolbar and tool panel — IconButtons, ToggleButtonGroup, Slider, ColorPicker
- P2-DC-3: Fabric.js must be loaded via next/dynamic with ssr:false. Fabric.js accesses DOM/canvas APIs not available during SSR.
- P2-DC-8: Use window.location.hostname for image URLs when loading room photos and visualizations onto canvas
- P2-DC-9: All Phase 1 constraints remain in effect
- P2-E8: Wrap canvas.loadFromJSON() in try/catch. If saved canvasState is corrupted or incompatible, catch the error, log it, and start with a fresh canvas (background photo + visualization overlay only). Show Snackbar: "Could not restore previous edits. Starting fresh."

### 4. Detailed Design

#### 4a. Database / Schema Changes
- None — Design.canvasState (Json?, nullable) already exists in Prisma schema

#### 4b. Backend / API Changes

**File: `apps/api/src/ai/ai.controller.ts`** (or equivalent designs endpoint file) (MODIFY)
- Verify PATCH /api/ai/designs/:id accepts canvasState field in body
- If not already handled: add canvasState (optional Json field) to the update DTO
- Validate canvasState is valid JSON object (not array, not primitive)
- Ensure only design owner or project EDITOR can update canvasState

**DTO update (if needed):**
- File: `apps/api/src/ai/dto/update-design.dto.ts` (MODIFY or CREATE)
- Add: canvasState?: Record<string, unknown> (optional)

#### 4c. Frontend / UI Changes

**File: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/edit/page.tsx`** (CREATE)
- Page component for the editor route
- Fetch design data: GET /api/designs/:designId (need room photo URL + visualization URL + canvasState)
- Render dynamic-imported CanvasEditor with props: roomPhotoUrl, visualizationUrl, canvasState, designId
- Loading state: full-page skeleton with "Loading editor..." message
- Error state: if design not found, show 404 message

```tsx
'use client';
import dynamic from 'next/dynamic';

const CanvasEditor = dynamic(
  () => import('@/components/editor/canvas-editor'),
  { ssr: false, loading: () => <EditorSkeleton /> }
);
```

**File: `apps/web/components/editor/canvas-editor.tsx`** (CREATE)
- Props: roomPhotoUrl: string, visualizationUrl: string, canvasState: object | null, designId: string
- Main editor component wrapping the Fabric.js canvas

- Initialization:
  1. Create fabric.Canvas on a <canvas> element ref
  2. Set canvas size to container dimensions (responsive)
  3. Load room photo as background: fabric.Image.fromURL(roomPhotoUrl) → canvas.setBackgroundImage()
  4. Load visualization as overlay: fabric.Image.fromURL(visualizationUrl) → add as image object with opacity 0.6, locked (selectable:false, evented:false)
  5. If canvasState exists: try canvas.loadFromJSON(canvasState) → catch error → log + Snackbar warning (P2-E8)

- Canvas event listeners:
  - 'object:added', 'object:modified', 'object:removed' → push state to history stack
  - Window 'blur' → trigger auto-save
  - Window 'beforeunload' → trigger save if dirty

- Auto-save:
  - setInterval(30000) → if dirty flag set → canvas.toJSON() → PATCH /api/designs/:designId { canvasState }
  - Set dirty=false after successful save
  - Show subtle save indicator (e.g., "Saved" text that fades)

- Cleanup: on unmount → dispose canvas, clear intervals, remove event listeners

- Renders: ToolPanel (left sidebar) + Canvas (center) + Toolbar (top bar)

**File: `apps/web/components/editor/toolbar.tsx`** (CREATE)
- Props: onUndo, onRedo, onSave, onExport, canUndo: boolean, canRedo: boolean, isSaving: boolean
- MUI AppBar or Paper at top of editor
- Buttons:
  - Undo (UndoIcon) — disabled when history empty
  - Redo (RedoIcon) — disabled when redo stack empty
  - Divider
  - Save (SaveIcon) — shows CircularProgress when saving
  - Export as PNG (DownloadIcon) — canvas.toDataURL('png') → trigger download
- Save indicator: "Last saved: X seconds ago" or "Unsaved changes"

**File: `apps/web/components/editor/tool-panel.tsx`** (CREATE)
- Props: activeTool, onToolChange, brushColor, onColorChange, brushWidth, onWidthChange
- MUI Paper sidebar (left side, vertical)
- Tool selection via ToggleButtonGroup (vertical):
  - Selection/Pointer (default) — canvas.isDrawingMode = false
  - Free Draw (PencilBrush) — canvas.isDrawingMode = true, set brush color/width
  - Text (click canvas to place IText) — listen for canvas click, add fabric.IText
  - Rectangle — click+drag to create fabric.Rect
  - Circle — click+drag to create fabric.Circle
  - Line — click+drag to create fabric.Line
  - Eraser — click selected object → canvas.remove(selectedObject)
- Color picker: MUI color input or simple swatches (8 preset colors + custom)
- Brush width slider: MUI Slider (1-20px)
- Opacity slider: for selected object (0-100%)

**File: `apps/web/components/editor/use-canvas-history.ts`** (CREATE)
- Custom React hook for undo/redo history management
- State: historyStack (array of JSON states, max 50), redoStack, currentIndex
- pushState(canvasJson): push to history, trim if > 50, clear redo
- undo(): pop history → return previous state, push current to redo
- redo(): pop redo → return next state, push current to history
- canUndo: historyStack.length > 0
- canRedo: redoStack.length > 0

**File: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx`** (MODIFY)
- Add "Edit Design" button/link that navigates to /projects/:id/rooms/:roomId/designs/:designId/edit

**File: `apps/web/package.json`** (MODIFY)
- Add dependency: fabric@^6

#### 4d. Shared / Cross-cutting Changes
- fabric@^6 is a frontend-only dependency (canvas-based, browser only)
- Fabric.js v6 is TypeScript-native — no separate @types package needed

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| CREATE | apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/edit/page.tsx | Editor route page with dynamic import | Med |
| CREATE | apps/web/components/editor/canvas-editor.tsx | Fabric.js canvas wrapper, persistence, auto-save | High |
| CREATE | apps/web/components/editor/toolbar.tsx | Undo/redo/save/export toolbar | Low |
| CREATE | apps/web/components/editor/tool-panel.tsx | Drawing/text/shapes/color/eraser tool sidebar | Med |
| CREATE | apps/web/components/editor/use-canvas-history.ts | Undo/redo history hook (50-state stack) | Med |
| MODIFY | apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx | Add "Edit Design" navigation button | Low |
| MODIFY | apps/api/src/ai/ai.controller.ts (or equivalent) | Ensure PATCH accepts canvasState field | Low |
| MODIFY | apps/web/package.json | Add fabric@^6 dependency | Low |

### 6. Dependency & Reference Check

#### Frontend Wiring
- New npm package: fabric@^6 (add to apps/web/package.json)
- canvas-editor.tsx uses fabric (imported dynamically via next/dynamic wrapper on the page)
- canvas-editor.tsx uses apiClient from lib/api-client.ts for PATCH /api/ai/designs/:id
- toolbar.tsx uses MUI components (already installed)
- tool-panel.tsx uses MUI ToggleButtonGroup, Slider (already installed)
- use-canvas-history.ts is a pure React hook (no external deps)
- Editor page fetches design data via apiClient GET /api/designs/:designId

#### Backend Wiring
- PATCH /api/ai/designs/:id — exists in AI/designs module. Verify canvasState field is accepted.
- Design model has canvasState field (Json?, nullable) in Prisma schema
- No new backend modules needed

#### Image Loading
- Room photo URL: served from /api/media/files/* or R2 — CORS must allow canvas loading (crossOrigin: 'anonymous')
- Visualization URL: same origin/CORS requirement
- If CORS blocks canvas image loading: images taint the canvas and toDataURL/toJSON will fail. Ensure API serves images with Access-Control-Allow-Origin header.

### 7. Implementation Plan

**Step 1:** Add fabric dependency
- File: apps/web/package.json
- Action: modify
- Details: Add fabric@^6 to dependencies. Run pnpm install.

**Step 2:** Verify/update backend PATCH endpoint for canvasState
- File: apps/api/src/ai/ai.controller.ts (or equivalent)
- Action: verify/modify
- Details: Ensure PATCH /api/ai/designs/:id DTO accepts optional canvasState field. Add validation.

**Step 3:** Create undo/redo history hook
- File: apps/web/components/editor/use-canvas-history.ts
- Action: create
- Details: Custom hook with 50-state history stack, undo/redo operations, canUndo/canRedo flags.

**Step 4:** Create tool panel component
- File: apps/web/components/editor/tool-panel.tsx
- Action: create
- Details: Vertical MUI ToggleButtonGroup for tool selection. Color picker, brush width slider, opacity slider.

**Step 5:** Create toolbar component
- File: apps/web/components/editor/toolbar.tsx
- Action: create
- Details: Undo, redo, save, export buttons. Save indicator. Disabled states.

**Step 6:** Create canvas editor component
- File: apps/web/components/editor/canvas-editor.tsx
- Action: create
- Details: Fabric.js canvas initialization, background/overlay image loading, canvasState restore with error handling (P2-E8), tool integration, auto-save every 30s + on blur, event listeners for history tracking.

**Step 7:** Create editor page
- File: apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/edit/page.tsx
- Action: create
- Details: Fetch design data. Dynamic import of CanvasEditor with ssr:false. Loading/error states.

**Step 8:** Add "Edit Design" button to design detail page
- File: apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx
- Action: modify
- Details: Add MUI Button linking to the /edit sub-route.

### 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Fabric.js SSR crash (accesses window/document) | High | P2-DC-3 enforced: next/dynamic with ssr:false. Canvas editor never rendered server-side. |
| Corrupted canvasState crashes loadFromJSON | Med | P2-E8: Wrap in try/catch. On failure, start fresh canvas with background + overlay only. Show warning Snackbar. |
| CORS blocks image loading onto Fabric canvas (tainted canvas) | High | Ensure API serves images with CORS headers. Load images with crossOrigin: 'anonymous'. Verify in dev and production. |
| Auto-save conflicts if user has multiple tabs open | Med | Last-write-wins strategy. canvasState is per-design, single user editing. Future: add optimistic locking with version field. |
| Large canvasState JSON slows save/restore | Med | Monitor JSON size. If exceeding 1MB, warn user. Canvas objects naturally stay small unless many complex drawings. |
| Fabric.js v6 breaking API changes from v5 docs | Low | Use v6 documentation and TypeScript types. v6 is TS-native with better type safety. |
| Canvas resize on window resize causes layout issues | Med | Listen to window resize → canvas.setDimensions(). Debounce resize handler (200ms). |
| Undo/redo stack memory usage with 50 states | Low | Each state is a JSON snapshot. Even complex canvases produce ~50-100KB JSON. 50 states = ~5MB max, acceptable. |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests
- useCanvasHistory: pushState adds to history stack
- useCanvasHistory: undo returns previous state and updates canUndo/canRedo
- useCanvasHistory: redo returns next state
- useCanvasHistory: history capped at 50 states (oldest dropped)
- useCanvasHistory: pushState clears redo stack
- Toolbar renders undo/redo buttons with correct disabled states
- ToolPanel renders all tool options
- ToolPanel color change updates brushColor prop callback
- ToolPanel width slider updates brushWidth prop callback

#### 9b. Integration Tests
- CanvasEditor initializes Fabric canvas and loads background image
- CanvasEditor loads visualization as semi-transparent overlay
- CanvasEditor restores canvasState from JSON on load
- CanvasEditor handles corrupted canvasState gracefully (fresh canvas)
- CanvasEditor auto-saves via PATCH after 30s interval
- CanvasEditor saves on window blur event
- Drawing on canvas adds objects and triggers history push
- Undo removes last drawn object from canvas
- Redo restores removed object
- Export produces downloadable PNG file
- PATCH /api/ai/designs/:id with canvasState updates the design record

#### 9c. E2E UI Automation Tests
- Navigate to design detail → click "Edit Design" → editor page loads
- Editor shows room photo as background
- Select draw tool → draw on canvas → stroke appears
- Select text tool → click canvas → text input appears → type → text rendered
- Click undo → last action reversed
- Click redo → action restored
- Wait 30s → auto-save triggers (verify via network request or save indicator)
- Reload page → previous drawings restored from canvasState
- Click export → PNG file downloads
- Click save → manual save succeeds → "Saved" indicator shown

### 10. Verification Criteria
- [ ] fabric@^6 installed without errors
- [ ] Editor page loads at /projects/:id/rooms/:roomId/designs/:designId/edit
- [ ] Fabric.js loaded via dynamic import (no SSR errors, no window/document errors in server logs)
- [ ] Room photo renders as canvas background
- [ ] Visualization renders as semi-transparent overlay on canvas
- [ ] Free draw tool works: strokes appear on canvas
- [ ] Text tool works: click places editable text on canvas
- [ ] Shape tools work: rectangle, circle, line can be drawn
- [ ] Color picker changes stroke/fill color
- [ ] Brush width slider changes draw width
- [ ] Eraser removes selected objects
- [ ] Undo reverses the last action
- [ ] Redo restores the last undone action
- [ ] History stack capped at 50 states
- [ ] Auto-save triggers every 30 seconds when canvas is dirty
- [ ] Save on window blur triggers correctly
- [ ] Manual save button persists canvasState to backend
- [ ] Reload editor page → canvas state restored from saved JSON
- [ ] Corrupted canvasState → fresh canvas loads with warning (P2-E8)
- [ ] Export as PNG downloads the canvas content
- [ ] "Edit Design" button visible on design detail page
- [ ] No CORS errors when loading images onto canvas
