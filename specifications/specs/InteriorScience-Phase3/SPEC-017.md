# SPEC-017 — Design System & UX Foundation

**Parent Feature:** InteriorScience Phase 3, Spec 017 of 022 (Phase 3: 1 of 6)
**Prerequisites:** None (Phase 2 complete)
**Covers:** P3-F1 (partial — foundation layer)

## Status: Not Started

**Priority Note:** This is the TOP PRIORITY spec. All other Phase 3 specs (SPEC-018 through SPEC-021) depend on it.

### 1. Objective

Establish the foundational design system and UX infrastructure for Phase 3. This includes proper font loading, an enhanced MUI theme with spacing/color/shadow scales, a reusable AppHeader component, skeleton loading states, bottom tab fixes, responsive photo gallery, and main layout restructuring.

- **Before:** Inter font referenced as a string but never loaded via next/font (FOUT risk). Theme lacks spacing scale, status color mapping, and shadow hierarchy. No consistent page header component — each page renders its own title/actions. No skeleton loaders (pages show CircularProgress spinner). Bottom tabs have undersized labels and an oversized capture icon. Photo gallery is hardcoded to 3 columns on all viewports. Notification bell floats in a disconnected bar above content.
- **After:** Inter loaded via next/font/google with zero FOUT. Theme defines spacing scale (4/8/16/24/32), status chip color mapping (Draft/Active/Completed/Archived), shadow hierarchy (sm/md/lg), and card elevation defaults. AppHeader component provides consistent page titles, optional breadcrumbs, optional action buttons, and a back button on sub-pages — used across all (main) pages. Skeleton cards replace spinners in dashboard and projects list. Bottom tabs have readable 0.75rem labels, normalized icon sizes, and active color highlighting. Photo gallery is responsive (2/3/4 columns by breakpoint). NotificationBell is integrated into AppHeader.
- **Success criteria:** Lighthouse font-display check passes (no FOUT). All (main) pages use AppHeader. Skeleton loaders appear in dashboard/projects list during loading. Bottom tab label font is 0.75rem, capture icon matches other icons in size. Photo gallery shows 2 cols on mobile, 3 on tablet, 4 on desktop. NotificationBell renders inside AppHeader, not in a separate floating bar.

### 2. Architecture

```
Font Loading (layout.tsx):
  └── next/font/google → Inter({ subsets: ['latin'], variable: '--font-inter' })
      └── className applied to <html> or <body>
      └── theme.ts references CSS variable instead of string "Inter"

Theme Enhancement (theme.ts):
  ├── spacing: (factor) => factor * 4  (already MUI default, but explicit scale documented)
  ├── customSpacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 }
  ├── statusColors: { DRAFT: 'default', ACTIVE: 'success', COMPLETED: 'info', ARCHIVED: 'warning' }
  ├── shadows: custom sm/md/lg hierarchy on top of MUI defaults
  └── MuiCard default elevation: 1 (subtle shadow)

AppHeader (app-header.tsx):
  ├── Props: title (string), breadcrumbs? (Array<{label, href?}>), actions? (ReactNode), showBack? (boolean)
  ├── Renders: Box with consistent padding
  │   ├── Row 1 (if breadcrumbs): MUI Breadcrumbs
  │   ├── Row 2: Back button (if showBack) + Title (h5) + spacer + actions slot + NotificationBell
  │   └── Responsive: breadcrumbs collapse to parent+current on mobile
  └── Used by: all (main) pages

Main Layout Update (layout.tsx):
  ├── Remove standalone NotificationBell bar
  ├── AppHeader integration point (pages pass props via context or direct rendering)
  └── Children render below AppHeader

Skeleton Card (skeleton-card.tsx):
  ├── MUI Skeleton matching Card dimensions (height ~120px for project cards)
  ├── Variant: rectangular with rounded corners matching theme.shape.borderRadius
  └── Used in: dashboard (6 skeleton cards), projects list (6 skeleton cards)

Bottom Tabs Fix (bottom-tabs.tsx):
  ├── Label font: 0.7rem → 0.75rem
  ├── Capture icon: remove fontSize: 36, use default icon size (24px like others)
  └── Active color: add selectedItemColor to BottomNavigation sx

Photo Gallery Responsive (photo-gallery.tsx):
  ├── useMediaQuery(theme.breakpoints.down('sm')) → cols = 2
  ├── useMediaQuery(theme.breakpoints.between('sm', 'md')) → cols = 3
  └── Default (md+) → cols = 4
```

### 3. Design Constraints

- **P3-DC-1 (WCAG AA):** All text must meet 4.5:1 contrast ratio. AppHeader title, breadcrumb links, and action buttons must be accessible. Skeleton loaders must have sufficient contrast against background.
- **P3-DC-2 (Skeleton CLS prevention):** Skeleton cards must match the exact dimensions of the real cards they replace. Use fixed heights (not auto) to prevent cumulative layout shift when content loads.
- **P3-DC-7 (next/font for Inter):** Inter font must be loaded via next/font/google — no external CDN link tags. The font CSS variable must be referenced in theme.ts fontFamily. This ensures zero FOUT and optimal loading.
- **P3-DC-10 (Consistent AppHeader):** Every page under (main) must use the AppHeader component for its title area. No page should render its own ad-hoc title/action row.
- **P3-DC-9 (Subtle transitions):** All transitions must be 150-200ms duration. Hover effects on cards, skeleton fade-in, breadcrumb expansion — all must use subtle, non-distracting animation.

### 4. Detailed Design

#### 4a. Database / Schema Changes
- None — this spec is entirely frontend.

#### 4b. Backend / API Changes
- None — this spec is entirely frontend.

#### 4c. Frontend / UI Changes

**File: `apps/web/app/layout.tsx`** (MODIFY)
- Import `Inter` from `next/font/google`
- Initialize: `const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })`
- Add `className={inter.variable}` to the `<html>` element
- This makes the CSS variable `--font-inter` available globally for theme.ts

```tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

// In render:
<html lang="en" className={inter.variable}>
```

**File: `apps/web/app/theme.ts`** (MODIFY)
- Replace fontFamily string `'"Inter", "Roboto", "Helvetica", "Arial", sans-serif'` with `'var(--font-inter), "Roboto", "Helvetica", "Arial", sans-serif'`
- Add custom spacing scale as a theme extension (for documentation/reference; MUI's default spacing is already factor*8, but we add named constants):

```ts
declare module '@mui/material/styles' {
  interface Theme {
    customSpacing: { xs: number; sm: number; md: number; lg: number; xl: number };
    statusColors: Record<string, 'default' | 'success' | 'info' | 'warning' | 'error'>;
  }
  interface ThemeOptions {
    customSpacing?: { xs: number; sm: number; md: number; lg: number; xl: number };
    statusColors?: Record<string, 'default' | 'success' | 'info' | 'warning' | 'error'>;
  }
}
```

- Add to createTheme:
  - `customSpacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 }`
  - `statusColors: { DRAFT: 'default', ACTIVE: 'success', COMPLETED: 'info', ARCHIVED: 'warning' }`
  - Custom shadow entries: override `shadows[1]` (sm: subtle), `shadows[2]` (md: card default), `shadows[3]` (lg: hover/elevated)
  - MuiCard default props: `defaultProps: { elevation: 1 }`

**File: `apps/web/components/ui/app-header.tsx`** (CREATE)
- Props interface:
  ```ts
  interface AppHeaderProps {
    title: string;
    breadcrumbs?: Array<{ label: string; href?: string }>;
    actions?: React.ReactNode;
    showBack?: boolean;
    backHref?: string;
  }
  ```
- Renders a Box with `sx={{ px: 2, pt: 2, pb: 1 }}`
- If breadcrumbs provided: render MUI `<Breadcrumbs>` with `<Link>` for items with href, `<Typography>` for the last item (current page). On mobile (`useMediaQuery(theme.breakpoints.down('sm'))`), collapse to show only parent + current (last 2 items).
- Title row: `display: 'flex', alignItems: 'center', justifyContent: 'space-between'`
  - Left side: optional back button (`<IconButton component={Link} href={backHref}><ArrowBackIcon /></IconButton>`) + `<Typography variant="h5" fontWeight={700}>{title}</Typography>`
  - Right side: `{actions}` slot + `<NotificationBell />`
- Import NotificationBell from `../notifications/notification-bell`

**File: `apps/web/components/ui/skeleton-card.tsx`** (CREATE)
- Props: `variant?: 'project' | 'room'` (default: 'project')
- For 'project' variant: renders a Card-shaped Skeleton with `height: 100`, `borderRadius: 16` (matching theme Card borderRadius), `variant="rectangular"`, wrapped in same Grid sizing as project cards
- For 'room' variant: renders a Card-shaped Skeleton with `height: 88`, `borderRadius: 16`
- Export a `SkeletonGrid` helper that renders a Grid container with N skeleton cards:
  ```ts
  interface SkeletonGridProps {
    count?: number;
    variant?: 'project' | 'room';
    columns?: { xs: number; sm: number };
  }
  ```

**File: `apps/web/components/navigation/bottom-tabs.tsx`** (MODIFY)
- Change label font size from `0.7rem` to `0.75rem`:
  ```
  '& .MuiBottomNavigationAction-label': { fontSize: '0.75rem' }
  ```
- Remove `sx={{ fontSize: 36 }}` from the AddCircleIcon in the Capture tab definition, so it uses the default 24px size like other icons
- Add `sx={{ '& .Mui-selected': { color: 'primary.main' } }}` to the BottomNavigation component to ensure active tab has a visible color highlight (or use the `showLabels` + MUI's built-in selected color)

**File: `apps/web/components/media/photo-gallery.tsx`** (MODIFY)
- Import `useMediaQuery` and `useTheme` from MUI
- Determine responsive column count:
  ```tsx
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const cols = isMobile ? 2 : isTablet ? 3 : 4;
  ```
- Replace hardcoded `cols={3}` in `<ImageList>` with `cols={cols}`

**File: `apps/web/app/(main)/layout.tsx`** (MODIFY)
- Remove the standalone `<Box>` containing `<NotificationBell />` (lines 23-31 of current layout)
- NotificationBell is now rendered inside AppHeader, which individual pages will include
- The layout becomes simpler: just `<Box sx={{ pb: 8 }}>{children}<BottomTabs /></Box>`

**File: `apps/web/app/(main)/dashboard/page.tsx`** (MODIFY)
- Import and use `AppHeader` with `title="Dashboard"`
- Replace the manual title Box with `<AppHeader title="Dashboard" />`
- Import and use `SkeletonGrid` for loading state instead of `CircularProgress`:
  ```tsx
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ pt: 1 }}>
        <AppHeader title="Dashboard" />
        <SkeletonGrid count={6} columns={{ xs: 12, sm: 6 }} />
      </Container>
    );
  }
  ```

**File: `apps/web/app/(main)/projects/page.tsx`** (MODIFY)
- Import and use `AppHeader` with `title="My Projects"`
- Replace the manual title Box with `<AppHeader title="My Projects" />`
- Import and use `SkeletonGrid` for loading state instead of `CircularProgress`

**File: `apps/web/app/(main)/projects/[id]/page.tsx`** (MODIFY)
- Import and use `AppHeader` with `title={project.name}`, `showBack`, `backHref="/projects"`, and actions containing the Share button
- Replace the manual title/share row with AppHeader
- Note: AppHeader renders after loading, since title depends on project data; loading state still uses CircularProgress (or SkeletonGrid for rooms)

**File: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx`** (MODIFY)
- Import and use `AppHeader` with `title={room.name}`, `showBack`, `backHref={/projects/${projectId}}`, breadcrumbs: `[{ label: 'Projects', href: '/projects' }, { label: project.name, href: /projects/${projectId} }, { label: room.name }]`
- Replace the manual title area with AppHeader

**File: `apps/web/app/(main)/profile/page.tsx`** (MODIFY)
- Import and use `AppHeader` with `title="Profile"`
- Replace the manual title Typography with `<AppHeader title="Profile" />`

**File: `apps/web/app/(main)/capture/page.tsx`** (MODIFY)
- Import and use `AppHeader` with `title="Capture"`

**File: `apps/web/app/(main)/library/page.tsx`** (MODIFY)
- Import and use `AppHeader` with `title="Library"`

#### 4d. Shared / Cross-cutting Changes
- next/font/google is a built-in Next.js feature — no new npm dependency required.
- The `--font-inter` CSS variable is set on `<html>` and inherited by all components via the theme.
- AppHeader becomes the standard pattern for all page headers going forward. Any new pages added in Phase 3 (SPEC-019 through SPEC-022) must also use AppHeader.

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| MODIFY | apps/web/app/layout.tsx | Add Inter font via next/font/google, className on html | Low |
| MODIFY | apps/web/app/theme.ts | Font variable, spacing scale, status colors, shadows, card elevation | Med |
| CREATE | apps/web/components/ui/app-header.tsx | Reusable AppHeader with title, breadcrumbs, actions, back, notification bell | Med |
| CREATE | apps/web/components/ui/skeleton-card.tsx | Skeleton card and SkeletonGrid for loading states | Low |
| MODIFY | apps/web/components/navigation/bottom-tabs.tsx | Label font 0.75rem, normalize capture icon, active color | Low |
| MODIFY | apps/web/components/media/photo-gallery.tsx | Responsive columns via useMediaQuery (2/3/4) | Low |
| MODIFY | apps/web/app/(main)/layout.tsx | Remove standalone NotificationBell bar | Low |
| MODIFY | apps/web/app/(main)/dashboard/page.tsx | Use AppHeader, SkeletonGrid for loading | Low |
| MODIFY | apps/web/app/(main)/projects/page.tsx | Use AppHeader, SkeletonGrid for loading | Low |
| MODIFY | apps/web/app/(main)/projects/[id]/page.tsx | Use AppHeader with back/actions | Med |
| MODIFY | apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx | Use AppHeader with breadcrumbs/back | Med |
| MODIFY | apps/web/app/(main)/profile/page.tsx | Use AppHeader | Low |
| MODIFY | apps/web/app/(main)/capture/page.tsx | Use AppHeader | Low |
| MODIFY | apps/web/app/(main)/library/page.tsx | Use AppHeader | Low |

### 6. Dependency & Reference Check

#### Frontend Wiring
- `next/font/google` — built into Next.js 15 (already installed). No new dependency.
- `@mui/material` — already installed. Breadcrumbs, Skeleton, useMediaQuery, useTheme all included.
- `AppHeader` imports `NotificationBell` from `../notifications/notification-bell` — already exists.
- `AppHeader` imports `ArrowBackIcon` from `@mui/icons-material/ArrowBack` — already installed.
- `AppHeader` imports `Link` from `next/link` — already available.
- `SkeletonCard` uses `Skeleton`, `Card`, `Grid` from `@mui/material` — already installed.
- `photo-gallery.tsx` uses `useMediaQuery`, `useTheme` from `@mui/material` — already installed.
- Theme type augmentation via `declare module '@mui/material/styles'` — TypeScript module augmentation, no dependency.

#### Backend Wiring
- No backend changes — this is a frontend-only spec.

#### Cross-Page Impact
- Removing NotificationBell from `(main)/layout.tsx` means it MUST be present in AppHeader. If any page fails to render AppHeader, that page loses the notification bell. Mitigation: all (main) pages are updated to use AppHeader in this spec.

### 7. Implementation Plan

**Step 1:** Font loading setup
- File: apps/web/app/layout.tsx
- Action: modify
- Details: Import Inter from next/font/google. Initialize with subsets and display:'swap'. Add className={inter.variable} to html element.

**Step 2:** Theme enhancement
- File: apps/web/app/theme.ts
- Action: modify
- Details: Update fontFamily to use CSS variable. Add TypeScript module augmentation for customSpacing and statusColors. Add customSpacing, statusColors, shadow overrides, and MuiCard defaultProps to createTheme.

**Step 3:** Create AppHeader component
- File: apps/web/components/ui/app-header.tsx
- Action: create
- Details: Reusable header with title (h5), optional breadcrumbs (MUI Breadcrumbs, collapse on mobile), optional actions slot, optional back button, integrated NotificationBell.

**Step 4:** Create SkeletonCard component
- File: apps/web/components/ui/skeleton-card.tsx
- Action: create
- Details: SkeletonCard matching card dimensions. SkeletonGrid helper rendering N cards in a Grid.

**Step 5:** Fix bottom tabs
- File: apps/web/components/navigation/bottom-tabs.tsx
- Action: modify
- Details: Label font 0.7rem -> 0.75rem. Remove fontSize:36 from capture icon. Ensure active color highlight.

**Step 6:** Make photo gallery responsive
- File: apps/web/components/media/photo-gallery.tsx
- Action: modify
- Details: Import useMediaQuery and useTheme. Calculate cols based on breakpoint. Replace hardcoded cols={3}.

**Step 7:** Update main layout
- File: apps/web/app/(main)/layout.tsx
- Action: modify
- Details: Remove the Box containing NotificationBell. Simplify to just pb:8 wrapper + children + BottomTabs.

**Step 8:** Update dashboard page
- File: apps/web/app/(main)/dashboard/page.tsx
- Action: modify
- Details: Replace manual title with AppHeader. Replace CircularProgress loading with SkeletonGrid.

**Step 9:** Update projects list page
- File: apps/web/app/(main)/projects/page.tsx
- Action: modify
- Details: Replace manual title with AppHeader. Replace CircularProgress loading with SkeletonGrid.

**Step 10:** Update project detail page
- File: apps/web/app/(main)/projects/[id]/page.tsx
- Action: modify
- Details: Replace manual title/share row with AppHeader. Pass showBack, backHref="/projects", actions={share button}.

**Step 11:** Update room detail page
- File: apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx
- Action: modify
- Details: Replace manual title with AppHeader. Pass breadcrumbs, showBack, backHref.

**Step 12:** Update remaining pages (profile, capture, library)
- Files: apps/web/app/(main)/profile/page.tsx, capture/page.tsx, library/page.tsx
- Action: modify each
- Details: Replace manual title Typography with AppHeader.

### 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| next/font/google fails to load Inter in production | Low | next/font self-hosts fonts at build time. The display:'swap' ensures fallback renders immediately. Verified by Lighthouse audit. |
| CSS variable --font-inter not inherited by MUI ThemeProvider | Med | MUI's createTheme accepts CSS variables in fontFamily string. The variable is set on html element, which is an ancestor of all MUI components. Test in dev that text renders in Inter. |
| Removing NotificationBell from layout breaks notification access on pages that forget AppHeader | Med | All (main) pages are explicitly updated in this spec. Verification criteria includes checking every page has AppHeader. |
| SkeletonCard height mismatch causes CLS when real cards load | Med | P3-DC-2: Skeleton heights are matched to real card heights (100px for project, 88px for room). Visual comparison during testing. |
| Breadcrumb overflow on deep routes (project > room > design) | Low | Breadcrumbs collapse on mobile to parent+current. On desktop, full path shown — MUI Breadcrumbs handles truncation. |
| useMediaQuery SSR mismatch (server renders default, client renders responsive) | Low | Components using useMediaQuery are client components ('use client'). Initial render uses default (server), then hydrates. MUI's useMediaQuery handles SSR gracefully with noSsr option if needed. |
| Theme module augmentation TypeScript errors | Low | Module augmentation is a standard TypeScript pattern. Placed at top of theme.ts file. If IDE caching issues, restart TS server. |
| Bottom tabs active color conflict with MUI BottomNavigation defaults | Low | MUI BottomNavigation already supports selectedItemColor. Explicitly set via sx to ensure primary.main is used. |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests
- AppHeader renders title as h5 Typography
- AppHeader renders breadcrumbs when provided
- AppHeader hides breadcrumbs when not provided
- AppHeader renders back button when showBack=true
- AppHeader does not render back button when showBack=false
- AppHeader renders actions slot content
- AppHeader renders NotificationBell
- SkeletonCard renders MUI Skeleton with correct variant and height
- SkeletonGrid renders the specified count of SkeletonCards
- SkeletonGrid uses correct Grid column sizing
- Theme statusColors maps DRAFT to 'default', ACTIVE to 'success', COMPLETED to 'info', ARCHIVED to 'warning'
- Theme fontFamily contains 'var(--font-inter)'
- Theme customSpacing values are { xs:4, sm:8, md:16, lg:24, xl:32 }

#### 9b. Integration Tests
- Dashboard page shows SkeletonGrid while loading, then real content
- Projects page shows SkeletonGrid while loading, then real content
- Project detail page renders AppHeader with project name and share action
- Room detail page renders AppHeader with breadcrumbs (Projects > Project Name > Room Name)
- Profile page renders AppHeader with "Profile" title
- Bottom tabs label font is 0.75rem (computed style check)
- Bottom tabs capture icon size matches other icons (no oversized icon)
- Photo gallery renders 2 columns when viewport < 600px
- Photo gallery renders 3 columns when viewport 600-900px
- Photo gallery renders 4 columns when viewport > 900px
- NotificationBell appears inside AppHeader on all (main) pages
- NotificationBell does NOT appear as a standalone bar in main layout

#### 9c. E2E UI Automation Tests
- Navigate to /dashboard -> AppHeader shows "Dashboard" + NotificationBell visible
- Navigate to /projects -> AppHeader shows "My Projects" + skeleton cards appear during load
- Navigate to /projects/:id -> AppHeader shows project name + back button + share action
- Click back button on project detail -> navigates to /projects
- Navigate to /projects/:id/rooms/:roomId -> breadcrumbs show Projects > ProjectName > RoomName
- Click "Projects" breadcrumb -> navigates to /projects
- Resize viewport to 375px width -> photo gallery shows 2 columns
- Resize viewport to 768px width -> photo gallery shows 3 columns
- Resize viewport to 1200px width -> photo gallery shows 4 columns
- Bottom tabs -> capture icon is same visual size as other tab icons
- All text passes contrast ratio check (axe-core audit in E2E)

### 10. Verification Criteria
- [ ] Inter font loads via next/font/google (check page source: no external font link tags, CSS variable --font-inter present on html element)
- [ ] No FOUT visible on page load (font-display: swap confirmed in computed styles)
- [ ] theme.ts fontFamily references var(--font-inter)
- [ ] theme.ts customSpacing contains xs:4, sm:8, md:16, lg:24, xl:32
- [ ] theme.ts statusColors maps DRAFT/ACTIVE/COMPLETED/ARCHIVED correctly
- [ ] theme.ts shadows[1], shadows[2], shadows[3] are customized
- [ ] MuiCard default elevation is 1
- [ ] AppHeader component exists at apps/web/components/ui/app-header.tsx
- [ ] AppHeader renders title as h5 with fontWeight 700
- [ ] AppHeader renders MUI Breadcrumbs when breadcrumbs prop provided
- [ ] AppHeader breadcrumbs collapse to parent+current on mobile viewport
- [ ] AppHeader renders back button (ArrowBackIcon) when showBack=true
- [ ] AppHeader renders actions slot to the right of the title
- [ ] AppHeader includes NotificationBell on the right side
- [ ] SkeletonCard exists at apps/web/components/ui/skeleton-card.tsx
- [ ] SkeletonCard height matches real card height (no CLS on load)
- [ ] Dashboard page uses AppHeader with title="Dashboard"
- [ ] Dashboard page shows SkeletonGrid (not CircularProgress) while loading
- [ ] Projects list page uses AppHeader with title="My Projects"
- [ ] Projects list page shows SkeletonGrid while loading
- [ ] Project detail page uses AppHeader with project name, showBack, share action
- [ ] Room detail page uses AppHeader with breadcrumbs and showBack
- [ ] Profile page uses AppHeader with title="Profile"
- [ ] Capture page uses AppHeader with title="Capture"
- [ ] Library page uses AppHeader with title="Library"
- [ ] Main layout no longer has standalone NotificationBell bar
- [ ] Bottom tabs label font is 0.75rem
- [ ] Bottom tabs capture icon has no fontSize:36 override (renders at default 24px)
- [ ] Bottom tabs active tab has primary color highlight
- [ ] Photo gallery shows 2 cols on <600px viewport
- [ ] Photo gallery shows 3 cols on 600-900px viewport
- [ ] Photo gallery shows 4 cols on >900px viewport
- [ ] All pages under (main) render AppHeader (visual check on each route)
- [ ] No TypeScript errors after theme type augmentation
