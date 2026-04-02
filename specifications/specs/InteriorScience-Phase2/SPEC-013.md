# SPEC-013 — Budget & Templates UI

**Parent Feature:** InteriorScience Phase 2
**Spec Number:** 013 of 016 (Phase 2: 4 of 7)
**Prerequisites:** SPEC-010

## Status: Not Started

### 1. Objective

Build the budget management UI (summary visualizations and line-item editor) and rewrite the templates library page to fetch real data with room-type filtering. Seed the database with 12 starter templates.

- **Before:** Budget pages are placeholder. Templates library page is static/empty. No Recharts integration.
- **After:** Project detail shows a budget summary with pie/bar charts (Recharts). Room detail includes a budget editor for adding/editing/deleting line items. Templates library displays a filterable grid of 12 seeded templates.
- **Success criteria:** Budget summary renders category breakdown with progress bars and charts. Line items can be created, edited, and deleted. Templates page shows 12 templates filterable by room type. Recharts loads via dynamic import (no SSR).

### 2. Architecture

```
Budget UI:
  Project Detail Page (/projects/:id)
    └── budget-summary.tsx (embedded section)
        ├── Fetch GET /api/projects/:id/budget
        ├── Overall progress bar (spent vs total budget)
        ├── Category breakdown table
        └── Recharts PieChart + BarChart (dynamic import, ssr:false)

  Room Detail Page (/projects/:id/rooms/:roomId)
    └── budget-editor.tsx (embedded section)
        ├── Fetch GET /api/rooms/:roomId/budget
        ├── Line item table (description, category, amount, status)
        ├── Add item: POST /api/rooms/:roomId/budget/items
        ├── Edit item: inline editing
        └── Delete item: DELETE /api/budgets/items/:id

Templates UI:
  Library Page (/library)
    └── Fetch GET /api/templates?roomType=X
        ├── Room type filter tabs (All, Living Room, Bedroom, Kitchen, Bathroom, Office, Dining)
        ├── Template cards in responsive grid (image, name, room type, description)
        └── Click card → navigate to template detail or apply flow

Seed Data:
  prisma/seed.ts → 12 templates (2 per room type: LIVING_ROOM, BEDROOM, KITCHEN, BATHROOM, OFFICE, DINING_ROOM)
```

### 3. Design Constraints

- P2-DC-2: MUI component patterns — tree-shaking imports, mobile-first responsive layout, 48x48dp touch targets
- P2-DC-4: Recharts must be loaded via next/dynamic with ssr:false to avoid SSR hydration issues
- P2-DC-8: Use window.location.hostname for direct API calls (media/image URLs)
- P2-DC-9: All Phase 1 constraints (DC-1 to DC-14) remain in effect

### 4. Detailed Design

#### 4a. Database / Schema Changes

**File: `prisma/seed.ts`** (MODIFY)
- Add 12 template seed records (2 per room type)
- Each template: name, description, roomType, previewImageUrl (placeholder), styleConfig JSON
- Room types: LIVING_ROOM, BEDROOM, KITCHEN, BATHROOM, OFFICE, DINING_ROOM
- Guard with upsert to avoid duplicates on re-seed

#### 4b. Backend / API Changes

- None — all endpoints already exist:
  - GET /api/projects/:id/budget — returns project budget summary
  - GET /api/rooms/:roomId/budget — returns room budget with line items
  - POST /api/rooms/:roomId/budget/items — create line item
  - DELETE /api/budgets/items/:id — delete line item
  - GET /api/templates — returns templates, supports ?roomType= filter

#### 4c. Frontend / UI Changes

**File: `apps/web/components/budget/budget-summary.tsx`** (CREATE)
- Props: projectId: string
- Fetches GET /api/projects/:id/budget via apiClient
- Displays: total budget, total spent, remaining, percentage used
- Overall LinearProgress bar (MUI) — green < 80%, yellow 80-95%, red > 95%
- Category breakdown: MUI Table with category name, allocated, spent, remaining per category
- Recharts integration (loaded via dynamic import wrapper):
  - PieChart: spending by category
  - BarChart: allocated vs spent per category
- Loading skeleton while fetching
- Empty state if no budget set

**File: `apps/web/components/budget/budget-charts.tsx`** (CREATE)
- Wrapped component exported via next/dynamic with { ssr: false }
- Contains PieChart and BarChart from recharts
- Props: categories array with { name, allocated, spent, color }
- Responsive container (ResponsiveContainer from recharts)

**File: `apps/web/components/budget/budget-editor.tsx`** (CREATE)
- Props: roomId: string
- Fetches GET /api/rooms/:roomId/budget via apiClient
- Displays line items in MUI Table: category (chip), estimated amount (currency formatted), actual amount (currency formatted), notes
- Add button opens inline form row or MUI Dialog: category (select), estimatedAmount (number), actualAmount (number, optional), notes (text, optional)
- Submit → POST /api/rooms/:roomId/budget/items with `{ category, estimatedAmount, actualAmount?, notes? }` → refresh list
- Note: The backend endpoint is an upsert — it creates or updates a budget item per category. One item per (room, category) combination.
- Each row has edit (inline toggle) and delete (IconButton with confirmation) actions
- Delete → DELETE /api/budgets/items/:id → refresh list
- Error handling: wrap all API calls in try/catch. On failure, show MUI Snackbar with error message (e.g., "Failed to save budget item"). Do not clear form on error so user can retry.
- Loading skeleton while initial fetch is in progress, empty state message when no items exist
- Disable submit button while request is in-flight to prevent double-submit

**File: `apps/web/app/(main)/projects/[id]/page.tsx`** (MODIFY)
- Import and embed BudgetSummary component in a collapsible section below rooms list

**File: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx`** (MODIFY)
- Import and embed BudgetEditor component in a section below photos

**File: `apps/web/app/(main)/library/page.tsx`** (REWRITE)
- Fetch templates from GET /api/templates
- Tab bar at top with room type filters: All | Living Room | Bedroom | Kitchen | Bathroom | Office | Dining Room
- Selecting a tab re-fetches with ?roomType= query param
- Template cards in MUI Grid (responsive: xs=12, sm=6, md=4, lg=3)
- Each card: Card with CardMedia (preview image), CardContent (name, room type chip, description truncated)
- Click card → future: apply template flow (for now, show Snackbar "Template preview coming soon")
- Loading skeleton grid, empty state per filter

#### 4d. Shared / Cross-cutting Changes

**File: `apps/web/package.json`** (MODIFY)
- Add dependency: recharts

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| CREATE | apps/web/components/budget/budget-summary.tsx | Budget summary with progress bars and charts | Med |
| CREATE | apps/web/components/budget/budget-charts.tsx | Recharts pie/bar charts, dynamic import wrapper | Med |
| CREATE | apps/web/components/budget/budget-editor.tsx | Line item CRUD editor for room budgets | Med |
| REWRITE | apps/web/app/(main)/library/page.tsx | Templates grid with room type filter tabs | Med |
| MODIFY | apps/web/app/(main)/projects/[id]/page.tsx | Embed BudgetSummary component | Low |
| MODIFY | apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx | Embed BudgetEditor component | Low |
| MODIFY | apps/web/package.json | Add recharts dependency | Low |
| MODIFY | prisma/seed.ts | Add 12 template seed records | Low |

### 6. Dependency & Reference Check

#### Frontend Wiring
- New npm package: recharts (add to apps/web/package.json)
- budget-summary.tsx uses apiClient from lib/api-client.ts (existing)
- budget-charts.tsx uses next/dynamic for SSR-safe Recharts loading
- budget-editor.tsx uses apiClient for POST/DELETE calls
- Library page uses apiClient for GET /api/templates
- All components use MUI imports (already installed)

#### Backend Wiring
- GET /api/projects/:id/budget — exists in budgets module
- GET /api/rooms/:roomId/budget — exists in budgets module
- POST /api/rooms/:roomId/budget/items — exists in budgets module
- DELETE /api/budgets/items/:id — exists in budgets module
- GET /api/templates — exists in templates module
- prisma/seed.ts — exists, needs template data appended

### 7. Implementation Plan

**Step 1:** Add recharts dependency
- File: apps/web/package.json
- Action: modify
- Details: Add recharts to dependencies. Run pnpm install.

**Step 2:** Create budget charts component (dynamic import wrapper)
- File: apps/web/components/budget/budget-charts.tsx
- Action: create
- Details: Recharts PieChart + BarChart wrapped in ResponsiveContainer. Export via next/dynamic with ssr:false.

**Step 3:** Create budget summary component
- File: apps/web/components/budget/budget-summary.tsx
- Action: create
- Details: Fetch project budget, display progress bar, category table, and dynamic-imported charts.

**Step 4:** Create budget editor component
- File: apps/web/components/budget/budget-editor.tsx
- Action: create
- Details: Line item table with add/edit/delete. Inline form or dialog for adding items.

**Step 5:** Embed budget components in project and room pages
- File: apps/web/app/(main)/projects/[id]/page.tsx
- File: apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx
- Action: modify both
- Details: Import and render BudgetSummary (project page) and BudgetEditor (room page) in collapsible sections.

**Step 6:** Add template seed data
- File: prisma/seed.ts
- Action: modify
- Details: Add 12 template records (2 per room type) with upsert. Run prisma db seed.

**Step 7:** Rewrite library page
- File: apps/web/app/(main)/library/page.tsx
- Action: rewrite
- Details: Fetch from GET /api/templates with room type filter tabs. Responsive card grid.

### 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Recharts bundle size bloats client JS | Med | Dynamic import with ssr:false ensures code-splitting. Only loaded on budget pages. |
| Budget endpoint returns empty for projects without budget | Low | Show friendly empty state: "No budget set yet. Add line items in room pages." |
| Template seed images are placeholders | Low | Use gradient placeholder images or MUI Skeleton. Replace when real templates are created. |
| Recharts hydration mismatch on SSR | Med | P2-DC-4 enforced — next/dynamic with ssr:false completely avoids SSR for chart components. |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests
- BudgetSummary renders progress bar with correct percentage
- BudgetSummary shows red color when budget exceeds 95%
- BudgetEditor renders line items from mock data
- BudgetEditor add form validates required fields (description, amount)
- BudgetCharts renders PieChart and BarChart with provided data
- Library page renders template cards from mock data
- Library page filters templates when tab is selected

#### 9b. Integration Tests
- BudgetSummary fetches from /api/projects/:id/budget and renders chart data
- BudgetEditor creates a line item via POST and refreshes the list
- BudgetEditor deletes a line item via DELETE and removes from list
- Library page fetches templates from /api/templates
- Library page sends ?roomType= param when filter tab selected
- Template seed creates 12 records in database

#### 9c. E2E UI Automation Tests
- Navigate to project detail → budget summary section visible with charts
- Navigate to room detail → budget editor visible with add button
- Add a budget line item → appears in table → total updates
- Delete a budget line item → removed from table → total updates
- Navigate to /library → 12 template cards visible
- Click "Kitchen" tab → only kitchen templates shown
- Click "All" tab → all 12 templates shown

### 10. Verification Criteria
- [ ] recharts is installed and importable
- [ ] Budget summary renders on project detail page with progress bar
- [ ] Recharts pie chart and bar chart render (no SSR errors)
- [ ] Category breakdown table shows correct allocated/spent/remaining
- [ ] Budget editor renders on room detail page
- [ ] Can add a new budget line item via the editor
- [ ] Can delete a budget line item via the editor
- [ ] Library page loads and displays template cards in a grid
- [ ] Room type filter tabs work (filter API call made, cards update)
- [ ] 12 template records exist after running prisma db seed
- [ ] No hydration mismatch warnings in browser console
- [ ] Mobile layout is responsive (cards stack vertically)
