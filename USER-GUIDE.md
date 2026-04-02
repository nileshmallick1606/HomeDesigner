# InteriorScience — User Guide (v3)

> **See your renovated space before a single wall is touched.**

InteriorScience is an AI-powered platform that helps homeowners and architects visualize, plan, and manage home interior renovations. Upload photos of your rooms, select a design category, see AI-generated before/after previews, annotate designs with the built-in editor, track budgets, and collaborate with family or contractors — all from your phone or desktop.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Navigation](#2-navigation)
3. [Projects](#3-projects)
4. [Rooms](#4-rooms)
5. [Photos](#5-photos)
6. [AI Visualization](#6-ai-visualization)
7. [Before/After Comparison](#7-beforeafter-comparison)
8. [Design Management](#8-design-management)
9. [Design Editor (Fabric.js)](#9-design-editor)
10. [Design Library & Templates](#10-design-library--templates)
11. [Budget Tracking](#11-budget-tracking)
12. [Sharing & Collaboration](#12-sharing--collaboration)
13. [Comments](#13-comments)
14. [Notifications](#14-notifications)
15. [Camera Capture](#15-camera-capture)
16. [Export](#16-export)
17. [Profile & Account](#17-profile--account)
18. [Complete User Flows](#18-complete-user-flows)
19. [Phase Summary](#19-phase-summary)
20. [Setup for Testing](#20-setup-for-testing)
21. [Troubleshooting](#21-troubleshooting)

---

## 1. Getting Started

### Create Your Account

1. Open the app (e.g., `http://localhost:3000`)
2. Click **"Get Started"**
3. Fill in: Full Name, Email, Password (min 8 chars, uppercase + lowercase + number), Profile Type (Homeowner / Architect / Organization)
4. Click **"Create Account"** → redirected to sign-in

### Sign In

Enter email + password → **"Sign In"** → Dashboard

> Already signed in? Landing page auto-redirects to dashboard.

---

## 2. Navigation

### Bottom Tab Bar (5 tabs)

| Tab | Where | What |
|-----|-------|------|
| Home | `/dashboard` | Recent projects overview |
| Projects | `/projects` | All projects + create |
| Capture | `/capture` | Camera to photograph rooms |
| Library | `/library` | Design templates + apply to room |
| Profile | `/profile` | Account, logout, delete |

### Notification Bell (top-right)

Red badge shows unread count (max "99+"). Click for recent notifications.

### Route Protection

All app pages require authentication. Unauthenticated → redirected to login.

### Design System (Phase 3)

- **Inter font** loaded via next/font (zero flash of unstyled text)
- **Consistent AppHeader** on all pages with breadcrumbs + notification bell
- **Skeleton loading cards** while data loads (instead of spinners)
- **Status chip colors**: Draft=grey, Active=green, Completed=blue, Archived=amber
- **Card hover effects**: subtle lift animation on hover
- **Responsive photo gallery**: 2 cols mobile, 3 tablet, 4 desktop

---

## 3. Projects

### Creating a Project

1. Click **"Create New Project"** (or floating **+** button)
2. Enter: Project Name (required), Description (optional), Budget in ₹ (optional)
3. Click **"Create Project"** → project detail page

### Project Detail Page

| Section | What It Shows |
|---------|--------------|
| Header | Name, status (color-coded), budget, share button |
| Rooms | Grid of room cards with type icons |
| Budget Summary | Progress bar + category breakdown |
| Comments | Threaded discussion |

---

## 4. Rooms

### Adding a Room

1. Project detail → **"Add Room"**
2. Select room type: Bathroom, Kitchen, Bedroom, Living Room, Dining Room, Balcony, Utility, Custom
3. Name auto-fills → **"Add Room"**

### Room Detail Page (Core Screen)

```
┌──────────────────────────────────────┐
│  Room Name                [Type]     │
├──────────────────────────────────────┤
│  PHOTOS                              │
│  [Responsive Gallery] [Upload Btn]   │
├──────────────────────────────────────┤
│  START DESIGN (when photos exist)    │
│  [6 Category Cards]                  │
│  [Generate Button]                   │
│  [Job Status / Before-After Slider]  │
├──────────────────────────────────────┤
│  DESIGNS                             │
│  [Design Card Grid → click for detail]│
├──────────────────────────────────────┤
│  BUDGET                              │
│  [Category Budget Editor]            │
└──────────────────────────────────────┘
```

---

## 5. Photos

### Uploading

Click **"Upload Photo"** → select JPEG/PNG/WebP (max 20MB) → progress bar → appears in gallery

**Behind the scenes:** Magic byte validation, EXIF stripping (privacy), WebP compression, 3 thumbnail sizes

### Deleting

Click **🗑️ trash icon** on photo → confirmation dialog → **"Delete"**

---

## 6. AI Visualization

### Step-by-Step

1. Upload at least one photo to a room
2. **"Start Design"** section appears
3. Select a category:

| Category | Simulates | Visual Effect |
|----------|-----------|---------------|
| Civil | Wall paint | Softer blue tint |
| Furnishings | New furniture | Warm brightness + saturation |
| Bathroom | New tiles | Cyan with saturation boost |
| Kitchen | Cabinets | Natural green + brightness |
| Electrical | New lighting | Warm golden glow |
| Other | General | Enhanced sepia |

4. Click **"Generate [Category] Visualization"**
5. Watch progress: Queued → Processing → Complete! (or Failed with retry)
6. **Before/After Slider** appears

> Visualizations use improved mock AI with subtle "AI Preview" watermark. Real Stable Diffusion + ControlNet planned for future.

---

## 7. Before/After Comparison

- **Drag** the slider handle left/right
- **Arrow keys** (← →) for fine control
- **Labels**: "Before" / "After"
- Room detail (300px) and design detail (400px full-width)

---

## 8. Design Management

### Viewing Designs

Design cards in room detail show: thumbnail, category, status badge. Click → **Design Detail Page**:
- Full-width before/after slider
- Metadata: category, model version, date
- **"Edit / Annotate"** → opens Fabric.js editor
- **"Regenerate"** → queues new visualization, shows live progress
- **"Delete"** → confirmation dialog → removes design

---

## 9. Design Editor

### Fabric.js Canvas Editor (Phase 3 — New!)

Access: Design detail → **"Edit / Annotate"**

| Tool | What It Does |
|------|-------------|
| **Select** | Click to select/move objects |
| **Draw** | Freehand drawing with color + brush size |
| **Text** | Click to place editable text label |
| **Rectangle** | Place rectangle outline |
| **Circle** | Place circle outline |
| **Eraser** | Delete selected object |

### Features

- **Color picker**: 7 preset colors (black, red, blue, green, orange, purple, white)
- **Brush size slider**: 1-20px
- **Undo/Redo**: 50-state history
- **Auto-save**: Every 30 seconds + on blur (no work lost)
- **Resume editing**: Canvas state persists — close and reopen, everything is exactly as you left it
- **Export PNG**: Download annotated design as image
- **Responsive**: Tool panel at bottom on mobile, left sidebar on desktop

---

## 10. Design Library & Templates

### Browsing Templates (Phase 3 — Enhanced!)

1. Navigate to **Library** tab
2. Filter by room type tabs: All, Bathroom, Kitchen, Bedroom, Living Room, Dining Room, Balcony
3. Templates show as cards with:
   - **Category-colored background** (brown=Civil, blue=Bathroom, green=Kitchen, etc.)
   - **Room type icon** (bathtub, kitchen, bed, etc.)
   - Category label + room type chip

### Applying a Template to a Room (New!)

1. Click a template card → detail dialog opens
2. See: name, description, room type, category, tags
3. Under **"Apply to Room"**:
   - Select a **project** from dropdown
   - Select a **room** from dropdown (rooms without photos are grayed out)
4. Click **"Apply Template"**
5. System creates a design with the template's category
6. AI visualization queues on the room's photo
7. You're redirected to the room detail page to see it processing

> Templates copy their canvasState to the new design, so any pre-configured annotations from the template are preserved.

---

## 11. Budget Tracking

### Project Budget Summary

On project detail page:
- Overall budget, total estimated vs actual
- **Color-coded progress bar**: green (<70%), yellow (70-90%), red (>90%)
- Category breakdown list

### Room Budget Editor

On room detail page:
1. Select category (Civil, Furnishings, Bathroom, Kitchen, Electrical, Other)
2. Enter estimated amount (₹) + actual amount (₹)
3. **"Add Item"** → appears in list
4. Delete items with trash icon

Room budgets roll up to project summary automatically.

---

## 12. Sharing & Collaboration

### Share a Project

1. Project detail → **"Share"** button
2. Select role: **Viewer** or **Editor**
3. Set optional expiration (days)
4. **"Create Link"** → copy URL
5. Share via WhatsApp, email, etc.

### Manage Links

View active links with role badges. **"Revoke"** to disable.

---

## 13. Comments

Project detail → **Comments** section:
- View existing comments (author, timestamp, content)
- Type + **Enter** or click Send
- Comment count in header

---

## 14. Notifications

- **Bell icon** with red unread badge (top-right)
- Click → dropdown with recent notifications (type icon, title, time ago)
- **"Mark all as read"**
- Auto-refreshes every 30 seconds

---

## 15. Camera Capture

1. **Capture** tab → **"Open Camera"**
2. Allow permission → viewfinder shows
3. **"Capture"** → preview → **"Retake"** or **"Use Photo"**

> Camera works for taking photos. Direct upload-to-room integration coming soon. Use the Upload Photo button on room detail pages for now.

---

## 16. Export (Phase 3 — New!)

### Download Design Image

Backend endpoint: `GET /api/export/design/:id/image?format=jpeg|png`

### Download Before/After Comparison

Backend endpoint: `GET /api/export/design/:id/comparison`
- Creates side-by-side composite image (original + visualization)

### Export from Editor

In the Fabric.js editor, click **"PNG"** in the toolbar to download the annotated canvas.

> Frontend export buttons on pages coming in next update. API endpoints are functional now via Swagger at `/api/docs`.

---

## 17. Profile & Account

### View Profile

Profile tab: avatar, name, email, profile type badge, role badge

### Edit Name

Update name → **"Save"** → green confirmation

### Logout

**"Log Out"** → session cleared → landing page

### Delete Account

Danger Zone → **"Delete Account"** → confirm → all data permanently removed

---

## 18. Complete User Flows

### Flow 1: First-Time → First Visualization (10 min)

```
Landing → Register → Login → Dashboard
  → Create Project "My Home Renovation" (₹500,000)
  → Add Room (Bathroom)
  → Upload bathroom photo
  → Select "Bathroom" category → "Generate"
  → Wait (Queued → Processing → Complete)
  → See Before/After Slider!
```

### Flow 2: Apply Template (3 min)

```
Library tab → Browse templates → Click "Modern Minimalist Bathroom"
  → Select project → Select room (must have photo)
  → "Apply Template"
  → Redirected to room → Visualization generating!
```

### Flow 3: Annotate a Design (5 min)

```
Room detail → Click a design card → Design detail
  → "Edit / Annotate" → Fabric.js editor opens
  → Draw arrows pointing to walls → Add text "Paint this blue"
  → Add rectangle around window area
  → Auto-saves every 30s → Click "PNG" to download
  → Close → Canvas state preserved for next time
```

### Flow 4: Budget Planning (3 min)

```
Room detail → Budget section
  → Add: Civil, ₹50,000 estimated, ₹20,000 actual
  → Add: Furnishings, ₹30,000 estimated, ₹0 actual
  → Project detail → See Budget Summary (25% spent, green bar)
```

### Flow 5: Share with Family (1 min)

```
Project detail → "Share" → Select "Viewer" → "Create Link"
  → Copy URL → Send via WhatsApp
```

### Flow 6: Iterate on Designs (2 min)

```
Design detail → "Regenerate" → New visualization queued
  → Wait → Compare new vs original
  → Delete old designs you don't want
```

### Flow 7: Mobile Camera Capture (2 min)

```
Capture tab → Open Camera → Point at room → Capture
  → Review → Retake or keep
```

---

## 19. Phase Summary

### Phase 1 — Foundation (9 specs)

| Feature | Status |
|---------|--------|
| Monorepo (Next.js + NestJS + Docker) | ✅ |
| Database (18 entities via Prisma) | ✅ |
| Authentication (JWT + route protection) | ✅ |
| Project & Room CRUD | ✅ |
| Photo pipeline (upload, EXIF strip, WebP, thumbnails) | ✅ |
| AI job queue (BullMQ + Redis) | ✅ |
| Before/After slider | ✅ |
| Backend APIs (all 13 modules) | ✅ |
| Docker Compose + GitHub Actions CI | ✅ |

### Phase 2 — UI Completion (7 specs)

| Feature | Status |
|---------|--------|
| Auth context + profile page | ✅ |
| AI Worker mock pipeline (segmentation + visualization) | ✅ |
| Visualization request UI (category → generate → before/after) | ✅ |
| Design detail (comparison, regenerate, delete) | ✅ |
| Budget summary + editor UI | ✅ |
| Share dialog + Comments + Notifications | ✅ |
| Camera capture + Templates library | ✅ |

### Phase 3 — UX Polish + Feature Completion (6 specs + 1 feature)

| Feature | Status |
|---------|--------|
| Inter font (next/font/google, zero FOUT) | ✅ |
| AppHeader + breadcrumbs + skeleton loaders | ✅ |
| Status chip colors + card hover effects | ✅ |
| Responsive photo gallery (2/3/4 cols) | ✅ |
| notistack Snackbar + ErrorState component | ✅ |
| Fabric.js v6 editor (draw, text, shapes, undo/redo, auto-save) | ✅ |
| Export module (image + comparison download) | ✅ |
| Template seed data (12 templates) | ✅ |
| Improved AI visualization transforms + watermark | ✅ |
| **Apply Template to Room flow** | ✅ |

### Remaining (Future Phases)

| Feature | Phase |
|---------|-------|
| Google OAuth login | Phase 4 |
| Email sending (Resend) | Phase 4 |
| WebSocket real-time updates | Phase 4 |
| Wire snackbars to all mutations | Phase 4 |
| Real AI (SAM + Stable Diffusion) | Phase 4+ |
| Production deployment | Phase 4+ |

---

## 20. Setup for Testing

### Start All Servers

```bash
# Terminal 1 — Database
docker compose up postgres redis -d

# Terminal 2 — API
cd apps/api
pnpm dev

# Terminal 3 — Frontend
cd apps/web
pnpm dev

# Terminal 4 — AI Worker (required for visualizations!)
cd apps/ai-worker
npx ts-node --transpile-only src/main.ts
```

### Seed Template Data

```bash
cd apps/api
npx prisma db seed
```

### Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API Health | http://localhost:4000/api/health |
| API Docs (Swagger) | http://localhost:4000/api/docs |

### Mobile Testing

1. `ipconfig` → find IPv4 address
2. `cd apps/web && npx next dev --hostname 0.0.0.0 --port 3000`
3. Open `http://<YOUR-PC-IP>:3000` on phone

---

## 21. Troubleshooting

| Issue | Solution |
|-------|---------|
| "Cannot find module ./XXX.js" | `cd apps/web && rm -rf .next && pnpm dev` |
| Visualization stuck on "Queued" | Start AI worker: `cd apps/ai-worker && npx ts-node --transpile-only src/main.ts` |
| Photo upload fails | Check file is JPEG/PNG/WebP, under 20MB. API must be running. |
| Can't login | Password needs uppercase + lowercase + number (min 8 chars) |
| 401 errors | Session expired — log in again |
| Projects don't appear | Log out and log back in |
| Editor not loading | Clear `.next` cache and restart dev server |
| Template "Apply" fails | Selected room must have at least one photo |
| Camera not working | Allow browser permission. HTTPS may be required. |
| Budget not updating | Refresh the page |
| DB seed error | Run `npx prisma migrate dev` first, then `npx prisma db seed` |

---

*Built with Next.js 15, NestJS 10, PostgreSQL 16, Redis 7, Fabric.js 6, Sharp, BullMQ. 23 specs designed and implemented across 3 phases + 1 feature.*
