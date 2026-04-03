# SPEC-030 — AI Consent Dialog

**Parent Feature:** Replicate AI Visualization, Spec 030 of 030 (2 of 2)
**Spec Number:** 030
**Prerequisites:** SPEC-029 (Replicate Client + Visualization Processor)
**BRD Features:** RA-2 (privacy consent)

## Status: Not Started

### 1. Objective

Implement a one-time consent dialog that informs users their room photos will be processed by a cloud AI service (Replicate) before the first visualization generation. The dialog explains what data is sent, how it is used, and gives users the choice to consent or decline. Consent state is persisted in localStorage so the dialog appears only once. Declining disables cloud AI on the client side and shows a snackbar informing the user they will receive preview-mode results.

- **Before:** The visualization generation flow has no privacy disclosure. When a user clicks "Generate," the request goes to the backend which may now call Replicate (SPEC-029) to send room photos to a third-party cloud service. The user has no awareness that their photos leave the local infrastructure, and no ability to opt out.
- **After:** On the first "Generate" click, a dialog appears explaining cloud AI processing. "Yes, Use Cloud AI" sets `localStorage('ai_cloud_consent') = 'true'` and proceeds with generation. "No, Keep Local" sets the value to `'false'`, closes the dialog, and shows a snackbar "Cloud AI disabled. Using preview mode." On subsequent visits, the dialog does not appear — localStorage is checked first. The consent decision does not affect backend behavior (the backend independently checks `REPLICATE_API_TOKEN`); it controls whether the frontend proceeds with the generation request or shows the user a local-only message.
- **Success criteria:** (1) Consent dialog appears before first generation. (2) Dialog does not appear on subsequent visits after a choice is made. (3) "Yes" allows generation to proceed normally. (4) "No" shows snackbar and does not block generation (backend decides AI provider independently). (5) Dialog content clearly explains cloud processing and privacy. (6) Consent utility functions are reusable across components.

### 2. Architecture

```
apps/web/
├── components/
│   └── ui/
│       └── ai-consent-dialog.tsx            (CREATE — MUI Dialog for cloud AI consent)
├── lib/
│   └── ai-consent.ts                        (CREATE — localStorage consent helpers)
└── app/(main)/projects/[id]/rooms/[roomId]/
    └── page.tsx                              (MODIFY — integrate consent check before generate)
```

**User flow:**

```
User clicks "Generate" button
  → needsConsentPrompt()? (check localStorage)
    → YES (key not set):
      → Show AIConsentDialog
        → User clicks "Yes, Use Cloud AI":
          → setAIConsent(true) → localStorage 'ai_cloud_consent' = 'true'
          → Close dialog
          → Proceed with generation API call
        → User clicks "No, Keep Local":
          → setAIConsent(false) → localStorage 'ai_cloud_consent' = 'false'
          → Close dialog
          → Show snackbar: "Cloud AI disabled. Using preview mode."
          → Proceed with generation anyway (backend decides provider)
    → NO (key already set):
      → Skip dialog
      → Proceed with generation API call
      → (If previously declined, no special handling — backend uses its own config)
```

**Important architectural note:** The consent dialog is a UX transparency measure. It does NOT gate backend behavior. The backend independently checks `REPLICATE_API_TOKEN` to decide whether to use Replicate. The frontend consent:
1. Informs the user about cloud processing (legal/ethical transparency)
2. Records their preference (for potential future use, e.g., passing consent flag to API)
3. Shows appropriate feedback if they decline

### 3. Design Constraints

| ID | Constraint | Implementation |
|----|-----------|----------------|
| RA-DC-4 | Consent required before first generation | `needsConsentPrompt()` is checked in the generate handler before the API call. If consent has not been recorded, the dialog is shown and the API call is deferred until the user makes a choice. |
| localStorage persistence | Consent survives page reloads and browser sessions | Uses `localStorage.setItem('ai_cloud_consent', value)`. Checked on every generate click via `needsConsentPrompt()`. Only the absence of the key triggers the dialog — both `'true'` and `'false'` values indicate a decision was made. |
| One-time display | Dialog shows only once per browser | After the user clicks either button, `setAIConsent()` writes to localStorage. On subsequent generate clicks, `needsConsentPrompt()` returns `false` because the key exists, regardless of its value. |
| No backend coupling | Frontend consent does not control backend AI provider selection | The consent dialog does not send a flag to the API. The backend checks `REPLICATE_API_TOKEN` independently. This decoupling means: (a) consent works even if backend config changes, (b) backend security does not depend on client-side state. |

### 4. Detailed Design

#### 4a. Database / Schema Changes

No database changes. Consent is stored in browser localStorage only. No server-side consent record is created in this spec. If consent tracking is needed for compliance in the future, a `UserConsent` table can be added — but that is out of scope for this spec.

#### 4b. Backend / API Changes

No backend changes. The backend's Replicate integration (SPEC-029) operates independently of frontend consent state. The `REPLICATE_API_TOKEN` environment variable controls whether Replicate is used, not any client-side flag.

#### 4c. Frontend / UI Changes

**File: `apps/web/lib/ai-consent.ts`** (CREATE)

```typescript
const CONSENT_KEY = 'ai_cloud_consent';

/**
 * Check if the user has given consent for cloud AI processing.
 * Returns true if consent was explicitly granted.
 * Returns false if consent was declined OR if no choice has been made yet.
 */
export function hasAIConsent(): boolean {
  if (typeof window === 'undefined') return false; // SSR safety
  return localStorage.getItem(CONSENT_KEY) === 'true';
}

/**
 * Record the user's consent decision.
 * @param value - true for consent granted, false for declined
 */
export function setAIConsent(value: boolean): void {
  if (typeof window === 'undefined') return; // SSR safety
  localStorage.setItem(CONSENT_KEY, value ? 'true' : 'false');
}

/**
 * Check if the consent prompt needs to be shown.
 * Returns true only if no decision has been recorded yet (key absent from localStorage).
 * Returns false if the user has already made a choice (either true or false).
 */
export function needsConsentPrompt(): boolean {
  if (typeof window === 'undefined') return false; // SSR safety — don't show dialog during SSR
  return localStorage.getItem(CONSENT_KEY) === null;
}
```

Key design decisions:
- SSR safety: all functions check `typeof window === 'undefined'` because Next.js may execute component code on the server during SSR. Returning `false` on the server means the dialog is never triggered during SSR — it only appears on the client.
- `needsConsentPrompt()` checks for `null` (key absent), not `'false'`. This means a user who declined will NOT see the dialog again — their choice is respected.
- `hasAIConsent()` checks for exactly `'true'`. Any other value (including `'false'`, empty string, or corrupted data) returns `false`. Defensive approach.

**File: `apps/web/components/ui/ai-consent-dialog.tsx`** (CREATE)

```typescript
'use client';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import CloudIcon from '@mui/icons-material/Cloud';
import { setAIConsent } from '../../lib/ai-consent';

interface AIConsentDialogProps {
  open: boolean;
  onConsent: () => void;   // Called when user clicks "Yes, Use Cloud AI"
  onDecline: () => void;   // Called when user clicks "No, Keep Local"
}

export function AIConsentDialog({ open, onConsent, onDecline }: AIConsentDialogProps) {
  const handleConsent = () => {
    setAIConsent(true);
    onConsent();
  };

  const handleDecline = () => {
    setAIConsent(false);
    onDecline();
  };

  return (
    <Dialog open={open} onClose={handleDecline} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CloudIcon color="primary" />
        Cloud AI Processing
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          To generate realistic room visualizations, your room photos will be
          processed by a cloud AI service (Replicate). Photos are used only for
          generating your visualization and are not stored by the AI service.
        </DialogContentText>
        <DialogContentText sx={{ mt: 2 }}>
          Do you consent to cloud AI processing?
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleDecline} color="inherit">
          No, Keep Local
        </Button>
        <Button onClick={handleConsent} variant="contained" color="primary">
          Yes, Use Cloud AI
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

Key design decisions:
- `onClose` handler maps to `handleDecline` — if user presses Escape or clicks backdrop, it is treated as declining. This is the conservative privacy-preserving default.
- `onConsent` and `onDecline` callbacks are provided by the parent component so it can control what happens after the dialog closes (e.g., proceed with generation, show snackbar).
- `setAIConsent()` is called inside the dialog component, not the parent. This keeps the localStorage write co-located with the UI interaction and reduces the chance of forgetting to persist the choice.
- The dialog uses `maxWidth="sm"` and `fullWidth` for comfortable reading width on all screen sizes.
- CloudIcon provides a visual cue that reinforces the "cloud processing" message.

**File: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx`** (MODIFY)

Changes:
1. Add imports at top:
   ```typescript
   import { AIConsentDialog } from '../../../../../../components/ui/ai-consent-dialog';
   import { needsConsentPrompt } from '../../../../../../lib/ai-consent';
   ```

2. Add state for dialog visibility:
   ```typescript
   const [showConsentDialog, setShowConsentDialog] = useState(false);
   ```

3. Modify the generate handler (the function called when user clicks the "Generate" button):

   Current behavior: directly calls the API.
   New behavior: check consent first.

   ```typescript
   const handleGenerate = async () => {
     // Check if consent prompt is needed before first generation
     if (needsConsentPrompt()) {
       setShowConsentDialog(true);
       return; // Don't proceed — dialog callbacks will handle it
     }

     // Consent already recorded (either yes or no) — proceed with generation
     await performGenerate();
   };

   const performGenerate = async () => {
     try {
       // ... existing generation API call logic ...
       const response = await apiClient.post('/ai/visualization', {
         roomPhotoId: room.photos[0].id,
         category: selectedCategory,
         preset: qualityPreset,
       });
       enqueueSnackbar('Visualization started!', { variant: 'success', autoHideDuration: 4000 });
       // ... existing polling/refresh logic ...
     } catch (err: any) {
       enqueueSnackbar(err.message || 'Failed to start visualization', { variant: 'error', persist: true });
     }
   };

   const handleConsentGranted = () => {
     setShowConsentDialog(false);
     performGenerate(); // Proceed with generation
   };

   const handleConsentDeclined = () => {
     setShowConsentDialog(false);
     enqueueSnackbar('Cloud AI disabled. Using preview mode.', {
       variant: 'info',
       autoHideDuration: 5000,
     });
     // Still proceed with generation — backend decides the AI provider
     performGenerate();
   };
   ```

4. Add dialog component to JSX (inside the return, before the closing Container/Fragment):

   ```tsx
   <AIConsentDialog
     open={showConsentDialog}
     onConsent={handleConsentGranted}
     onDecline={handleConsentDeclined}
   />
   ```

Note on the "decline" flow: When the user declines, `performGenerate()` is still called. The backend will use whatever AI provider it has configured (Replicate if `REPLICATE_API_TOKEN` is set, mock otherwise). The snackbar message "Using preview mode" sets user expectations that the result may be lower quality — but the actual provider depends on backend config, not frontend consent. This design means:
- The user is informed about cloud processing (transparency goal met)
- Their preference is recorded (for potential future API flag)
- Generation is never blocked — users always get a result

#### 4d. Shared / Cross-cutting Changes

**No shared changes.** The consent utility lives in `apps/web/lib/` and is consumed only by web app components. No API changes, no shared package changes.

**Future considerations** (not in scope):
- Pass `consent: boolean` flag to the API so the backend can respect client-side consent by skipping Replicate when `consent === false`. This would require API controller + service changes and is a separate enhancement.
- Store consent in the database (`UserConsent` table) for compliance audit trails.
- Add a "Reset AI consent" option in user settings/profile page.

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| CREATE | apps/web/lib/ai-consent.ts | localStorage consent helpers: hasAIConsent, setAIConsent, needsConsentPrompt | Low |
| CREATE | apps/web/components/ui/ai-consent-dialog.tsx | MUI Dialog component for cloud AI consent prompt | Low |
| MODIFY | apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx | Integrate consent check before generate, add dialog to JSX | Med |

### 6. Dependency & Reference Check

#### External Dependencies

No new npm packages. All MUI Dialog components (`Dialog`, `DialogTitle`, `DialogContent`, `DialogContentText`, `DialogActions`, `Button`) are part of `@mui/material` which is already installed. The `CloudIcon` is from `@mui/icons-material` which is already installed.

#### Internal Dependencies
- `ai-consent.ts` is a new standalone utility with no internal imports beyond browser APIs.
- `ai-consent-dialog.tsx` imports from `ai-consent.ts` (sibling in the web app).
- `rooms/[roomId]/page.tsx` already imports `useSnackbar` from notistack (added in SPEC-028). The `enqueueSnackbar` call for the decline snackbar uses this existing import.
- `rooms/[roomId]/page.tsx` already has the generate handler and API call logic. The modification wraps existing logic — does not replace it.

#### Backward Compatibility
- For existing users who have never seen the dialog: on their next "Generate" click, the dialog will appear because `localStorage('ai_cloud_consent')` is absent. This is intentional — all users should see the disclosure once.
- For users who clear localStorage: the dialog will appear again on next generate. This is acceptable — localStorage clearing is an explicit user action.
- The generate flow itself is not functionally changed — both "Yes" and "No" paths call `performGenerate()`. The only difference is timing (dialog delay) and user feedback (snackbar on decline).

### 7. Implementation Plan

**Step 1:** Create consent utility module
- File: apps/web/lib/ai-consent.ts
- Action: create — implement `hasAIConsent()`, `setAIConsent()`, `needsConsentPrompt()` with SSR safety checks
- Verify: functions can be imported without errors, work correctly with localStorage

**Step 2:** Create AI consent dialog component
- File: apps/web/components/ui/ai-consent-dialog.tsx
- Action: create — MUI Dialog with title, explanation text, two action buttons
- Key: `onClose` maps to decline (privacy-preserving default)
- Key: `setAIConsent()` called inside the component on button click
- Verify: dialog renders correctly, buttons call callbacks

**Step 3:** Integrate consent into room detail page
- File: apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx
- Action: modify — add imports, add `showConsentDialog` state, split generate handler into `handleGenerate` (consent check) and `performGenerate` (API call), add consent/decline handlers, add `<AIConsentDialog>` to JSX
- Key: consent check happens in `handleGenerate`, before any API call
- Key: decline path still calls `performGenerate()` but shows info snackbar first

**Step 4:** Verify consent flow end-to-end
- Clear localStorage → click Generate → dialog appears → click "Yes" → generation proceeds → dialog does not appear on next generate
- Clear localStorage → click Generate → dialog appears → click "No" → snackbar shows "Cloud AI disabled. Using preview mode." → generation proceeds → dialog does not appear on next generate
- With consent already recorded → click Generate → no dialog → generation proceeds immediately

### 8. Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|-----------|
| localStorage unavailable (private browsing, storage full) | Low | Low | SSR safety checks return `false` for all functions. If `localStorage.setItem()` throws (quota exceeded), the dialog will appear on every generate click. Wrap `setItem` in try/catch in future hardening pass if needed. |
| User confusion: declined but generation still runs | Med | Med | The snackbar message "Cloud AI disabled. Using preview mode." sets expectations. The backend may still use Replicate if configured — but the user has been informed. A future enhancement can pass the consent flag to the API. |
| Dialog appears mid-workflow, interrupting flow | Low | Low | The dialog appears only once (first generate ever). Subsequent clicks bypass it immediately. The dialog is modal and clearly actionable — two buttons with clear labels. |
| Consent text becomes inaccurate if AI provider changes | Low | Low | The text mentions "Replicate" by name. If the backend switches providers, the text should be updated. Consider making the provider name configurable in a future iteration. |
| Multiple tabs: consent set in one tab not seen in another | Very Low | Very Low | localStorage is shared across same-origin tabs. A write in one tab is immediately visible in another tab's `getItem()` call. No synchronization issue. |
| SSR hydration mismatch if consent state differs | Low | Low | All consent functions return `false` during SSR. The dialog `open` state is managed by `useState(false)` which is client-side only. No hydration mismatch because the dialog is never server-rendered as open. |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests

**ai-consent.test.ts:**
- `needsConsentPrompt()` returns `true` when localStorage key is absent
- `needsConsentPrompt()` returns `false` when localStorage key is `'true'`
- `needsConsentPrompt()` returns `false` when localStorage key is `'false'`
- `hasAIConsent()` returns `false` when localStorage key is absent
- `hasAIConsent()` returns `true` when localStorage key is `'true'`
- `hasAIConsent()` returns `false` when localStorage key is `'false'`
- `setAIConsent(true)` sets localStorage key to `'true'`
- `setAIConsent(false)` sets localStorage key to `'false'`
- All functions return `false` when `window` is undefined (SSR environment)

**ai-consent-dialog.test.tsx:**
- Dialog renders with correct title "Cloud AI Processing"
- Dialog renders explanation text mentioning "Replicate" and "cloud AI service"
- Dialog renders "No, Keep Local" button
- Dialog renders "Yes, Use Cloud AI" button
- Clicking "Yes, Use Cloud AI" calls `onConsent` callback
- Clicking "Yes, Use Cloud AI" sets `localStorage('ai_cloud_consent')` to `'true'`
- Clicking "No, Keep Local" calls `onDecline` callback
- Clicking "No, Keep Local" sets `localStorage('ai_cloud_consent')` to `'false'`
- Pressing Escape calls `onDecline` callback (dialog `onClose` maps to decline)
- Dialog does not render when `open` is `false`
- Dialog renders when `open` is `true`

**room detail page consent integration tests:**
- Click Generate when no consent recorded → dialog opens, API not called yet
- Click Generate when consent is `'true'` → dialog does not open, API called immediately
- Click Generate when consent is `'false'` → dialog does not open, API called immediately
- Dialog "Yes" → dialog closes, `performGenerate` called
- Dialog "No" → dialog closes, snackbar "Cloud AI disabled. Using preview mode." shown, `performGenerate` called

#### 9b. Integration Tests

- Full consent flow: clear localStorage → render room page → click Generate → dialog appears → click "Yes" → verify localStorage set to `'true'` → verify API call made → click Generate again → no dialog → API call made directly
- Decline flow: clear localStorage → render room page → click Generate → dialog appears → click "No" → verify localStorage set to `'false'` → verify snackbar shown → verify API call still made → click Generate again → no dialog → no snackbar → API call made directly
- Component mounting: render `AIConsentDialog` with mocked localStorage → verify `setAIConsent` writes correct value
- SSR safety: render page server-side → verify no localStorage access errors, no dialog rendered

#### 9c. E2E / UI Tests

- Fresh browser (cleared localStorage): navigate to room page → click Generate → consent dialog appears with "Cloud AI Processing" title → dialog has explanation text → dialog has two buttons
- Accept flow: fresh browser → Generate → dialog → click "Yes, Use Cloud AI" → dialog closes → visualization generation begins (loading state appears) → on next visit, Generate does not show dialog
- Decline flow: fresh browser → Generate → dialog → click "No, Keep Local" → dialog closes → snackbar "Cloud AI disabled. Using preview mode." appears → visualization generation still begins → on next visit, Generate does not show dialog and no snackbar
- Escape key: fresh browser → Generate → dialog → press Escape → dialog closes → treated as decline (localStorage set to `'false'`)
- Backdrop click: fresh browser → Generate → dialog → click outside dialog → dialog closes → treated as decline
- Persistence across pages: accept consent on room A → navigate to room B → click Generate → no dialog (localStorage is global)
- Dialog accessibility: verify dialog is focusable, buttons are keyboard-navigable, dialog traps focus while open

### 10. Verification Criteria

- [ ] `ai-consent.ts` created in `apps/web/lib/` with three exported functions
- [ ] `hasAIConsent()` reads from `localStorage('ai_cloud_consent')` and returns boolean
- [ ] `setAIConsent(value)` writes `'true'` or `'false'` to localStorage
- [ ] `needsConsentPrompt()` returns `true` only when localStorage key is absent (null)
- [ ] All three functions handle SSR (typeof window === 'undefined') without errors
- [ ] `ai-consent-dialog.tsx` created in `apps/web/components/ui/`
- [ ] Dialog title is "Cloud AI Processing" with CloudIcon
- [ ] Dialog content explains cloud processing by Replicate and asks for consent
- [ ] Dialog content includes: "Photos are used only for generating your visualization and are not stored by the AI service"
- [ ] "Yes, Use Cloud AI" button calls `setAIConsent(true)` and `onConsent` callback
- [ ] "No, Keep Local" button calls `setAIConsent(false)` and `onDecline` callback
- [ ] Dialog `onClose` (Escape, backdrop click) maps to decline behavior
- [ ] Room detail page imports `AIConsentDialog` and `needsConsentPrompt`
- [ ] Generate handler checks `needsConsentPrompt()` before API call (RA-DC-4)
- [ ] If consent needed: dialog shown, API call deferred until user clicks a button
- [ ] If consent already recorded: dialog skipped, API call proceeds immediately
- [ ] Consent granted: dialog closes, generation proceeds normally
- [ ] Consent declined: dialog closes, snackbar "Cloud AI disabled. Using preview mode." shown, generation still proceeds
- [ ] Dialog appears only once per browser — subsequent Generate clicks skip it
- [ ] `pnpm typecheck` passes in apps/web
- [ ] No new npm dependencies added (all MUI components already available)
- [ ] All existing tests continue to pass
