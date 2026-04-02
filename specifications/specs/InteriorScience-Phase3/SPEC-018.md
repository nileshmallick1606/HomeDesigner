# SPEC-018 — UI Polish & Error Handling

**Parent Feature:** InteriorScience Phase 3, Spec 018 of 022 (Phase 3: 2 of 6)
**Prerequisites:** SPEC-017 (Design System & UX Foundation)
**Covers:** P3-F1 (completion — polish layer)

## Status: Not Started

### 1. Objective

Complete the UX polish layer by adding global snackbar notifications for all mutations, structured error state components, status chip color theming, hover animations on cards, category selector transitions, an improved share button, and a landing page enhancement with gradient background and feature cards.

- **Before:** No feedback on successful actions (project create, room add, photo upload, etc.) — user must infer success from navigation or UI change. Error states are plain `<Typography color="error">` text with no retry option. Status Chips use `color="default"` everywhere regardless of status. Cards have no hover effect. Category selector has no transition on selection. Share button is an icon-only IconButton (unclear affordance). Landing page is plain white background with minimal content.
- **After:** Every mutation shows a snackbar (success or error) via notistack. Dedicated ErrorState component with icon, message, and retry button replaces raw error text on project detail, room detail, and design detail pages. Status Chips use theme-mapped colors (Draft=default, Active=success, Completed=info, Archived=warning). All card CardActionAreas have subtle hover lift with shadow elevation. Category selector has smooth 200ms transition on border/background change. Share button is a labeled Button with ShareIcon. Landing page has a gradient background and 3 feature highlight cards below CTA.
- **Success criteria:** All 11 mutation types show snackbar feedback. ErrorState component used on 3 pages (project detail, room detail, design detail). Status Chips colored by theme mapping. Cards lift on hover. Category selector transitions smoothly. Share button shows "Share" label. Landing page has gradient and feature cards.

### 2. Architecture

```
Snackbar Provider (notistack):
  ├── Install notistack in apps/web/package.json
  ├── Create SnackbarProvider wrapper (snackbar-provider.tsx)
  │   └── Configure: maxSnack=3, autoHideDuration=3000, anchorOrigin=bottom-center (P3-E2)
  ├── Wrap in apps/web/app/layout.tsx (inside ThemeProvider, outside children)
  └── Create useNotify() hook (use-notify.ts)
      ├── useNotify().success(message) → enqueueSnackbar(message, { variant: 'success' })
      ├── useNotify().error(message) → enqueueSnackbar(message, { variant: 'error' })
      └── useNotify().info(message) → enqueueSnackbar(message, { variant: 'info' })

Mutation Feedback Wiring:
  ├── Project create (new/page.tsx) → success: "Project created!"
  ├── Room add (rooms/new/page.tsx) → success: "Room added!"
  ├── Photo upload (photo-upload.tsx) → success: "Photo uploaded!"
  ├── Photo delete (room detail page, gallery onDelete) → success: "Photo deleted"
  ├── Budget add (budget-editor.tsx) → success: "Budget item added"
  ├── Budget delete (budget-editor.tsx) → success: "Budget item deleted"
  ├── Comment post (comments-panel.tsx) → success: "Comment posted"
  ├── Share link create (share-dialog.tsx) → success: "Link created"
  ├── Design generate (room detail page) → success: "Visualization started"
  ├── Design delete (design detail page) → success: "Design deleted"
  ├── Profile name save (profile/page.tsx) → convert Alert to Snackbar: "Name updated!"
  └── Account delete (profile/page.tsx) → success: "Account deleted"
  Note: all mutation catch blocks also call notify.error(message)

Error State Component (error-state.tsx):
  ├── Props: message (string), onRetry? (() => void), icon? (ReactNode)
  ├── Renders: centered Box with ErrorOutlineIcon (or custom icon), error message Typography, Retry Button
  └── Replaces: plain <Typography color="error"> on project detail, room detail, design detail

Status Chip Colors:
  ├── Use theme.statusColors mapping from SPEC-017
  ├── Chip color prop: DRAFT→'default', ACTIVE→'success', COMPLETED→'info', ARCHIVED→'warning'
  ├── Applied in: dashboard project cards, projects list cards, project detail Chip, design-card.tsx
  └── Helper function: getStatusChipColor(status: string) → MUI Chip color

Card Hover States:
  ├── All CardActionArea cards get hover sx:
  │   sx={{ '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }, transition: 'all 0.2s' }}
  ├── Applied in: dashboard cards, projects list cards, project detail room cards, design-card.tsx, category-selector.tsx
  └── P3-DC-9: 200ms transition, subtle -2px lift

Category Selector Animation (category-selector.tsx):
  ├── Add transition: 'all 0.2s' to Card sx for border/background change
  ├── Add subtle background tint on selected: bgcolor: alpha(cat.color, 0.08)
  └── Existing border change (selected vs unselected) becomes animated

Share Button Label (project detail page):
  ├── Replace: <IconButton><ShareIcon /></IconButton>
  ├── With: <Button variant="outlined" startIcon={<ShareIcon />}>Share</Button>
  └── Pass as actions prop to AppHeader (from SPEC-017)

Landing Page Enhancement (page.tsx):
  ├── Add gradient background: linear-gradient from primary.main to secondary.main (diagonal)
  ├── White text for title/subtitle on gradient
  ├── Add 3 feature highlight cards below CTA:
  │   ├── Card 1: "AI Visualization" — icon + description
  │   ├── Card 2: "Room Budgeting" — icon + description
  │   └── Card 3: "Share & Collaborate" — icon + description
  └── Cards in a responsive Grid (xs=12, sm=4)
```

### 3. Design Constraints

- **P3-DC-3 (Snackbar for all mutations):** Every create, update, and delete operation must show a snackbar on success and on error. No silent failures. Snackbar autoHideDuration is 3000ms for success, 5000ms for errors.
- **P3-DC-9 (Subtle transitions):** Card hover (translateY + boxShadow) and category selector border/background transitions must use 150-200ms duration. No jarring or distracting animations.
- **P3-E1 (Skeleton min 200ms):** Referenced from SPEC-017 — skeleton loaders show for at least 200ms to avoid flash. This spec does not implement skeletons but must not break the pattern.
- **P3-E2 (Stack up to 3 snackbars):** notistack maxSnack=3. If more than 3 snackbars fire simultaneously, oldest is dismissed. Prevents snackbar overflow.

### 4. Detailed Design

#### 4a. Database / Schema Changes
- None — this spec is entirely frontend.

#### 4b. Backend / API Changes
- None — this spec is entirely frontend.

#### 4c. Frontend / UI Changes

**File: `apps/web/package.json`** (MODIFY)
- Add dependency: `"notistack": "^3.0.1"`
- notistack v3 is built on MUI Snackbar and supports MUI v5 theming.

**File: `apps/web/components/ui/snackbar-provider.tsx`** (CREATE)
- Wrapper component around notistack's SnackbarProvider:
```tsx
'use client';

import { SnackbarProvider } from 'notistack';

export function AppSnackbarProvider({ children }: { children: React.ReactNode }) {
  return (
    <SnackbarProvider
      maxSnack={3}
      autoHideDuration={3000}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      preventDuplicate
    >
      {children}
    </SnackbarProvider>
  );
}
```

**File: `apps/web/lib/use-notify.ts`** (CREATE)
- Custom hook wrapping notistack's useSnackbar:
```tsx
'use client';

import { useSnackbar, VariantType } from 'notistack';

export function useNotify() {
  const { enqueueSnackbar } = useSnackbar();

  return {
    success: (message: string) => enqueueSnackbar(message, { variant: 'success' }),
    error: (message: string) => enqueueSnackbar(message, { variant: 'error', autoHideDuration: 5000 }),
    info: (message: string) => enqueueSnackbar(message, { variant: 'info' }),
    warning: (message: string) => enqueueSnackbar(message, { variant: 'warning' }),
  };
}
```

**File: `apps/web/app/layout.tsx`** (MODIFY)
- Import `AppSnackbarProvider` from `../components/ui/snackbar-provider`
- Wrap children inside `<AppSnackbarProvider>` (must be inside ThemeProvider since notistack uses MUI theme):
```tsx
<ThemeProvider theme={theme}>
  <CssBaseline />
  <AppSnackbarProvider>
    {children}
  </AppSnackbarProvider>
</ThemeProvider>
```

**File: `apps/web/components/ui/error-state.tsx`** (CREATE)
- Props:
```ts
interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  icon?: React.ReactNode;
}
```
- Renders: centered Box with:
  - Icon: `ErrorOutlineIcon` (default) or custom icon prop, `sx={{ fontSize: 64, color: 'error.main', mb: 2 }}`
  - Message: `Typography variant="h6" color="text.secondary"`
  - Retry button: `Button variant="outlined" startIcon={<RefreshIcon />} onClick={onRetry}` — shown only when onRetry provided
- Styled similarly to EmptyState for visual consistency (py:8, px:3, textAlign:'center', flexDirection:'column', alignItems:'center')

**File: `apps/web/lib/status-colors.ts`** (CREATE)
- Helper function to get Chip color from status string:
```ts
type ChipColor = 'default' | 'success' | 'info' | 'warning' | 'error' | 'primary' | 'secondary';

const STATUS_COLOR_MAP: Record<string, ChipColor> = {
  DRAFT: 'default',
  ACTIVE: 'success',
  COMPLETED: 'info',
  ARCHIVED: 'warning',
  FINAL: 'success',
  PROCESSING: 'info',
  FAILED: 'error',
};

export function getStatusChipColor(status: string): ChipColor {
  return STATUS_COLOR_MAP[status?.toUpperCase()] || 'default';
}
```

**File: `apps/web/app/(main)/projects/new/page.tsx`** (MODIFY)
- Import `useNotify` from `../../../../lib/use-notify`
- In handleSubmit try block, after successful create and before router.push: `notify.success('Project created!')`
- In catch block: `notify.error(err instanceof Error ? err.message : 'Failed to create project')`
- Remove inline `setError` / `<Alert>` usage (replaced by snackbar) — or keep Alert for form validation errors only and add snackbar for the creation success

**File: `apps/web/app/(main)/projects/[id]/rooms/new/page.tsx`** (MODIFY)
- Import `useNotify`
- In handleSubmit try block, after successful POST: `notify.success('Room added!')`
- In catch block: `notify.error('Failed to add room')`

**File: `apps/web/components/media/photo-upload.tsx`** (MODIFY)
- Import `useNotify`
- After successful upload (setProgress(100) line): `notify.success('Photo uploaded!')`
- In catch block: `notify.error(err instanceof Error ? err.message : 'Upload failed')`

**File: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx`** (MODIFY)
- Import `useNotify` and `ErrorState`
- Import `getStatusChipColor` from status-colors.ts
- Photo delete callback: after successful fetch DELETE, add `notify.success('Photo deleted')`
- Design generate handleGenerate: in try block after setActiveJobId, add `notify.success('Visualization started')`; in catch: `notify.error(...)`
- Replace error Typography with `<ErrorState message={error || 'Room not found'} onRetry={fetchRoom} />`

**File: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx`** (MODIFY)
- Import `useNotify` and `ErrorState`
- Import `getStatusChipColor`
- handleDelete: after successful DELETE, before router.push: `notify.success('Design deleted')`
- handleRegenerate: in catch block: `notify.error(...)`
- Replace error-only render block (`if (error && !design)`) with `<ErrorState message={error} onRetry={fetchDesign} />`
- Update `<Chip label={design.status}>` to use `color={getStatusChipColor(design.status)}`

**File: `apps/web/app/(main)/projects/[id]/page.tsx`** (MODIFY)
- Import `getStatusChipColor`
- Import `ErrorState`
- Replace `<Chip label={project.status} size="small" color="default" />` with `<Chip label={project.status} size="small" color={getStatusChipColor(project.status)} />`
- Replace error Typography with `<ErrorState message={error || 'Project not found'} onRetry={() => window.location.reload()} />`
- Share button: change from `<IconButton onClick={...}><ShareIcon /></IconButton>` to `<Button variant="outlined" size="small" startIcon={<ShareIcon />} onClick={() => setShareDialogOpen(true)}>Share</Button>` — pass as actions to AppHeader (from SPEC-017)
- Add hover sx to room cards: `<Card sx={{ '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }, transition: 'all 0.2s' }}>`

**File: `apps/web/app/(main)/dashboard/page.tsx`** (MODIFY)
- Import `getStatusChipColor`
- Update project card Chips: `<Chip label={project.status} size="small" color={getStatusChipColor(project.status)} />`
- Add hover sx to project cards: `<Card sx={{ '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }, transition: 'all 0.2s' }}>`

**File: `apps/web/app/(main)/projects/page.tsx`** (MODIFY)
- Import `getStatusChipColor`
- Update project card Chips: `<Chip label={project.status} size="small" color={getStatusChipColor(project.status)} />`
- Add hover sx to project cards: `<Card sx={{ '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }, transition: 'all 0.2s' }}>`

**File: `apps/web/components/visualization/design-card.tsx`** (MODIFY)
- Import `getStatusChipColor`
- Update status Chip: replace `color={design.status === 'FINAL' ? 'success' : 'default'}` with `color={getStatusChipColor(design.status)}`
- Add hover sx to Card: `<Card sx={{ '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }, transition: 'all 0.2s' }}>`

**File: `apps/web/components/visualization/category-selector.tsx`** (MODIFY)
- Add transition to Card sx: `transition: 'all 0.2s'`
- Add background tint on selected: when `selected === cat.key`, add `bgcolor: alpha(cat.color, 0.08)` (import `alpha` from `@mui/material/styles`)
- Full Card sx becomes:
```tsx
sx={{
  border: selected === cat.key ? 2 : 1,
  borderColor: selected === cat.key ? cat.color : 'divider',
  bgcolor: selected === cat.key ? alpha(cat.color, 0.08) : 'transparent',
  transition: 'all 0.2s',
}}
```

**File: `apps/web/components/sharing/share-dialog.tsx`** (MODIFY)
- Import `useNotify`
- handleCreateLink: after successful POST, add `notify.success('Link created')`
- handleRevoke: after successful DELETE, add `notify.success('Link revoked')`
- handleCopy: after clipboard write, add `notify.success('Link copied to clipboard')`
- In catch blocks: add `notify.error(...)` instead of silent ignores

**File: `apps/web/components/comments/comments-panel.tsx`** (MODIFY)
- Import `useNotify`
- handleSubmit: after successful POST and fetchComments: `notify.success('Comment posted')`
- In catch block: `notify.error('Failed to post comment')`

**File: `apps/web/components/budget/budget-editor.tsx`** (MODIFY)
- Import `useNotify`
- handleAdd: after successful POST: `notify.success('Budget item added')`
- handleDelete: after successful DELETE: `notify.success('Budget item deleted')`
- In catch blocks: replace or supplement setError with `notify.error(...)`

**File: `apps/web/app/(main)/profile/page.tsx`** (MODIFY)
- Import `useNotify`
- handleSaveName: replace `setSaved(true) / setTimeout / <Alert>` pattern with `notify.success('Name updated!')`
- Remove `saved` state variable and the `{saved && <Alert>}` JSX
- handleDeleteAccount: after successful DELETE, before logout: `notify.success('Account deleted')`

**File: `apps/web/app/page.tsx`** (MODIFY)
- Add gradient background to the main container Box:
```tsx
sx={{
  ...existing styles,
  background: 'linear-gradient(135deg, #1565C0 0%, #FF6F00 100%)',
  minHeight: '100vh',
  color: 'white',
}}
```
- Update Typography colors: title and subtitle text use `color="white"` or `color="rgba(255,255,255,0.9)"`. Add `textShadow: '0 1px 4px rgba(0,0,0,0.3)'` to ensure readability across all gradient positions (white on #FF6F00 alone is only 2.9:1 — the text-shadow and gradient positioning ensure effective 4.5:1 contrast).
- Update "Sign In" link color to white with underline
- Add 3 feature highlight cards below the CTA in a Grid:
```tsx
<Grid container spacing={2} sx={{ mt: 4, maxWidth: 600 }}>
  <Grid item xs={12} sm={4}>
    <Card sx={{ textAlign: 'center', p: 2 }}>
      <AutoFixHighIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
      <Typography variant="subtitle2" fontWeight={600}>AI Visualization</Typography>
      <Typography variant="caption" color="text.secondary">
        See your renovated space before any work begins.
      </Typography>
    </Card>
  </Grid>
  <Grid item xs={12} sm={4}>
    <Card sx={{ textAlign: 'center', p: 2 }}>
      <AccountBalanceWalletIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
      <Typography variant="subtitle2" fontWeight={600}>Room Budgeting</Typography>
      <Typography variant="caption" color="text.secondary">
        Track estimated vs actual costs per room and category.
      </Typography>
    </Card>
  </Grid>
  <Grid item xs={12} sm={4}>
    <Card sx={{ textAlign: 'center', p: 2 }}>
      <ShareIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
      <Typography variant="subtitle2" fontWeight={600}>Share & Collaborate</Typography>
      <Typography variant="caption" color="text.secondary">
        Share projects with contractors and family via secure links.
      </Typography>
    </Card>
  </Grid>
</Grid>
```
- Import additional icons: AutoFixHighIcon, AccountBalanceWalletIcon, ShareIcon from @mui/icons-material

#### 4d. Shared / Cross-cutting Changes
- notistack v3 is a new npm dependency (adds to apps/web/package.json). It depends on MUI Snackbar internally.
- `useNotify()` hook becomes the standard way to show feedback across the app. Any future mutation components should also use it.
- `getStatusChipColor()` becomes the standard helper for Chip color mapping. Any future status displays should use it.
- `ErrorState` component becomes the standard pattern for error display. Any new pages should use it instead of plain Typography.

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| MODIFY | apps/web/package.json | Add notistack@^3.0.1 dependency | Low |
| CREATE | apps/web/components/ui/snackbar-provider.tsx | SnackbarProvider wrapper with config | Low |
| CREATE | apps/web/lib/use-notify.ts | useNotify() hook wrapping useSnackbar | Low |
| MODIFY | apps/web/app/layout.tsx | Wrap children in AppSnackbarProvider | Low |
| CREATE | apps/web/components/ui/error-state.tsx | ErrorState component with icon, message, retry | Low |
| CREATE | apps/web/lib/status-colors.ts | getStatusChipColor() helper | Low |
| MODIFY | apps/web/app/(main)/projects/new/page.tsx | Add snackbar on project create success/error | Low |
| MODIFY | apps/web/app/(main)/projects/[id]/rooms/new/page.tsx | Add snackbar on room add success/error | Low |
| MODIFY | apps/web/components/media/photo-upload.tsx | Add snackbar on upload success/error | Low |
| MODIFY | apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx | Snackbar on photo delete/generate, ErrorState, hover | Med |
| MODIFY | apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx | Snackbar on delete, ErrorState, status colors | Med |
| MODIFY | apps/web/app/(main)/projects/[id]/page.tsx | Status colors, ErrorState, share label, hover on room cards | Med |
| MODIFY | apps/web/app/(main)/dashboard/page.tsx | Status chip colors, card hover | Low |
| MODIFY | apps/web/app/(main)/projects/page.tsx | Status chip colors, card hover | Low |
| MODIFY | apps/web/components/visualization/design-card.tsx | Status chip colors, card hover | Low |
| MODIFY | apps/web/components/visualization/category-selector.tsx | Transition animation, background tint on selected | Low |
| MODIFY | apps/web/components/sharing/share-dialog.tsx | Snackbar on link create/revoke/copy | Low |
| MODIFY | apps/web/components/comments/comments-panel.tsx | Snackbar on comment post | Low |
| MODIFY | apps/web/components/budget/budget-editor.tsx | Snackbar on budget add/delete | Low |
| MODIFY | apps/web/app/(main)/profile/page.tsx | Snackbar replaces Alert for name save, snackbar on delete | Med |
| MODIFY | apps/web/app/page.tsx | Gradient background, feature highlight cards | Med |

### 6. Dependency & Reference Check

#### Frontend Wiring
- **New npm package:** notistack@^3.0.1 (add to apps/web/package.json). Requires `@mui/material` >= 5 (already installed at ^5.15.0).
- `snackbar-provider.tsx` imports `SnackbarProvider` from `notistack` — available after npm install.
- `use-notify.ts` imports `useSnackbar` from `notistack` — available after npm install.
- `layout.tsx` imports `AppSnackbarProvider` from `../components/ui/snackbar-provider` — created in this spec.
- `error-state.tsx` imports `ErrorOutlineIcon`, `RefreshIcon` from `@mui/icons-material` — already installed.
- `status-colors.ts` is a pure TypeScript utility — no external deps.
- `category-selector.tsx` imports `alpha` from `@mui/material/styles` — already available.
- Landing page imports `AutoFixHighIcon`, `AccountBalanceWalletIcon`, `ShareIcon`, `Grid`, `Card` — all from already-installed MUI packages.
- All components using `useNotify()` must be client components ('use client') — they already are.

#### Backend Wiring
- No backend changes. All mutations already exist — this spec only adds frontend feedback.

#### Cross-Spec Dependencies
- SPEC-017 must be completed first: AppHeader is referenced in project detail share button (passed as actions prop), StatusColors mapping references theme.statusColors.
- ErrorState and useNotify patterns established here are used by future specs (SPEC-019 through SPEC-022).

### 7. Implementation Plan

**Step 1:** Install notistack
- File: apps/web/package.json
- Action: modify
- Details: Add notistack@^3.0.1 to dependencies. Run pnpm install.

**Step 2:** Create snackbar provider and hook
- Files: apps/web/components/ui/snackbar-provider.tsx, apps/web/lib/use-notify.ts
- Action: create both
- Details: SnackbarProvider wrapper with maxSnack=3, autoHideDuration=3000, anchorOrigin bottom-center. useNotify hook wrapping useSnackbar with success/error/info/warning methods.

**Step 3:** Wire snackbar provider into root layout
- File: apps/web/app/layout.tsx
- Action: modify
- Details: Import AppSnackbarProvider. Wrap children inside it, within ThemeProvider.

**Step 4:** Create error-state component
- File: apps/web/components/ui/error-state.tsx
- Action: create
- Details: ErrorState with icon, message, retry button. Styled like EmptyState for consistency.

**Step 5:** Create status-colors helper
- File: apps/web/lib/status-colors.ts
- Action: create
- Details: getStatusChipColor(status) returns MUI Chip color prop value.

**Step 6:** Wire snackbar to project creation
- File: apps/web/app/(main)/projects/new/page.tsx
- Action: modify
- Details: Import useNotify. Add notify.success('Project created!') on success. Add notify.error() on failure.

**Step 7:** Wire snackbar to room creation
- File: apps/web/app/(main)/projects/[id]/rooms/new/page.tsx
- Action: modify
- Details: Import useNotify. Add notify.success('Room added!') on success. Add notify.error() on failure.

**Step 8:** Wire snackbar to photo upload
- File: apps/web/components/media/photo-upload.tsx
- Action: modify
- Details: Import useNotify. Add notify.success('Photo uploaded!') after upload. Add notify.error() in catch.

**Step 9:** Update room detail page (snackbar + error state)
- File: apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx
- Action: modify
- Details: Import useNotify, ErrorState, getStatusChipColor. Add snackbar to photo delete, design generate. Replace error Typography with ErrorState.

**Step 10:** Update design detail page (snackbar + error state + status colors)
- File: apps/web/app/(main)/projects/[id]/rooms/[roomId]/designs/[designId]/page.tsx
- Action: modify
- Details: Import useNotify, ErrorState, getStatusChipColor. Add snackbar to delete/regenerate. Replace error with ErrorState. Color status Chips.

**Step 11:** Update project detail page (status colors + error state + share label + hover)
- File: apps/web/app/(main)/projects/[id]/page.tsx
- Action: modify
- Details: Import getStatusChipColor, ErrorState. Color status Chip. Replace error with ErrorState. Change share IconButton to labeled Button. Add hover sx to room cards.

**Step 12:** Update dashboard and projects list (status colors + hover)
- Files: apps/web/app/(main)/dashboard/page.tsx, apps/web/app/(main)/projects/page.tsx
- Action: modify both
- Details: Import getStatusChipColor. Color status Chips. Add hover sx to cards.

**Step 13:** Update design-card (status colors + hover)
- File: apps/web/components/visualization/design-card.tsx
- Action: modify
- Details: Import getStatusChipColor. Replace manual status color logic with getStatusChipColor. Add hover sx.

**Step 14:** Update category selector (animation)
- File: apps/web/components/visualization/category-selector.tsx
- Action: modify
- Details: Import alpha from MUI. Add transition: 'all 0.2s' to Card. Add bgcolor with alpha on selected.

**Step 15:** Wire snackbar to share dialog
- File: apps/web/components/sharing/share-dialog.tsx
- Action: modify
- Details: Import useNotify. Add snackbar to create link, revoke link, copy link.

**Step 16:** Wire snackbar to comments panel
- File: apps/web/components/comments/comments-panel.tsx
- Action: modify
- Details: Import useNotify. Add snackbar to comment post success/error.

**Step 17:** Wire snackbar to budget editor
- File: apps/web/components/budget/budget-editor.tsx
- Action: modify
- Details: Import useNotify. Add snackbar to budget add/delete success/error.

**Step 18:** Update profile page (convert Alert to snackbar + account delete)
- File: apps/web/app/(main)/profile/page.tsx
- Action: modify
- Details: Import useNotify. Replace saved state + Alert with notify.success('Name updated!'). Add notify.success('Account deleted') on account delete.

**Step 19:** Enhance landing page
- File: apps/web/app/page.tsx
- Action: modify
- Details: Add gradient background. Update text colors to white. Add 3 feature highlight cards in a Grid below CTA.

### 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| notistack v3 incompatible with MUI v5.15 | Low | notistack v3 explicitly supports MUI v5. Lock version to ^3.0.1. Verify in dev after install. |
| SnackbarProvider must be inside ThemeProvider for MUI theming | Low | Layout.tsx wrapping order: ThemeProvider > AppSnackbarProvider > children. Verified in architecture. |
| useNotify() called outside SnackbarProvider (e.g., in auth pages) | Med | SnackbarProvider is at root layout level (layout.tsx), which wraps ALL routes including /login and /register. All pages can use useNotify(). |
| Multiple snackbars firing simultaneously (e.g., bulk operations) | Low | P3-E2: maxSnack=3, oldest dismissed. preventDuplicate=true prevents duplicate messages. |
| Gradient background on landing page makes text unreadable | Med | White on #1565C0 = 6.4:1 (passes). White on #FF6F00 = 2.9:1 (fails). Fix: add `textShadow: '0 1px 4px rgba(0,0,0,0.3)'` to all white text on the gradient. This ensures effective contrast meets WCAG AA even against the lighter gradient end. |
| Card hover transform causes layout shift in Grid | Low | translateY(-2px) only affects visual position, not layout flow. boxShadow similarly does not affect layout. No CLS risk. |
| ErrorState onRetry re-fetches but error persists (infinite retry loop) | Low | onRetry is manual (user clicks button). No auto-retry. Error message updates on re-fetch failure. |
| Profile page: removing Alert for name save changes UX flow | Low | Snackbar provides equivalent feedback. Snackbar is actually better UX (non-blocking, auto-dismiss). No information lost. |
| getStatusChipColor returns 'default' for unknown statuses | Low | Intentional fallback. Unknown statuses render as grey/default chip, which is a safe visual. |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests
- useNotify().success() calls enqueueSnackbar with variant='success'
- useNotify().error() calls enqueueSnackbar with variant='error' and autoHideDuration=5000
- useNotify().info() calls enqueueSnackbar with variant='info'
- ErrorState renders error message text
- ErrorState renders retry button when onRetry provided
- ErrorState hides retry button when onRetry not provided
- ErrorState renders custom icon when provided
- ErrorState renders default ErrorOutlineIcon when no icon provided
- getStatusChipColor('DRAFT') returns 'default'
- getStatusChipColor('ACTIVE') returns 'success'
- getStatusChipColor('COMPLETED') returns 'info'
- getStatusChipColor('ARCHIVED') returns 'warning'
- getStatusChipColor('FINAL') returns 'success'
- getStatusChipColor('FAILED') returns 'error'
- getStatusChipColor('UNKNOWN') returns 'default' (fallback)
- getStatusChipColor(undefined as any) returns 'default' (null safety)
- AppSnackbarProvider renders children
- AppSnackbarProvider configures maxSnack=3

#### 9b. Integration Tests
- Project create page: submit form -> snackbar "Project created!" appears
- Project create page: submit with API error -> error snackbar appears
- Room add page: submit -> snackbar "Room added!" appears
- Photo upload: upload file -> snackbar "Photo uploaded!" appears
- Photo upload: upload fails -> error snackbar appears
- Photo delete: delete photo -> snackbar "Photo deleted" appears
- Design generate: click generate -> snackbar "Visualization started" appears
- Design delete: confirm delete -> snackbar "Design deleted" appears
- Comment post: submit comment -> snackbar "Comment posted" appears
- Share link create: create link -> snackbar "Link created" appears
- Share link copy: copy link -> snackbar "Link copied to clipboard" appears
- Budget add: add item -> snackbar "Budget item added" appears
- Budget delete: delete item -> snackbar "Budget item deleted" appears
- Profile name save: save -> snackbar "Name updated!" appears (no Alert)
- Account delete: confirm delete -> snackbar "Account deleted" appears
- Project detail: API error -> ErrorState with retry button renders (not plain Typography)
- Room detail: API error -> ErrorState with retry button renders
- Design detail: API error -> ErrorState with retry button renders
- ErrorState retry button: click -> re-fetches data
- Dashboard project cards: ACTIVE status Chip renders with green (success) color
- Design card: status Chip uses getStatusChipColor mapping
- Project card hover: card lifts (transform: translateY(-2px)) and shadow increases
- Category selector: selecting a category animates border and adds background tint

#### 9c. E2E UI Automation Tests
- Create new project -> "Project created!" snackbar appears at bottom center -> auto-dismisses after 3s
- Create new room -> "Room added!" snackbar appears
- Upload photo -> "Photo uploaded!" snackbar appears
- Delete photo -> "Photo deleted" snackbar appears
- Generate visualization -> "Visualization started" snackbar appears
- Post comment -> "Comment posted" snackbar appears
- Create share link -> "Link created" snackbar appears
- Delete design -> "Design deleted" snackbar appears
- Navigate to project detail with invalid ID -> ErrorState displays with "Project not found" and retry button
- Click retry on ErrorState -> loading state appears -> re-fetches
- Dashboard: project with ACTIVE status shows green Chip
- Dashboard: project with COMPLETED status shows blue Chip
- Projects list: hover over project card -> card lifts visually
- Category selector: click category -> border/background transition is smooth (visual regression test)
- Landing page: gradient background renders (visual regression test)
- Landing page: 3 feature cards visible below CTA
- Landing page: feature cards responsive — stacked on mobile, row on tablet+
- Profile page: save name -> snackbar appears (no inline Alert)
- Trigger 4+ snackbars rapidly -> only 3 visible simultaneously (oldest dismissed)

### 10. Verification Criteria
- [ ] notistack@^3.0.1 installed in apps/web/package.json
- [ ] AppSnackbarProvider wraps children in root layout.tsx
- [ ] useNotify() hook exists at apps/web/lib/use-notify.ts
- [ ] SnackbarProvider configured: maxSnack=3, autoHideDuration=3000, anchorOrigin bottom-center
- [ ] Project create shows "Project created!" snackbar on success
- [ ] Room add shows "Room added!" snackbar on success
- [ ] Photo upload shows "Photo uploaded!" snackbar on success
- [ ] Photo delete shows "Photo deleted" snackbar on success
- [ ] Budget add shows "Budget item added" snackbar on success
- [ ] Budget delete shows "Budget item deleted" snackbar on success
- [ ] Comment post shows "Comment posted" snackbar on success
- [ ] Share link create shows "Link created" snackbar on success
- [ ] Design generate shows "Visualization started" snackbar on success
- [ ] Design delete shows "Design deleted" snackbar on success
- [ ] Profile name save shows "Name updated!" snackbar (no inline Alert)
- [ ] Account delete shows "Account deleted" snackbar
- [ ] All mutation errors show error snackbar with message
- [ ] Error snackbar autoHideDuration is 5000ms (longer than success)
- [ ] ErrorState component exists at apps/web/components/ui/error-state.tsx
- [ ] ErrorState renders icon, message, and retry button
- [ ] Project detail uses ErrorState (not plain Typography) for errors
- [ ] Room detail uses ErrorState for errors
- [ ] Design detail uses ErrorState for errors
- [ ] ErrorState retry button triggers data re-fetch
- [ ] getStatusChipColor() exists at apps/web/lib/status-colors.ts
- [ ] Dashboard project Chips use getStatusChipColor (correct colors per status)
- [ ] Projects list Chips use getStatusChipColor
- [ ] Project detail status Chip uses getStatusChipColor
- [ ] Design card status Chip uses getStatusChipColor
- [ ] Dashboard project cards have hover lift (translateY(-2px) + boxShadow 3)
- [ ] Projects list cards have hover lift
- [ ] Project detail room cards have hover lift
- [ ] Design card has hover lift
- [ ] All card hover transitions are 200ms
- [ ] Category selector has transition: 'all 0.2s' on Card
- [ ] Category selector selected state has background tint (alpha color)
- [ ] Project detail share button is labeled "Share" with ShareIcon (not icon-only)
- [ ] Landing page has gradient background (primary to secondary, 135deg)
- [ ] Landing page text is white/readable on gradient
- [ ] Landing page has 3 feature highlight cards (AI Visualization, Room Budgeting, Share & Collaborate)
- [ ] Feature cards are responsive: stacked on mobile, row on sm+
- [ ] Maximum 3 snackbars shown simultaneously (P3-E2)
- [ ] No TypeScript errors after all changes
