# SPEC-008 — Design Templates & Budget Tracking

**Parent Feature:** InteriorScience MVP
**Spec Number:** 008 of 9
**Prerequisites:** SPEC-003 (for templates browsing and budget tracking); SPEC-007 (for template "Apply to Room" functionality, which requires Fabric.js canvas state loading)

## Status: Not Started

### 1. Objective

Implement the design templates library (browsable by room type and category with pre-built design templates) and the budget tracking system (project-level, room-level, and category-level budgets with visual summaries and charts).

- **Before:** Projects and rooms exist but no templates for inspiration and no budget tracking
- **After:** Users can browse design templates organized by room type and category, apply templates to their rooms. Budget tracking at project/room/category level with charts and progress bars.
- **Success criteria:** Template library browsable with filtering. Budget can be set and tracked at all levels. Charts show budget breakdown visually. Templates can be applied to rooms.

### 2. Architecture

```
Design Templates Flow:
  User navigates to "Library" tab (bottom nav)
    → Browse templates by room type (bathroom, kitchen, etc.)
    → Filter by category (civil, furnishings, etc.)
    → View template detail (thumbnail, description, tags)
    → "Apply to Room" → select project → select room → template's canvasState loaded into Design record via Fabric.js (requires SPEC-007 canvas infrastructure) → user can then trigger visualization or edit in canvas editor

Budget Tracking Flow:
  Project level: overall budget set during creation
    → Auto-calculated from room budgets
    → Visual progress bar: spent vs. budget
  
  Room level: budget per room
    → Breakdown by category (civil: ₹X, furnishings: ₹Y, etc.)
    → Track estimated vs. actual amounts
  
  Category level: budget per category within room
    → Individual line items
    → Edit estimated and actual amounts

Budget Summary:
  ┌──────────────────────────┐
  │ Project Budget: ₹500,000 │
  │ ████████░░░░ 65% spent   │
  ├──────────────────────────┤
  │ By Room:                 │
  │  Bathroom  ████░░ 70%    │
  │  Kitchen   ███░░░ 55%    │
  │  Bedroom   ██░░░░ 40%    │
  ├──────────────────────────┤
  │ By Category:             │
  │  [Pie chart: Civil 40%,  │
  │   Furnishings 30%,       │
  │   Bathroom 20%,          │
  │   Kitchen 10%]           │
  └──────────────────────────┘
```

### 3. Design Constraints

- DC-13: Time to Interactive <3 seconds. Charts must be lightweight.
- DC-14: All endpoints validate input via class-validator DTOs.
- PRD F9: Pre-built templates organized by room type and category. Browsable and applicable.
- PRD F10: Budget per project, per room, per category. Track estimated vs. actual. Visual summary with charts.
- PRD §6: Design Library is a main navigation section (bottom tab).
- TRD E2: Template content is a dependency — need initial seed content.

### 4. Detailed Design

#### 4a. Database / Schema Changes
- No new schema — Template, ProjectBudget, RoomBudget models from SPEC-002
- Seed templates during database seeding

#### 4b. Backend / API Changes

**File: `apps/api/src/templates/templates.module.ts`**
- Imports: PrismaModule
- Providers: TemplatesService
- Controllers: TemplatesController

**File: `apps/api/src/templates/templates.controller.ts`**
- GET /api/templates — List templates (paginated, filterable by roomType, category, tags)
- GET /api/templates/:id — Get template detail
- POST /api/templates — Create template (architect users, admin)
- GET /api/templates/featured — Featured/popular templates

**File: `apps/api/src/templates/templates.service.ts`**
- findAll(): Paginated list with filters (roomType, category, tags, search)
- findById(): Template detail with canvas state
- create(): Create new template (for architect users)
- getFeatured(): Curated featured templates

**File: `apps/api/src/budgets/budgets.module.ts`**
- Imports: PrismaModule
- Providers: BudgetsService
- Controllers: BudgetsController

**File: `apps/api/src/budgets/budgets.controller.ts`**
- GET /api/projects/:id/budget — Get project budget summary (aggregated)
- PUT /api/projects/:id/budget — Set/update project overall budget
- GET /api/rooms/:id/budget — Get room budget breakdown by category
- PUT /api/rooms/:id/budget — Set/update room budget items
- POST /api/rooms/:id/budget/items — Add budget line item
- PATCH /api/budgets/items/:id — Update budget item (estimated/actual)
- DELETE /api/budgets/items/:id — Remove budget item

**File: `apps/api/src/budgets/budgets.service.ts`**
- getProjectBudget(): Aggregate from room budgets, calculate totals, percentages
- getRoomBudget(): Budget items by category for a room
- upsertBudgetItem(): Create or update a budget line item
- deleteBudgetItem(): Remove a budget item
- calculateCategoryTotals(): Sum by category across all rooms in project

#### 4c. Frontend / UI Changes

**File: `apps/web/app/(main)/library/page.tsx`**
- Template library page (bottom tab "Library")
- Room type tabs at top: All, Bathroom, Kitchen, Bedroom, Living Room, etc.
- Category filter chips below tabs
- Template grid (2 columns on mobile): thumbnail, name, category tags
- Search bar
- Empty state if no matches

**File: `apps/web/app/(main)/library/[templateId]/page.tsx`**
- Template detail: large preview, description, room type, category, tags
- "Apply to Room" button → bottom sheet: select project → select room
- Related templates section

**File: `apps/web/components/templates/template-card.tsx`**
- Template thumbnail card with name, category badges, room type icon

**File: `apps/web/components/templates/template-filter.tsx`**
- Room type tabs + category filter chips component

**File: `apps/web/components/budget/budget-summary.tsx`**
- Project-level budget summary: total, spent, remaining, percentage
- Progress bar with color coding (green <70%, yellow 70-90%, red >90%)

**File: `apps/web/components/budget/budget-breakdown.tsx`**
- Room or project level: budget by category
- Horizontal bar chart per category
- Pie chart for category distribution

**File: `apps/web/components/budget/budget-editor.tsx`**
- Editable budget items table/list
- Category, description, estimated, actual columns
- Add/edit/delete line items
- Running totals

**File: `apps/web/components/budget/budget-chart.tsx`**
- Lightweight chart component (using recharts or lightweight canvas chart)
- Pie chart for category distribution
- Bar chart for room comparison

**Update: `apps/web/app/(main)/projects/[id]/page.tsx`**
- Add Budget tab/section with budget-summary and budget-breakdown
- Link to detailed budget editor

**Update: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx`**
- Add Budget section with room-level budget-editor

#### 4d. Shared / Cross-cutting Changes

**File: `packages/shared/src/types/template.ts`**
- TemplateDto interface
- TemplateFilters type

**File: `packages/shared/src/types/budget.ts`**
- BudgetSummaryDto, BudgetItemDto, CategoryBudgetDto interfaces

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| CREATE | apps/api/src/templates/templates.module.ts | Templates module | Low |
| CREATE | apps/api/src/templates/templates.controller.ts | Template endpoints | Low |
| CREATE | apps/api/src/templates/templates.service.ts | Template business logic | Low |
| CREATE | apps/api/src/budgets/budgets.module.ts | Budgets module | Low |
| CREATE | apps/api/src/budgets/budgets.controller.ts | Budget endpoints | Med |
| CREATE | apps/api/src/budgets/budgets.service.ts | Budget calculations | Med |
| CREATE | apps/web/app/(main)/library/page.tsx | Template library page | Med |
| CREATE | apps/web/app/(main)/library/[templateId]/page.tsx | Template detail | Low |
| CREATE | apps/web/components/templates/template-card.tsx | Template card | Low |
| CREATE | apps/web/components/templates/template-filter.tsx | Filter UI | Low |
| CREATE | apps/web/components/budget/budget-summary.tsx | Budget overview | Med |
| CREATE | apps/web/components/budget/budget-breakdown.tsx | Budget by category | Med |
| CREATE | apps/web/components/budget/budget-editor.tsx | Edit budget items | Med |
| CREATE | apps/web/components/budget/budget-chart.tsx | Charts | Med |
| CREATE | packages/shared/src/types/template.ts | Template types | Low |
| CREATE | packages/shared/src/types/budget.ts | Budget types | Low |
| MODIFY | apps/web/app/(main)/projects/[id]/page.tsx | Add budget section | Low |
| MODIFY | apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx | Add room budget | Low |
| MODIFY | apps/api/src/app.module.ts | Import TemplatesModule, BudgetsModule | Low |
| MODIFY | apps/api/prisma/seed.ts | Add template seed data | Low |

### 6. Dependency & Reference Check

#### Frontend Wiring
- npm packages: recharts (or lightweight-charts) for budget charts
- Library page registered in bottom tab navigation
- Budget components imported in project/room detail pages

#### Backend Wiring
- TemplatesModule and BudgetsModule registered in AppModule
- Template seed data in prisma/seed.ts

### 7. Implementation Plan

**Step 1:** Create templates backend module
- Files: apps/api/src/templates/*
- Details: CRUD with filtering, pagination, featured templates.

**Step 2:** Create budgets backend module
- Files: apps/api/src/budgets/*
- Details: Budget CRUD at project/room/category level. Aggregation logic.

**Step 3:** Register modules and seed templates
- Files: apps/api/src/app.module.ts, apps/api/prisma/seed.ts
- Details: Import modules. Add 20+ seed templates across room types and categories.

**Step 4:** Create template library frontend pages
- Files: apps/web/app/(main)/library/*, apps/web/components/templates/*
- Details: Library page with tabs, filters, search. Template detail with "Apply" CTA.

**Step 5:** Create budget frontend components
- Files: apps/web/components/budget/*
- Details: Summary, breakdown, editor, charts. Responsive mobile-first.

**Step 6:** Integrate budget into project and room pages
- Files: apps/web/app/(main)/projects/[id]/page.tsx, rooms/[roomId]/page.tsx
- Details: Add budget sections to existing pages.

**Step 7:** Create shared types
- Files: packages/shared/src/types/template.ts, budget.ts

### 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Template content not available at launch | Med | Create 20+ basic templates as seed data. Allow architect users to create templates. |
| Chart library bundle size | Med | Use recharts with tree-shaking, or lightweight canvas-based charts. Dynamic import. |
| Budget calculations incorrect with concurrent edits | Low | Project locking (DC-8) prevents concurrent edits. Recalculate totals on every save. |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests
- **TemplatesService.findAll:** Returns paginated results with correct filters
- **TemplatesService.findAll:** Room type filter works, category filter works, search works
- **BudgetsService.getProjectBudget:** Correctly aggregates room budgets
- **BudgetsService.calculateCategoryTotals:** Sums by category across rooms
- **BudgetsService.upsertBudgetItem:** Creates new item or updates existing

#### 9b. Integration Tests
- **Template CRUD:** Create template → list (appears) → filter by room type → get detail
- **Budget CRUD:** Set project budget → add room items → verify aggregation → update actual amounts
- **Budget aggregation:** Multiple rooms with multiple categories → project summary correct

#### 9c. E2E UI Automation Tests
- **Library browsing:** Navigate to Library tab → see templates → filter by room type → tap template → see detail
- **Apply template:** Template detail → "Apply to Room" → select project/room → applied
- **Budget tracking:** Project detail → Budget section → see summary → edit room budget → totals update
- **Budget charts:** Charts render correctly with data, update when values change

### 10. Verification Criteria
- [ ] Template library browsable with room type and category filters
- [ ] Templates can be applied to rooms
- [ ] Budget tracking works at project, room, and category levels
- [ ] Budget aggregation correctly totals from rooms to project
- [ ] Charts render with correct data
- [ ] Seed templates loaded on fresh database
- [ ] All endpoints validate input (DC-14)
- [ ] Library page accessible from bottom tab navigation
