# SPEC-019 — Fabric.js Design Editor

**Parent Feature:** InteriorScience Phase 3
**Spec Number:** 019 of 022 (Phase 3: 3 of 6)
**Prerequisites:** SPEC-017

## Status: Not Started

### 1. Objective

Rewrite the design editor page and build a full Fabric.js v6 canvas editing experience. Users can annotate AI-generated visualizations with freehand drawing, text labels, and shapes, then save and export their work.

- **Before:** Editor page is a placeholder scaffold. Fabric.js is installed but unused. Design.canvasState field exists but is never read or written. Users cannot annotate or modify visualizations.
- **After:** A fully functional Fabric.js editor loads at the edit route. Room photo renders as background, visualization as semi-transparent overlay. Users draw, type text, place shapes, undo/redo up to 50 states, and auto-save every 30 seconds. Canvas state persists and restores across sessions. Export to PNG is supported.
- **Success criteria:** Editor loads via next/dynamic (ssr:false) with skeleton placeholder (P3-DC-4). All four tool categories (draw, text, shapes, eraser) work. Undo/redo with 50-state history stack. Auto-save every 30s + on blur via PATCH endpoint. Saved state restores on reload (loadFromJSON in try/catch per P3-E8). Canvas constrained to viewport width with pinch-zoom (P3-E3). Export to PNG downloads correctly.

### 2. Architecture

```
Editor Page: /projects/:id/rooms/:roomId/designs/:designId/edit
  └── next/dynamic(() => import('canvas-editor'), { ssr: false })  (P3-DC-4)
      └── Shows <EditorSkeleton /> while loading

canvas-editor.tsx:
  ├── Initialize Fabric.js Canvas (fabric.Canvas)
  │   ├── Load room photo as background image (fabric.Image.fromURL)
  │   └── Load visualization as overlay image (opacity 0.6, locked)
  ├── If Design.canvasState exists:
  │   └── canvas.loadFromJSON(canvasState)  (P3-E8: try/catch, fresh canvas on failure)
  ├── Canvas sizing (P3-E3):
  │   ├── Constrain width to container/viewport width
  │   ├── Pinch-zoom within canvas (fabric gesture handling)
  │   └── Window resize → canvas.setDimensions() debounced 200ms
  ├── Tools (via tool-panel.tsx — bottom panel on mobile):
  │   ├── Freehand draw (PencilBrush, adjustable brush size + color)
  │   ├── Text (IText, click to place, editable, font size + color)
  │   ├── Shapes (Rect, Circle, Arrow/Line — click+drag)
  │   ├── Eraser (remove selected object)
  │   └── Selection/Pointer (default mode)
  ├── Toolbar (via toolbar.tsx — top bar):
  │   ├── Undo (pop from history stack)
  │   ├── Redo (pop from redo stack)
  │   ├── Save (manual save → PATCH + Snackbar)
  │   └── Export as PNG (canvas.toDataURL → download)
  └── Persistence:
      ├── Auto-save: setInterval 30s → canvas.toJSON() → PATCH /api/ai/designs/:designId { canvasState }
      ├── On blur: window blur event → save if dirty
      └── On manual save: toolbar Save button → save + Snackbar confirmation

History Stack (use-canvas-history.ts):
  ├── Max 50 states (drop oldest when exceeded)
  ├── On canvas change (object:added, object:modified, object:removed):
  │   └── Push canvas.toJSON() to history, clear redo stack
  ├── Undo: pop history → push current to redo → canvas.loadFromJSON(previous)
  └── Redo: pop redo → push current to history → canvas.loadFromJSON(next)
```

### 3. Design Constraints

- P3-DC-4: Fabric.js MUST be loaded via next/dynamic with ssr:false. Editor page shows a skeleton while Fabric.js loads. Fabric.js accesses DOM/canvas APIs not available during SSR.
- P3-DC-3: All mutation actions (save) MUST show Snackbar confirmation of success or failure.
- P3-DC-8: All Phase 1 and Phase 2 constraints remain in effect.
- P3-E3: Canvas constrained to viewport width. Pinch-zoom within canvas. Scroll for tall canvases on mobile.
- P3-E8: Wrap canvas.loadFromJSON() in try/catch. If saved canvasState is corrupted or incompatible, catch the error, log it, start fresh canvas (background + overlay only), and show Snackbar: "Could not restore previous edits. Starting fresh."

### 4. Detailed Design

#### 4a. Database / Schema Changes
- None — Design.canvasState (Json?, nullable) already exists in the Prisma schema from Phase 2.

#### 4b. Backend / API Changes

**File: `apps/api/src/ai/ai.controller.ts`** (MODIFY)
- Add a new PATCH endpoint: `PATCH /api/ai/designs/:designId` that accepts `canvasState` field in the request body.
- This endpoint does NOT currently exist — the AI controller only has GET, DELETE, and POST (regenerate) for designs. A new PATCH handler must be created.
- Validate canvasState is a valid JSON object (not array, not primitive). Reject if > 2MB to prevent abuse.
- Ensure only design owner or project EDITOR can update canvasState (existing auth guard covers this).

**File: `apps/api/src/ai/dto/update-design.dto.ts`** (CREATE — directory `apps/api/src/ai/dto/` does not exist yet and must also be created)
- Add: `canvasState?: Record<string, unknown>` — optional, validated as object.

#### 4c. Frontend / UI Changes

**File: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/edit/page.tsx`** (REWRITE)
- Rewrite existing editor page entirely.
- Fetch design data: GET /api/ai/designs/:designId (need room photo URL + visualization URL + canvasState).
- Render dynamic-imported CanvasEditor with props: roomPhotoUrl, visualizationUrl, canvasState, designId.
- Loading state: full-page skeleton with "Loading editor..." message (P3-DC-4).
- Error state: if design not found or fetch fails, show error message with back link.

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
- Main editor component wrapping the Fabric.js canvas.

Initialization sequence:
1. Create fabric.Canvas on a `<canvas>` element ref
2. Set canvas size to container dimensions — constrain to viewport width (P3-E3)
3. Load room photo as background: fabric.Image.fromURL(roomPhotoUrl) -> canvas.setBackgroundImage()
4. Load visualization as overlay: fabric.Image.fromURL(visualizationUrl) -> add as image object with opacity 0.6, locked (selectable:false, evented:false)
5. If canvasState exists: try canvas.loadFromJSON(canvasState) -> catch error -> log + Snackbar warning (P3-E8)

Canvas event listeners:
- 'object:added', 'object:modified', 'object:removed' -> push state to history stack
- Window 'blur' -> trigger auto-save if dirty
- Window 'beforeunload' -> trigger save if dirty

Auto-save:
- setInterval(30000) -> if dirty flag set -> canvas.toJSON() -> PATCH /api/ai/designs/:designId { canvasState }
- Set dirty=false after successful save
- Show subtle save indicator ("Saved" text that fades)

Cleanup: on unmount -> dispose canvas, clear intervals, remove event listeners

Layout: Toolbar (top) + Canvas (center, scrollable) + ToolPanel (bottom on mobile, left sidebar on desktop)

**File: `apps/web/components/editor/toolbar.tsx`** (CREATE)
- Props: onUndo, onRedo, onSave, onExport, canUndo: boolean, canRedo: boolean, isSaving: boolean
- MUI AppBar or Paper at top of editor.
- Buttons:
  - Undo (UndoIcon) — disabled when history empty
  - Redo (RedoIcon) — disabled when redo stack empty
  - Divider
  - Save (SaveIcon) — shows CircularProgress when saving
  - Export as PNG (DownloadIcon) — canvas.toDataURL('png') -> trigger browser download
- Save indicator: "Last saved: Xs ago" or "Unsaved changes"

**File: `apps/web/components/editor/tool-panel.tsx`** (CREATE)
- Props: activeTool, onToolChange, brushColor, onColorChange, brushSize, onBrushSizeChange, fontSize, onFontSizeChange
- Bottom panel on mobile (horizontal scrollable), left sidebar on desktop.
- Tool groups:
  - Freehand draw (PencilBrush) — canvas.isDrawingMode = true, set brush color/width
  - Text (IText) — click to place, editable. Font size control + color.
  - Shapes:
    - Rectangle (Rect) — click+drag
    - Circle — click+drag
    - Arrow/Line — click+drag to create fabric.Line with arrowhead
  - Eraser — click selected object -> canvas.remove(activeObject)
  - Selection/Pointer (default) — canvas.isDrawingMode = false
- Color picker: 8 preset swatches + custom input
- Brush size slider: MUI Slider (1-20px)

**File: `apps/web/components/editor/use-canvas-history.ts`** (CREATE)
- Custom React hook for undo/redo history management.
- State: historyStack (JSON states array, max 50), redoStack.
- pushState(canvasJson): push to history, trim if > 50 (drop oldest), clear redo stack.
- undo(): pop history -> return previous state, push current to redo. Returns null if empty.
- redo(): pop redo -> return next state, push current to history. Returns null if empty.
- canUndo: historyStack.length > 0
- canRedo: redoStack.length > 0

**File: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx`** (MODIFY)
- Add "Edit Design" button that navigates to the /edit sub-route.

#### 4d. Shared / Cross-cutting Changes
- fabric@^6 already installed in apps/web/package.json (Phase 2 dependency — verify present).
- Fabric.js v6 is TypeScript-native — no separate @types package needed.
- Cross-origin image loading: load images with crossOrigin: 'anonymous' to avoid tainted canvas. Ensure API serves images with Access-Control-Allow-Origin header.

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| REWRITE | apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/edit/page.tsx | Complete rewrite: dynamic import of CanvasEditor, fetch design, skeleton loading | Med |
| CREATE | apps/web/components/editor/canvas-editor.tsx | Fabric.js canvas wrapper, background/overlay loading, persistence, auto-save | High |
| CREATE | apps/web/components/editor/toolbar.tsx | Undo/redo/save/export toolbar with disabled states | Low |
| CREATE | apps/web/components/editor/tool-panel.tsx | Bottom panel (mobile) with draw/text/shapes/eraser tools, color picker, brush size | Med |
| CREATE | apps/web/components/editor/use-canvas-history.ts | Undo/redo history hook (50-state stack) | Med |
| MODIFY | apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx | Add "Edit Design" navigation button | Low |
| MODIFY | apps/api/src/ai/ai.controller.ts | Add new PATCH endpoint for canvasState (does not exist yet) | Med |
| CREATE | apps/api/src/ai/dto/update-design.dto.ts | Create DTO directory and file with optional canvasState field | Low |

### 6. Dependency & Reference Check

#### Frontend Wiring
- fabric@^6 — already in apps/web/package.json (installed Phase 2). Verify present; if missing, add.
- canvas-editor.tsx imports fabric — loaded dynamically via next/dynamic wrapper on the page level.
- canvas-editor.tsx uses apiClient from lib/api-client.ts for PATCH /api/ai/designs/:designId.
- toolbar.tsx uses MUI components: IconButton, Paper, CircularProgress (already installed).
- tool-panel.tsx uses MUI ToggleButtonGroup, Slider (already installed).
- use-canvas-history.ts is a pure React hook — no external deps.
- Editor page fetches design via apiClient GET /api/ai/designs/:designId.

#### Backend Wiring
- PATCH /api/ai/designs/:designId — does NOT exist yet in the AI module. Must be created as part of this spec (see section 4b). The AI controller currently only exposes GET, DELETE, and POST (regenerate) for designs.
- Design model has canvasState field (Json?, nullable) in Prisma schema.
- No new backend modules needed.

#### Image Loading
- Room photo URL: served from /api/media/files/* or local uploads/. CORS must allow canvas loading.
- Visualization URL: same origin/CORS requirement.
- If CORS blocks loading: images taint the canvas and toDataURL/toJSON fail. Ensure API serves images with Access-Control-Allow-Origin header. Load with crossOrigin: 'anonymous'.

### 7. Implementation Plan

**Step 1:** Verify fabric dependency
- File: apps/web/package.json
- Action: verify (modify if missing)
- Details: Confirm fabric@^6 is in dependencies. Run pnpm install if added.

**Step 2:** Verify/update backend PATCH endpoint for canvasState
- File: apps/api/src/ai/ai.controller.ts, apps/api/src/ai/dto/update-design.dto.ts
- Action: verify/modify
- Details: Ensure PATCH /api/ai/designs/:designId DTO accepts optional canvasState field (Record<string, unknown>). Add size validation (reject > 2MB).

**Step 3:** Create undo/redo history hook
- File: apps/web/components/editor/use-canvas-history.ts
- Action: create
- Details: Custom hook with 50-state history stack, undo/redo operations, canUndo/canRedo flags.

**Step 4:** Create tool panel component
- File: apps/web/components/editor/tool-panel.tsx
- Action: create
- Details: Bottom panel on mobile (horizontal scroll), sidebar on desktop. Freehand draw, text, shapes (rect, circle, arrow/line), eraser. Color picker (8 presets + custom), brush size slider, font size control.

**Step 5:** Create toolbar component
- File: apps/web/components/editor/toolbar.tsx
- Action: create
- Details: Undo, redo, save, export buttons. Save indicator showing last-saved time. Disabled states for undo/redo.

**Step 6:** Create canvas editor component
- File: apps/web/components/editor/canvas-editor.tsx
- Action: create
- Details: Fabric.js canvas initialization. Background image (room photo) + overlay (visualization at 0.6 opacity, locked). canvasState restore with try/catch (P3-E8). Tool integration from tool-panel. Auto-save every 30s + on blur. Canvas constrained to viewport width with pinch-zoom (P3-E3). History tracking via use-canvas-history hook. Window resize handling (debounced 200ms).

**Step 7:** Rewrite editor page
- File: apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/edit/page.tsx
- Action: rewrite
- Details: Fetch design data. Dynamic import of CanvasEditor with ssr:false (P3-DC-4). EditorSkeleton while loading. Error state with back link.

**Step 8:** Add "Edit Design" button to design detail page
- File: apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx
- Action: modify
- Details: Add MUI Button linking to the /edit sub-route. Use EditIcon + "Edit Design" label.

### 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Fabric.js SSR crash (accesses window/document) | High | P3-DC-4 enforced: next/dynamic with ssr:false. Canvas editor never rendered server-side. |
| Corrupted canvasState crashes loadFromJSON | Med | P3-E8: Wrap in try/catch. On failure, start fresh canvas with background + overlay only. Show Snackbar warning. |
| CORS blocks image loading onto Fabric canvas (tainted canvas) | High | Ensure API serves images with CORS headers. Load images with crossOrigin: 'anonymous'. Test in dev and production. |
| Auto-save conflicts if user has multiple tabs open | Med | Last-write-wins strategy. canvasState is per-design, single user editing. Acceptable for MVP. |
| Large canvasState JSON slows save/restore | Med | Reject canvasState > 2MB on backend. Monitor JSON size. Each canvas state is typically 50-100KB. |
| Canvas resize on window resize causes layout issues | Med | Debounce resize handler (200ms). Recalculate dimensions from container. |
| Undo/redo stack memory usage with 50 states | Low | Each state ~50-100KB JSON. 50 states = ~5MB max. Acceptable for browser. |
| Fabric.js v6 + React 19 incompatibility | Med | Dynamic import isolates failures. Pin to specific patch version if issues arise. Test thoroughly. |
| Pinch-zoom conflicts with browser zoom on mobile | Med | Prevent default touch events on canvas element. Use Fabric.js built-in gesture handling. |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests
- useCanvasHistory: pushState adds to history stack
- useCanvasHistory: undo returns previous state and updates canUndo/canRedo
- useCanvasHistory: redo returns next state
- useCanvasHistory: history capped at 50 states (oldest dropped)
- useCanvasHistory: pushState clears redo stack
- useCanvasHistory: undo on empty stack returns null
- useCanvasHistory: redo on empty stack returns null
- Toolbar renders undo/redo buttons with correct disabled states
- Toolbar save button shows loading spinner when isSaving=true
- ToolPanel renders all tool options (draw, text, rect, circle, line, eraser)
- ToolPanel color change fires onColorChange callback
- ToolPanel brush size slider fires onBrushSizeChange callback

#### 9b. Integration Tests
- CanvasEditor initializes Fabric canvas and loads background image
- CanvasEditor loads visualization as semi-transparent overlay (opacity 0.6)
- CanvasEditor restores canvasState from JSON on load
- CanvasEditor handles corrupted canvasState gracefully (fresh canvas, Snackbar warning)
- CanvasEditor auto-saves via PATCH after 30s interval when dirty
- CanvasEditor saves on window blur event when dirty
- Drawing on canvas adds objects and triggers history push
- Undo removes last drawn object from canvas
- Redo restores removed object
- Export produces downloadable PNG blob
- PATCH /api/ai/designs/:designId with canvasState updates the design record
- PATCH /api/ai/designs/:designId rejects canvasState > 2MB

#### 9c. E2E UI Automation Tests
- Navigate to design detail -> click "Edit Design" -> editor page loads with skeleton then canvas
- Editor shows room photo as background
- Select draw tool -> draw on canvas -> stroke appears
- Select text tool -> click canvas -> text input appears -> type text -> text rendered on canvas
- Select rectangle tool -> drag on canvas -> rectangle appears
- Click undo -> last action reversed
- Click redo -> action restored
- Wait 30s -> auto-save triggers (verify save indicator updates)
- Reload page -> previous drawings restored from canvasState
- Click export -> PNG file downloads
- Click save -> manual save succeeds -> "Saved" indicator shown
- On mobile viewport: tool panel renders at bottom as horizontal scrollable bar

### 10. Verification Criteria
- [ ] Editor page loads at /projects/:id/rooms/:roomId/designs/:designId/edit
- [ ] Fabric.js loaded via dynamic import — no SSR errors in server logs
- [ ] Skeleton shown while Fabric.js bundle loads (P3-DC-4)
- [ ] Room photo renders as canvas background
- [ ] Visualization renders as semi-transparent overlay on canvas
- [ ] Freehand draw tool works: strokes appear with chosen color and size
- [ ] Text tool works: click places editable text on canvas with font size control
- [ ] Shape tools work: rectangle, circle, arrow/line can be drawn via click+drag
- [ ] Eraser removes selected objects from canvas
- [ ] Undo reverses the last action
- [ ] Redo restores the last undone action
- [ ] History stack capped at 50 states (verify oldest dropped)
- [ ] Auto-save triggers every 30 seconds when canvas is dirty
- [ ] Save on window blur triggers correctly
- [ ] Manual save button persists canvasState to backend + shows Snackbar (P3-DC-3)
- [ ] Reload editor page -> canvas state restored from saved JSON
- [ ] Corrupted canvasState -> fresh canvas loads with warning Snackbar (P3-E8)
- [ ] Canvas constrained to viewport width on mobile (P3-E3)
- [ ] Pinch-zoom works within canvas on touch devices
- [ ] Export as PNG downloads the canvas content
- [ ] "Edit Design" button visible on design detail page and navigates correctly
- [ ] No CORS errors when loading images onto canvas
- [ ] Tool panel renders as bottom panel on mobile, sidebar on desktop
