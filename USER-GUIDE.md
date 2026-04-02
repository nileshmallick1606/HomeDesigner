# InteriorScience — User Guide

> **See your renovated space before a single wall is touched.**

InteriorScience is an AI-powered platform that helps homeowners and architects visualize, plan, and manage home interior renovations. Upload photos of your rooms, select a design category, and see AI-generated before/after previews — all from your phone or desktop browser.

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
9. [Budget Tracking](#9-budget-tracking)
10. [Sharing & Collaboration](#10-sharing--collaboration)
11. [Comments](#11-comments)
12. [Notifications](#12-notifications)
13. [Camera Capture](#13-camera-capture)
14. [Design Library](#14-design-library)
15. [Profile & Account](#15-profile--account)
16. [Complete User Flows](#16-complete-user-flows)
17. [Phase Summary](#17-phase-summary)
18. [Setup for Testing](#18-setup-for-testing)
19. [Troubleshooting](#19-troubleshooting)

---

## 1. Getting Started

### Create Your Account

1. Open the app (e.g., `http://localhost:3000`)
2. Click **"Get Started"** on the landing page
3. Fill in your details:
   - **Full Name** — your display name
   - **Email** — used for login
   - **Password** — minimum 8 characters with uppercase, lowercase, and a number
   - **Profile Type**:
     - **Homeowner** — planning your own renovation
     - **Architect (Individual)** — freelance designer
     - **Architecture Organization** — design firm
4. Click **"Create Account"** → redirects to sign-in page

### Sign In

1. Enter your email and password
2. Click **"Sign In"**
3. You land on your **Dashboard**

> Already signed in? The landing page auto-redirects to your dashboard.

---

## 2. Navigation

### Bottom Tab Bar (5 tabs — every screen)

| Tab | Destination | What You See |
|-----|-------------|-------------|
| **Home** | `/dashboard` | Recent projects overview |
| **Projects** | `/projects` | Full project list + create button |
| **Capture** | `/capture` | Camera to photograph rooms |
| **Library** | `/library` | Design templates for inspiration |
| **Profile** | `/profile` | Account settings, logout |

### Notification Bell (top-right)

Red badge shows unread count (max "99+"). Click to see recent notifications and mark them as read.

### Route Protection

All app pages require authentication. Unauthenticated users are automatically redirected to the login page.

---

## 3. Projects

A **project** represents a single renovation (e.g., "Flat 302 Renovation").

### Creating a Project

1. Click **"Create New Project"** (Dashboard or Projects tab, or the floating **+** button)
2. Fill in:
   - **Project Name** (required)
   - **Description** (optional)
   - **Overall Budget** in ₹ (optional)
3. Click **"Create Project"**

### Project Detail Page

| Section | What It Shows |
|---------|--------------|
| **Header** | Name, status badge, budget, share button |
| **Rooms** | Grid of room cards with type icons |
| **Budget Summary** | Progress bar + category breakdown |
| **Comments** | Threaded discussion with collaborators |

---

## 4. Rooms

### Adding a Room

1. Open a project → click **"Add Room"**
2. Select a **room type** from 8 options:

| Type | Icon |
|------|------|
| Bathroom | 🛁 |
| Kitchen | 🍳 |
| Bedroom | 🛏️ |
| Living Room | 🛋️ |
| Dining Room | 🍽️ |
| Balcony | 🌿 |
| Utility | 🔧 |
| Custom | 📐 |

3. Room name auto-fills (customize if needed)
4. Click **"Add Room"**

### Room Detail Page — The Core Screen

The room detail page is the **most feature-rich screen** in the app:

```
┌─────────────────────────────────┐
│  Room Name          [Type Badge]│
├─────────────────────────────────┤
│  PHOTOS                         │
│  [Photo Grid] [Upload Button]   │
├─────────────────────────────────┤
│  START DESIGN (if photos exist) │
│  [Category Selector Grid]       │
│  [Generate Button]              │
│  [Job Status / Before-After]    │
├─────────────────────────────────┤
│  DESIGNS                        │
│  [Design Card Grid]             │
├─────────────────────────────────┤
│  BUDGET                         │
│  [Budget Editor]                │
└─────────────────────────────────┘
```

---

## 5. Photos

### Uploading

1. Open a room → click **"Upload Photo"**
2. Select an image (JPEG, PNG, or WebP — max 20MB)
3. Progress bar shows during upload
4. Photo appears in the gallery immediately

**Behind the scenes:**
- Magic byte validation (security)
- EXIF data stripped (GPS, camera info removed for privacy)
- Compressed to WebP format
- 3 thumbnail sizes generated (300px, 600px, 1200px)

### Deleting

1. Click the **🗑️ trash icon** on any photo (top-right corner)
2. Confirmation dialog shows a preview
3. Click **"Delete"** to confirm

---

## 6. AI Visualization

The **core feature** — see what your room could look like with different renovation changes.

### Step-by-Step

1. **Upload at least one photo** to a room
2. The **"Start Design"** section appears below your photos
3. **Select a category** from the 6 options:

| Category | What It Simulates | Visual Effect |
|----------|-------------------|---------------|
| **Civil** | Wall paint, plaster | Blue tint |
| **Furnishings** | New furniture, decor | Warm brightness |
| **Bathroom** | New tiles, fixtures | Cyan tone |
| **Kitchen** | Cabinets, countertops | Green tint |
| **Electrical** | New lighting | Warm temperature |
| **Other** | General changes | Sepia tone |

4. Click **"Generate [Category] Visualization"**
5. Watch the live progress:
   - **Queued** — waiting in processing queue
   - **Processing** — AI generating the image (up to 60 seconds)
   - **Complete!** — result ready
   - **Failed** — retry available
6. The **Before/After Slider** appears with your original photo vs. the AI-generated result

> **Note:** Current visualizations use mock AI (color/style transforms with "AI Preview (Mock)" watermark). Real Stable Diffusion + ControlNet integration is planned.

---

## 7. Before/After Comparison

The interactive comparison slider lets you evaluate design changes:

- **Drag** the handle left/right to reveal before or after
- **Arrow keys** (← →) for fine control
- **Labels** show "Before" and "After"
- Available on room detail page (300px) and design detail page (400px full-width)

---

## 8. Design Management

### Viewing Designs

All generated designs appear as **cards** in the room detail page showing:
- Thumbnail of the generated image
- Category label
- Status badge

Click any card → **Design Detail Page** with:
- Full-width before/after slider
- Design metadata (category, model version, date)

### Regenerating a Design

1. Open a design detail page
2. Click **"Regenerate"**
3. A new visualization job queues
4. Live progress shows (Queued → Processing → Complete)
5. The before/after slider updates with the new result

### Deleting a Design

1. Open a design detail page
2. Click **"Delete"**
3. Confirmation dialog warns this is permanent
4. Click **"Delete"** → design and all visualizations removed
5. Redirects back to room page

---

## 9. Budget Tracking

### Project Budget Summary (Project Detail Page)

Shows aggregated budget across all rooms:
- **Overall budget** (set during project creation)
- **Total estimated** vs **Total actual** costs
- **Color-coded progress bar:**
  - 🟢 Green — under 70% spent
  - 🟡 Yellow — 70–90% spent
  - 🔴 Red — over 90% spent
- **Category breakdown** list

### Room Budget Editor (Room Detail Page)

1. Scroll to the **Budget** section
2. **Add a budget item:**
   - Select category (Civil, Furnishings, Bathroom, Kitchen, Electrical, Other)
   - Enter estimated amount (₹)
   - Enter actual amount (₹)
   - Click **"Add Item"**
3. **Delete** — click the trash icon next to any item
4. Room budgets automatically roll up to the project summary

---

## 10. Sharing & Collaboration

### Sharing a Project

1. On the project detail page, click the **Share icon** (top-right)
2. In the Share Dialog:
   - Select **role** for the recipient:
     - **Viewer** — see everything, can't edit
     - **Editor** — full edit access
   - Set optional **expiration** (days)
   - Click **"Create Link"**
3. **Copy the URL** → share via WhatsApp, email, etc.

### Managing Share Links

- View all active links in the Share Dialog
- Each shows: role badge, creation date
- Click **"Revoke"** to disable a link

---

## 11. Comments

### Adding Comments

1. On the project detail page, scroll to **Comments**
2. Type your comment in the text input
3. Press **Enter** or click the **Send** button
4. Comment appears immediately with your name and timestamp

### Features

- Author avatar (initials), name, timestamp, content
- Comment count in section header
- Scrollable history

---

## 12. Notifications

### Bell Icon (top-right of every page)

- **Red badge** shows unread count
- Refreshes every 30 seconds
- Caps at **99+**

### Notification Dropdown

1. Click the bell icon
2. See recent notifications:
   - Type icon (comment, share, AI complete)
   - Title
   - Time ago (e.g., "5m ago")
3. Click **"Mark all as read"**

---

## 13. Camera Capture

### Using the Camera

1. Navigate to the **Capture** tab (center + button)
2. Click **"Open Camera"**
3. Allow camera permission when prompted
4. Point at your room → click **"Capture"**
5. Review the photo:
   - **Retake** — try again
   - **Use Photo** — ready for upload

### Permission Handling

- Denied? Clear message explaining how to enable in browser settings
- Desktop without camera? Info message suggesting the room detail upload instead

> **Note:** Camera capture works for taking photos. Upload-to-room integration coming in a future update. For now, use the Upload Photo button on room detail pages.

---

## 14. Design Library

Browse pre-built design templates for inspiration.

1. Navigate to the **Library** tab
2. Use **room type tabs** to filter: All, Bathroom, Kitchen, Bedroom, Living Room, Dining Room
3. Templates display as cards with thumbnail, name, category chip

> **Note:** Template data will be populated in a future update.

---

## 15. Profile & Account

### Viewing Profile

Navigate to the **Profile** tab to see:
- Avatar (first letter of name)
- Full name, email
- Profile type badge (Homeowner, Architect, etc.)
- Platform role badge

### Edit Name

1. Update the name field
2. Click **"Save"**
3. Green confirmation: "Name updated!"

### Logout

Click **"Log Out"** → session cleared → landing page

### Delete Account

1. Scroll to **Danger Zone**
2. Click **"Delete Account"**
3. Read warning: all data permanently deleted
4. Click **"Delete Forever"** to confirm
5. Account + all projects/rooms/photos/designs removed

---

## 16. Complete User Flows

### Flow 1: First-Time Setup → First Visualization (10 minutes)

```
Landing → Register → Login → Dashboard
  → Create Project ("My Home Renovation", ₹500,000)
  → Add Room (Bathroom)
  → Upload Photo of bathroom
  → Select "Bathroom" category
  → Click "Generate Bathroom Visualization"
  → Wait (Queued → Processing → Complete)
  → See Before/After Slider!
  → Click design card → Full-screen comparison
```

### Flow 2: Multiple Room Designs (5 minutes)

```
Project Detail → Add Room (Kitchen)
  → Upload Kitchen photo
  → Generate "Kitchen" visualization → Before/After
  → Go back → Add Room (Bedroom)
  → Upload → Generate "Furnishings" → Compare
```

### Flow 3: Budget Planning (3 minutes)

```
Room Detail → Budget section
  → Add: Civil, ₹50,000 estimated, ₹20,000 actual
  → Add: Furnishings, ₹30,000 estimated, ₹0 actual
  → Go to Project Detail → See Budget Summary
  → Progress bar shows 25% spent (green)
```

### Flow 4: Share with Family (1 minute)

```
Project Detail → Share icon → Select "Viewer"
  → Create Link → Copy URL
  → Send to family via WhatsApp
```

### Flow 5: Iterate on Designs (2 minutes)

```
Design Detail → Click "Regenerate" → New visualization queued
  → Wait for completion → Compare new vs original
  → Not satisfied? Regenerate again
  → Delete old designs you don't want
```

### Flow 6: Mobile Camera Capture (2 minutes)

```
Capture tab → Open Camera → Point at room → Capture
  → Review photo → Retake or keep
```

---

## 17. Phase Summary

### Phase 1 — Foundation (SPEC-001 to SPEC-009)

| Feature | Status |
|---------|--------|
| Monorepo scaffolding (Next.js + NestJS + Docker) | ✅ Complete |
| Database schema (18 entities via Prisma) | ✅ Complete |
| User registration & JWT authentication | ✅ Complete |
| Project CRUD with member management | ✅ Complete |
| Room CRUD with 8 room types | ✅ Complete |
| Photo upload pipeline (validation, EXIF strip, WebP, thumbnails) | ✅ Complete |
| AI job queue infrastructure (BullMQ + Redis) | ✅ Complete |
| Before/After slider component | ✅ Complete |
| Category selector component | ✅ Complete |
| Backend APIs: Templates, Budgets, Sharing, Comments, Notifications | ✅ Complete |
| Docker Compose (PostgreSQL, Redis, Nginx) | ✅ Complete |
| GitHub Actions CI pipeline | ✅ Complete |

### Phase 2 — UI Completion + AI Worker (SPEC-010 to SPEC-016)

| Feature | Status |
|---------|--------|
| Auth context + route protection | ✅ Complete |
| Profile page (view/edit/logout/delete) | ✅ Complete |
| AI Worker mock pipeline (segmentation + visualization) | ✅ Complete |
| Visualization request UI (category → generate → before/after) | ✅ Complete |
| Design detail page (full comparison, regenerate, delete) | ✅ Complete |
| Budget summary + editor UI | ✅ Complete |
| Templates library page (fetches from API, room type tabs) | ✅ Complete |
| Share dialog (create links, roles, copy URL, revoke) | ✅ Complete |
| Comments panel (create, display, threaded) | ✅ Complete |
| Notification bell + dropdown (unread badge, mark read) | ✅ Complete |
| Camera capture page (getUserMedia, viewfinder, capture) | ✅ Complete |
| Fabric.js editor page (scaffold/route created) | 🔸 Scaffold only |

### Remaining Items

| Feature | Status |
|---------|--------|
| Export backend (PDF, image download) | ❌ Not yet |
| Full Fabric.js canvas editor (drawing tools, auto-save) | ❌ Not yet |
| Template seed data in database | ❌ Not yet |
| WebSocket real-time updates (using polling currently) | ❌ Not yet |
| Real AI model integration (SAM, Stable Diffusion) | ❌ Not yet |
| Google OAuth login | ❌ Not yet |
| Email sending (verification, notifications) | ❌ Not yet |

---

## 18. Setup for Testing

### Start All Servers

```bash
# Terminal 1 — Database
docker compose up postgres redis -d

# Terminal 2 — API (from project root)
cd apps/api
pnpm dev

# Terminal 3 — Frontend
cd apps/web
pnpm dev

# Terminal 4 — AI Worker (required for visualizations!)
cd apps/ai-worker
npx ts-node --transpile-only src/main.ts
```

### Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API Health | http://localhost:4000/api/health |
| API Docs (Swagger) | http://localhost:4000/api/docs |

### Mobile Testing

1. Find your PC's IP: `ipconfig` (look for IPv4)
2. Start frontend: `npx next dev --hostname 0.0.0.0 --port 3000`
3. Open `http://<YOUR-PC-IP>:3000` on your phone

---

## 19. Troubleshooting

| Issue | Solution |
|-------|---------|
| "Get Started" does nothing | Clear browser cache, reload |
| Can't login | Password needs uppercase + lowercase + number |
| Photo upload fails | Check file is JPEG/PNG/WebP, under 20MB. API must be running. |
| Visualization stuck on "Queued" | Start the AI worker: `cd apps/ai-worker && npx ts-node --transpile-only src/main.ts` |
| Visualization shows "Failed" | Check AI worker terminal for errors. Try uploading a new photo and generating again. |
| "Cannot find module ./591.js" | Delete `.next` folder: `cd apps/web && rm -rf .next && pnpm dev` |
| Projects disappear after login | Session expired — log out and log back in |
| Budget not showing | Refresh the page after adding items |
| Share link not working | Recipient must create an account first |
| Camera not working | Allow camera permission in browser. HTTPS may be required. |
| Page shows spinner forever | Check API server running on port 4000 |
| 401 errors | Session expired — log in again |

---

*Built with Next.js 15, NestJS 10, PostgreSQL 16, Redis 7, and Sharp. 16 specs designed and implemented across 2 phases.*
