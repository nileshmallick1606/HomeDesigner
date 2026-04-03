# SPEC-028 — Snackbar Wiring

**Parent Feature:** Export UI + Snackbar Wiring, Spec 028 of 028 (2 of 2)
**Spec Number:** 028
**Prerequisites:** None (independent of SPEC-027)
**BRD Features:** ES-F3 (snackbar for all mutations)

## Status: Not Started

### 1. Objective

Wire notistack's `useSnackbar()` hook into every mutation action across the application to provide consistent success and error toast notifications. The infrastructure is already in place (notistack installed, `AppSnackbarProvider` wraps the root layout, max 3 stacked configured) but `useSnackbar()` is not imported or called in any component. This spec adds snackbar calls to 12+ files covering 18+ distinct user actions.

- **Before:** Most mutations have zero user feedback — actions succeed or fail silently. The profile page uses an inline `<Alert>` for name save confirmation. Users have no way to know if their action worked without manually checking results (e.g., navigating away and back to see if a room was created).
- **After:** Every create, update, and delete action shows a green success snackbar (auto-dismiss after 4 seconds) or a red error snackbar (persists until manually dismissed). The profile page's inline Alert is replaced with a snackbar for consistency. Users get immediate, consistent visual feedback for all actions.
- **Success criteria:** (1) All 18+ mutation actions listed in the BRD show appropriate snackbars. (2) Success snackbars auto-dismiss after 4 seconds. (3) Error snackbars persist until dismissed. (4) Max 3 snackbars stacked at once. (5) Profile page inline Alert replaced with snackbar. (6) No functional regressions — all existing mutation logic unchanged.

### 2. Architecture

```
apps/web/
├── app/(main)/
│   ├── projects/
│   │   ├── new/
│   │   │   └── page.tsx                                          (MODIFY — create project snackbar)
│   │   └── [id]/
│   │       ├── page.tsx                                          (MODIFY — export PDF snackbar)
│   │       └── rooms/
│   │           ├── new/
│   │           │   └── page.tsx                                  (MODIFY — add room snackbar)
│   │           └── [roomId]/
│   │               ├── page.tsx                                  (MODIFY — generate viz, detect, budget snackbars)
│   │               └── designs/
│   │                   └── [designId]/
│   │                       └── page.tsx                          (MODIFY — regenerate, delete, download snackbars)
│   ├── profile/
│   │   └── page.tsx                                              (MODIFY — save name, delete account snackbars)
│   └── library/
│       └── page.tsx                                              (MODIFY — apply template snackbar)
├── components/
│   ├── media/
│   │   ├── photo-upload.tsx                                      (MODIFY — upload photo snackbar)
│   │   └── photo-gallery.tsx                                     (MODIFY — delete photo snackbar)
│   ├── budget/
│   │   └── budget-editor.tsx                                     (MODIFY — add/delete budget item snackbars)
│   ├── sharing/
│   │   └── share-dialog.tsx                                      (MODIFY — create/revoke link snackbars)
│   ├── comments/
│   │   └── comments-panel.tsx                                    (MODIFY — post comment snackbar)
│   └── editor/
│       └── canvas-editor.tsx                                     (MODIFY — save design, export PNG snackbars)
```

**Pattern applied to every file:**

```
1. import { useSnackbar } from 'notistack';
2. const { enqueueSnackbar } = useSnackbar();      // inside component body
3. In existing try/catch blocks:
   - After successful await: enqueueSnackbar('Success msg', { variant: 'success' });
   - In catch block:         enqueueSnackbar(err.message || 'Something went wrong', { variant: 'error' });
```

No new components created. No business logic changed. Each modification is 3-5 lines (import, hook call, enqueueSnackbar calls).

### 3. Design Constraints

| ID | Constraint | Implementation |
|----|-----------|----------------|
| ES-DC-3 | Snackbars auto-dismiss after 4 seconds for success, persist until dismissed for errors. | Success: `enqueueSnackbar(msg, { variant: 'success', autoHideDuration: 4000 })`. Error: `enqueueSnackbar(msg, { variant: 'error', persist: true })`. The `autoHideDuration` for success is 4000ms. Error snackbars use `persist: true` so users can read the full error message and dismiss manually. |
| ES-DC-4 | Max 3 snackbars stacked at once. | Already configured in `AppSnackbarProvider` via `maxSnack={3}`. No changes needed. When a 4th snackbar fires, notistack auto-dismisses the oldest. |

### 4. Detailed Design

#### 4a. Database / Schema Changes

None. This spec is purely frontend UI — no data model or API changes.

#### 4b. Backend / API Changes

None. All snackbar wiring is client-side. Existing API responses already return error messages in response bodies that can be displayed in error snackbars.

#### 4c. Frontend / UI Changes

Each file below follows the same pattern. The exact success/error messages and the location within the component are specified.

---

**File 1: `apps/web/app/(main)/projects/new/page.tsx`** (MODIFY)

Action: Create project

```typescript
import { useSnackbar } from 'notistack';
// Inside component:
const { enqueueSnackbar } = useSnackbar();

// In the create project handler, after successful API call:
enqueueSnackbar('Project created!', { variant: 'success', autoHideDuration: 4000 });

// In catch block:
enqueueSnackbar(err.message || 'Failed to create project', { variant: 'error', persist: true });
```

---

**File 2: `apps/web/app/(main)/projects/[id]/rooms/new/page.tsx`** (MODIFY)

Action: Add room

```typescript
import { useSnackbar } from 'notistack';
const { enqueueSnackbar } = useSnackbar();

// Success:
enqueueSnackbar('Room added!', { variant: 'success', autoHideDuration: 4000 });

// Error:
enqueueSnackbar(err.message || 'Failed to add room', { variant: 'error', persist: true });
```

---

**File 3: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx`** (MODIFY)

Actions: Generate visualization, Detect elements, Budget actions (add/delete handled in budget-editor component, but if inline budget actions exist here they get snackbars too)

```typescript
import { useSnackbar } from 'notistack';
const { enqueueSnackbar } = useSnackbar();

// Generate visualization success:
enqueueSnackbar('Visualization started!', { variant: 'success', autoHideDuration: 4000 });

// Generate visualization error:
enqueueSnackbar(err.message || 'Failed to start visualization', { variant: 'error', persist: true });

// Detect elements success:
enqueueSnackbar('Detection started!', { variant: 'success', autoHideDuration: 4000 });

// Detect elements error:
enqueueSnackbar(err.message || 'Detection failed', { variant: 'error', persist: true });
```

---

**File 4: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx`** (MODIFY)

Actions: Regenerate design, Delete design, Download image, Download comparison

```typescript
import { useSnackbar } from 'notistack';
const { enqueueSnackbar } = useSnackbar();

// Regenerate success:
enqueueSnackbar('Regenerating...', { variant: 'success', autoHideDuration: 4000 });

// Regenerate error:
enqueueSnackbar(err.message || 'Regeneration failed', { variant: 'error', persist: true });

// Delete design success:
enqueueSnackbar('Design deleted', { variant: 'success', autoHideDuration: 4000 });

// Delete design error:
enqueueSnackbar(err.message || 'Failed to delete design', { variant: 'error', persist: true });

// Download image success (after downloadBlob completes):
enqueueSnackbar('Downloaded!', { variant: 'success', autoHideDuration: 4000 });

// Download image error:
enqueueSnackbar(err.message || 'Download failed', { variant: 'error', persist: true });

// Download comparison success:
enqueueSnackbar('Downloaded!', { variant: 'success', autoHideDuration: 4000 });

// Download comparison error:
enqueueSnackbar(err.message || 'Download failed', { variant: 'error', persist: true });
```

---

**File 5: `apps/web/app/(main)/profile/page.tsx`** (MODIFY)

Actions: Save name, Delete account

Special note: This file currently uses an inline `<Alert>` component to show "Name updated" confirmation. That Alert and its associated state (`showSuccess`, `setShowSuccess`, etc.) should be **removed** and replaced with the snackbar call.

```typescript
import { useSnackbar } from 'notistack';
const { enqueueSnackbar } = useSnackbar();

// Save name success (REPLACES inline Alert):
enqueueSnackbar('Name updated!', { variant: 'success', autoHideDuration: 4000 });
// Remove: const [showSuccess, setShowSuccess] = useState(false);
// Remove: {showSuccess && <Alert severity="success">...</Alert>}

// Save name error:
enqueueSnackbar(err.message || 'Failed to update name', { variant: 'error', persist: true });

// Delete account success:
enqueueSnackbar('Account deleted', { variant: 'success', autoHideDuration: 4000 });

// Delete account error:
enqueueSnackbar(err.message || 'Failed to delete account', { variant: 'error', persist: true });
```

---

**File 6: `apps/web/app/(main)/library/page.tsx`** (MODIFY)

Action: Apply template

```typescript
import { useSnackbar } from 'notistack';
const { enqueueSnackbar } = useSnackbar();

// Apply template success:
enqueueSnackbar('Template applied!', { variant: 'success', autoHideDuration: 4000 });

// Apply template error:
enqueueSnackbar(err.message || 'Failed to apply template', { variant: 'error', persist: true });
```

---

**File 7: `apps/web/components/media/photo-upload.tsx`** (MODIFY)

Action: Upload photo

```typescript
import { useSnackbar } from 'notistack';
const { enqueueSnackbar } = useSnackbar();

// Upload success:
enqueueSnackbar('Photo uploaded!', { variant: 'success', autoHideDuration: 4000 });

// Upload error:
enqueueSnackbar(err.message || 'Upload failed', { variant: 'error', persist: true });
```

---

**File 8: `apps/web/components/media/photo-gallery.tsx`** (MODIFY)

Action: Delete photo

```typescript
import { useSnackbar } from 'notistack';
const { enqueueSnackbar } = useSnackbar();

// Delete photo success:
enqueueSnackbar('Photo deleted', { variant: 'success', autoHideDuration: 4000 });

// Delete photo error:
enqueueSnackbar(err.message || 'Failed to delete photo', { variant: 'error', persist: true });
```

---

**File 9: `apps/web/components/budget/budget-editor.tsx`** (MODIFY)

Actions: Add budget item, Delete budget item

```typescript
import { useSnackbar } from 'notistack';
const { enqueueSnackbar } = useSnackbar();

// Add budget item success:
enqueueSnackbar('Budget item added', { variant: 'success', autoHideDuration: 4000 });

// Add budget item error:
enqueueSnackbar(err.message || 'Failed to add budget item', { variant: 'error', persist: true });

// Delete budget item success:
enqueueSnackbar('Budget item removed', { variant: 'success', autoHideDuration: 4000 });

// Delete budget item error:
enqueueSnackbar(err.message || 'Failed to remove budget item', { variant: 'error', persist: true });
```

---

**File 10: `apps/web/components/sharing/share-dialog.tsx`** (MODIFY)

Actions: Create share link, Revoke share link

```typescript
import { useSnackbar } from 'notistack';
const { enqueueSnackbar } = useSnackbar();

// Create link success:
enqueueSnackbar('Share link created!', { variant: 'success', autoHideDuration: 4000 });

// Create link error:
enqueueSnackbar(err.message || 'Failed to create share link', { variant: 'error', persist: true });

// Revoke link success:
enqueueSnackbar('Link revoked', { variant: 'success', autoHideDuration: 4000 });

// Revoke link error:
enqueueSnackbar(err.message || 'Failed to revoke link', { variant: 'error', persist: true });
```

---

**File 11: `apps/web/components/comments/comments-panel.tsx`** (MODIFY)

Action: Post comment

```typescript
import { useSnackbar } from 'notistack';
const { enqueueSnackbar } = useSnackbar();

// Post comment success:
enqueueSnackbar('Comment posted', { variant: 'success', autoHideDuration: 4000 });

// Post comment error:
enqueueSnackbar(err.message || 'Failed to post comment', { variant: 'error', persist: true });
```

---

**File 12: `apps/web/components/editor/canvas-editor.tsx`** (MODIFY)

Actions: Save design, Export PNG

```typescript
import { useSnackbar } from 'notistack';
const { enqueueSnackbar } = useSnackbar();

// Save design success:
enqueueSnackbar('Design saved', { variant: 'success', autoHideDuration: 4000 });

// Save design error:
enqueueSnackbar(err.message || 'Failed to save design', { variant: 'error', persist: true });

// Export PNG success:
enqueueSnackbar('PNG exported', { variant: 'success', autoHideDuration: 4000 });

// Export PNG error:
enqueueSnackbar(err.message || 'Export failed', { variant: 'error', persist: true });
```

#### 4d. Shared / Cross-cutting Changes

**Snackbar option consistency:** All success calls use `{ variant: 'success', autoHideDuration: 4000 }` and all error calls use `{ variant: 'error', persist: true }`. To avoid repetition and ensure consistency, implementors may optionally create a thin helper:

```typescript
// Optional helper (not required — can inline the options):
const showSuccess = (msg: string) => enqueueSnackbar(msg, { variant: 'success', autoHideDuration: 4000 });
const showError = (msg: string) => enqueueSnackbar(msg, { variant: 'error', persist: true });
```

This is optional syntactic sugar — the spec is satisfied either way.

**Error message extraction:** All catch blocks use `err.message || 'Fallback message'`. Since API errors from `api-client.ts` typically throw errors with a `.message` field containing the server response, this will display meaningful error text (e.g., "Project not found", "Unauthorized") rather than generic messages.

**Profile page Alert removal:** The profile page currently has a `showSuccess` state variable and a `<Alert severity="success">Name updated</Alert>` conditional render. Both the state variable and the Alert JSX should be removed. The `useState` import can remain if other state variables use it. The `Alert` import can be removed if no other usage exists in the file.

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| MODIFY | apps/web/app/(main)/projects/new/page.tsx | Add useSnackbar import + hook + 2 enqueueSnackbar calls (create project success/error) | Low |
| MODIFY | apps/web/app/(main)/projects/[id]/rooms/new/page.tsx | Add useSnackbar import + hook + 2 enqueueSnackbar calls (add room success/error) | Low |
| MODIFY | apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx | Add useSnackbar import + hook + 4+ enqueueSnackbar calls (generate viz, detect elements success/error) | Low |
| MODIFY | apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx | Add useSnackbar import + hook + 8 enqueueSnackbar calls (regenerate, delete, 2x download success/error) | Low |
| MODIFY | apps/web/app/(main)/profile/page.tsx | Add useSnackbar import + hook + 4 enqueueSnackbar calls, REMOVE inline Alert + showSuccess state | Med |
| MODIFY | apps/web/app/(main)/library/page.tsx | Add useSnackbar import + hook + 2 enqueueSnackbar calls (apply template success/error) | Low |
| MODIFY | apps/web/components/media/photo-upload.tsx | Add useSnackbar import + hook + 2 enqueueSnackbar calls (upload success/error) | Low |
| MODIFY | apps/web/components/media/photo-gallery.tsx | Add useSnackbar import + hook + 2 enqueueSnackbar calls (delete photo success/error) | Low |
| MODIFY | apps/web/components/budget/budget-editor.tsx | Add useSnackbar import + hook + 4 enqueueSnackbar calls (add/delete budget item success/error) | Low |
| MODIFY | apps/web/components/sharing/share-dialog.tsx | Add useSnackbar import + hook + 4 enqueueSnackbar calls (create/revoke link success/error) | Low |
| MODIFY | apps/web/components/comments/comments-panel.tsx | Add useSnackbar import + hook + 2 enqueueSnackbar calls (post comment success/error) | Low |
| MODIFY | apps/web/components/editor/canvas-editor.tsx | Add useSnackbar import + hook + 4 enqueueSnackbar calls (save/export success/error) | Low |

### 6. Dependency & Reference Check

#### External Dependencies

| Dependency | Status | Used By |
|-----------|--------|---------|
| notistack | Already installed in apps/web/package.json | All 12 modified files — `import { useSnackbar } from 'notistack'` |

No new npm packages needed. notistack is already installed and `AppSnackbarProvider` already wraps the root layout.

#### Internal Dependencies
- `useSnackbar()` requires the component to be rendered within a `SnackbarProvider`. Verified: `AppSnackbarProvider` wraps the root layout, so all components under `app/(main)/` have access.
- All 12 files already exist and contain the mutation logic (try/catch blocks) where snackbar calls will be inserted.
- The `enqueueSnackbar` function is called inside existing try/catch handlers — no new async flows or state management needed.

#### Backward Compatibility
- Adding `enqueueSnackbar` calls inside existing try/catch blocks does not change the mutation logic, error handling, or navigation behavior.
- The profile page Alert removal changes the visual feedback mechanism but the user-facing behavior is equivalent (toast notification instead of inline alert).
- If any of the 12 files have been reorganized or renamed since the BRD was written, the implementor should locate the equivalent mutation handler and apply the same pattern.

### 7. Implementation Plan

**Step 1:** Wire snackbars to page-level components (6 files)
- Files: projects/new/page.tsx, rooms/new/page.tsx, rooms/[roomId]/page.tsx, designs/[designId]/page.tsx, profile/page.tsx, library/page.tsx
- Action: For each file — add `import { useSnackbar } from 'notistack'`, add `const { enqueueSnackbar } = useSnackbar()` in component body, add success/error snackbar calls in each try/catch block
- Special: profile/page.tsx — also remove inline Alert and showSuccess state

**Step 2:** Wire snackbars to shared components (6 files)
- Files: photo-upload.tsx, photo-gallery.tsx, budget-editor.tsx, share-dialog.tsx, comments-panel.tsx, canvas-editor.tsx
- Action: Same pattern — import, hook, enqueueSnackbar in try/catch blocks

**Step 3:** Verify all snackbars fire correctly
- Navigate to each page/component, trigger each mutation action
- Verify success toast appears (green, auto-dismisses after ~4 seconds)
- Force an error (e.g., disconnect network) and verify error toast appears (red, persists)
- Verify max 3 stacked by triggering rapid successive actions
- Verify profile page no longer shows inline Alert

### 8. Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|-----------|
| useSnackbar() called outside SnackbarProvider context | High | Very Low | AppSnackbarProvider already wraps root layout. All modified files render within this tree. Verified via SPEC-INDEX and TRD. If somehow a component renders outside provider, notistack throws a clear error during development. |
| Profile page Alert removal breaks layout | Low | Low | Alert is a standalone block element. Removing it simplifies the JSX. Verify visually after removal. |
| Error snackbars persist too long, annoying users | Low | Low | Users can click the dismiss button on persistent error snackbars. This is standard UX for error notifications — users need time to read error details. |
| Rapid mutations fire many snackbars, feels spammy | Low | Med | maxSnack=3 already configured — oldest auto-dismissed. 4-second auto-hide for success means transient feedback. Acceptable UX tradeoff. |
| `err.message` is undefined for some error types | Low | Med | All catch blocks use `err.message \|\| 'Fallback message'` pattern. TypeScript `any` type on err means .message access is safe. Fallback message always provided. |
| Some files may have been refactored since BRD was written | Low | Low | Implementor should verify each file exists and locate the mutation handler. Pattern is the same regardless of file structure changes. |
| Snackbar import increases bundle size | Very Low | N/A | notistack is already in the bundle (AppSnackbarProvider imports it). Adding `useSnackbar` to individual components adds negligible code — it is a re-export from the same package. No tree-shaking impact. |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests

**Per-component snackbar wiring (for each of the 12 files):**
- Render component with mocked SnackbarProvider
- Trigger the mutation action (e.g., click "Create Project" button)
- Mock API call to succeed → verify `enqueueSnackbar` called with correct success message and `{ variant: 'success' }`
- Mock API call to throw error → verify `enqueueSnackbar` called with error message and `{ variant: 'error' }`

**Specific test cases:**
- projects/new/page.tsx: submit form → "Project created!" success snackbar
- rooms/new/page.tsx: submit form → "Room added!" success snackbar
- rooms/[roomId]/page.tsx: click generate → "Visualization started!" success snackbar
- rooms/[roomId]/page.tsx: click detect → "Detection started!" success snackbar
- designs/[designId]/page.tsx: click regenerate → "Regenerating..." success snackbar
- designs/[designId]/page.tsx: click delete → "Design deleted" success snackbar
- designs/[designId]/page.tsx: click download image → "Downloaded!" success snackbar
- designs/[designId]/page.tsx: click download comparison → "Downloaded!" success snackbar
- profile/page.tsx: save name → "Name updated!" success snackbar, no inline Alert rendered
- profile/page.tsx: delete account → "Account deleted" success snackbar
- library/page.tsx: apply template → "Template applied!" success snackbar
- photo-upload.tsx: upload → "Photo uploaded!" success snackbar
- photo-gallery.tsx: delete → "Photo deleted" success snackbar
- budget-editor.tsx: add item → "Budget item added" success snackbar
- budget-editor.tsx: delete item → "Budget item removed" success snackbar
- share-dialog.tsx: create link → "Share link created!" success snackbar
- share-dialog.tsx: revoke → "Link revoked" success snackbar
- comments-panel.tsx: post → "Comment posted" success snackbar
- canvas-editor.tsx: save → "Design saved" success snackbar
- canvas-editor.tsx: export PNG → "PNG exported" success snackbar

#### 9b. Integration Tests

- Success snackbar auto-dismisses: render component, trigger success, verify snackbar visible, wait 4500ms, verify snackbar removed from DOM
- Error snackbar persists: render component, trigger error, wait 5000ms, verify snackbar still visible
- Multiple snackbars stack: trigger 3 rapid mutations → verify 3 snackbars visible simultaneously
- 4th snackbar evicts oldest: trigger 4 rapid mutations → verify only 3 visible, first one dismissed
- Profile page: verify `<Alert>` component no longer rendered after name save (replaced by snackbar)
- Profile page: verify `showSuccess` state removed (no Alert conditional rendering)

#### 9c. E2E / UI Tests

- Create project flow: fill form → submit → green snackbar "Project created!" appears bottom-left → auto-dismisses after ~4s → navigate confirms project exists
- Add room flow: fill form → submit → green snackbar "Room added!" → auto-dismisses
- Upload photo: select file → upload → green snackbar "Photo uploaded!" → photo appears in gallery
- Delete photo: click delete → confirm → green snackbar "Photo deleted" → photo removed from gallery
- Generate visualization: click generate → green snackbar "Visualization started!" → poll begins
- Design detail downloads: click "Download Image" → file downloads → green snackbar "Downloaded!"
- Profile save: change name → save → green snackbar "Name updated!" → no inline Alert visible
- Error scenario: disable network → attempt create project → red snackbar with error message → snackbar persists → click X to dismiss
- Rapid actions: create 4 budget items quickly → max 3 snackbars visible at once → oldest auto-dismissed
- Share dialog: create link → "Share link created!" → revoke → "Link revoked"
- Comments: post comment → "Comment posted" → comment appears in panel
- Canvas editor: save → "Design saved", export PNG → "PNG exported"

### 10. Verification Criteria

- [ ] `useSnackbar` imported from 'notistack' in all 12 files
- [ ] `const { enqueueSnackbar } = useSnackbar()` called inside each component body
- [ ] projects/new/page.tsx: "Project created!" on success, error message on failure
- [ ] rooms/new/page.tsx: "Room added!" on success, error message on failure
- [ ] rooms/[roomId]/page.tsx: "Visualization started!" on generate success
- [ ] rooms/[roomId]/page.tsx: "Detection started!" on detect success
- [ ] designs/[designId]/page.tsx: "Regenerating..." on regenerate success
- [ ] designs/[designId]/page.tsx: "Design deleted" on delete success
- [ ] designs/[designId]/page.tsx: "Downloaded!" on download image success
- [ ] designs/[designId]/page.tsx: "Downloaded!" on download comparison success
- [ ] profile/page.tsx: "Name updated!" on save name success (snackbar, not Alert)
- [ ] profile/page.tsx: "Account deleted" on delete account success
- [ ] profile/page.tsx: inline `<Alert>` and `showSuccess` state removed
- [ ] library/page.tsx: "Template applied!" on apply success
- [ ] photo-upload.tsx: "Photo uploaded!" on upload success
- [ ] photo-gallery.tsx: "Photo deleted" on delete success
- [ ] budget-editor.tsx: "Budget item added" on add success
- [ ] budget-editor.tsx: "Budget item removed" on delete success
- [ ] share-dialog.tsx: "Share link created!" on create success
- [ ] share-dialog.tsx: "Link revoked" on revoke success
- [ ] comments-panel.tsx: "Comment posted" on post success
- [ ] canvas-editor.tsx: "Design saved" on save success
- [ ] canvas-editor.tsx: "PNG exported" on export success
- [ ] All success snackbars use `{ variant: 'success', autoHideDuration: 4000 }`
- [ ] All error snackbars use `{ variant: 'error', persist: true }`
- [ ] All error snackbars display `err.message` with a sensible fallback string
- [ ] Max 3 snackbars stacked (AppSnackbarProvider maxSnack=3 unchanged)
- [ ] No new npm dependencies added
- [ ] `pnpm typecheck` passes in apps/web
- [ ] All existing mutation logic (API calls, navigation, state updates) unchanged
- [ ] Profile page renders correctly without inline Alert
