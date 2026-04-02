# InteriorScience — User Guide

> **See your renovated space before a single wall is touched.**

InteriorScience is an AI-powered platform that helps homeowners and architects visualize, plan, and manage home interior renovations. Upload photos of your rooms, apply design changes, and see realistic before/after previews.

---

## Getting Started

### 1. Create Your Account

1. Open the app at **http://localhost:3000**
2. Click **"Get Started"** on the landing page
3. Fill in your details:
   - **Full Name** — your display name
   - **Email** — used for login
   - **Password** — minimum 8 characters, must include uppercase, lowercase, and a number
   - **Profile Type** — choose one:
     - **Homeowner** — planning your own renovation
     - **Architect (Individual)** — freelance designer managing client projects
     - **Architecture Organization** — firm with multiple team members
4. Click **"Create Account"**
5. You'll be redirected to the login page

### 2. Sign In

1. Go to **http://localhost:3000/login**
2. Enter your email and password
3. Click **"Sign In"**
4. You'll land on your **Dashboard**

> **Tip:** Already signed in? Visiting the landing page automatically redirects you to the dashboard.

---

## Navigation

The app uses a **bottom tab bar** with 5 sections:

| Tab | Icon | What It Does |
|-----|------|-------------|
| **Home** | 🏠 | Dashboard — your recent projects at a glance |
| **Projects** | 📁 | All your renovation projects |
| **Capture** | ➕ | Camera capture (coming soon) |
| **Library** | 📐 | Design templates for inspiration (coming soon) |
| **Profile** | 👤 | Your account settings (coming soon) |

---

## Core Features

### Creating a Project

A **project** represents one renovation — like "Flat 302 Renovation" or "Kitchen Remodel 2026."

1. From the **Dashboard** or **Projects** tab, click **"Create New Project"**
2. Fill in:
   - **Project Name** (required) — e.g., "Flat 11D Sankalpa 2 Renovation"
   - **Description** (optional) — notes about the renovation scope
   - **Overall Budget** (optional) — your total budget in ₹
3. Click **"Create Project"**
4. You'll see your new project's detail page

### Managing Rooms

Each project contains **rooms** — the individual spaces you're renovating.

**Adding a Room:**
1. Open a project
2. Click **"Add Room"**
3. Select a **room type** from the grid:
   - 🛁 Bathroom
   - 🍳 Kitchen
   - 🛏️ Bedroom
   - 🛋️ Living Room
   - 🍽️ Dining Room
   - 🌿 Balcony
   - 🔧 Utility
   - 📐 Custom
4. The room name auto-fills from the type (you can customize it)
5. Click **"Add Room"**

**Viewing Rooms:**
- Rooms appear as cards in the project detail page
- Each card shows the room icon, name, and type
- Click a room card to open the room detail page

### Uploading Photos

Photos are the foundation of your renovation visualization.

**To upload a photo:**
1. Open a room's detail page
2. Click the **"Upload Photo"** button
3. Select an image from your device (JPEG, PNG, or WebP, max 20MB)
4. Wait for the upload to complete (progress bar shown)
5. The photo appears in the gallery grid

**What happens during upload:**
- The image is validated for correct format
- EXIF data (location, camera info) is automatically stripped for privacy
- The image is compressed and converted to WebP format
- Three thumbnail sizes are generated (300px, 600px, 1200px)
- The original quality image is preserved

**Deleting a photo:**
1. In the photo gallery, click the **🗑️ delete icon** on any photo (top-right corner)
2. A confirmation dialog shows a preview of the photo
3. Click **"Delete"** to confirm, or **"Cancel"** to keep it

### Viewing Projects

**Dashboard** (`Home` tab):
- Shows your 6 most recent projects
- Each project card displays: name, status, room count

**Projects List** (`Projects` tab):
- Shows all your projects
- Use the floating **+** button (bottom-right) to create a new project

**Project Detail** (click any project):
- Project name, status badge, budget, and description
- Grid of all rooms with type icons
- Quick access to add more rooms

---

## User Flow Summary

Here's the complete flow from start to finish:

```
1. Landing Page (/)
   ↓ Click "Get Started"
2. Register (/register)
   ↓ Create account
3. Login (/login)
   ↓ Sign in
4. Dashboard (/dashboard)
   ↓ Click "Create New Project"
5. New Project (/projects/new)
   ↓ Fill form, submit
6. Project Detail (/projects/[id])
   ↓ Click "Add Room"
7. Add Room (/projects/[id]/rooms/new)
   ↓ Select type, name, submit
8. Project Detail (room cards appear)
   ↓ Click a room card
9. Room Detail (/projects/[id]/rooms/[roomId])
   ↓ Upload photos, manage gallery
```

---

## API Explorer

For developers and power users, the full API documentation is available via Swagger:

**http://localhost:4000/api/docs**

This interactive explorer lets you test all endpoints directly.

---

## Available API Capabilities

While the UI covers the core flows, the backend supports additional features accessible via API:

| Feature | API Endpoint | Status |
|---------|-------------|--------|
| **User profile update** | `PATCH /api/users/me` | Backend ready |
| **Account deletion** | `DELETE /api/users/me` | Backend ready (cascading delete) |
| **Project member management** | `POST /api/projects/:id/members` | Backend ready |
| **Project sharing via link** | `POST /api/projects/:id/share` | Backend ready |
| **Project locking** | `POST /api/projects/:id/lock` | Backend ready (5-min auto-release) |
| **Room reordering** | `PATCH /api/projects/:id/rooms/reorder` | Backend ready |
| **Budget tracking** | `GET/POST /api/rooms/:id/budget` | Backend ready |
| **Comments** | `GET/POST /api/comments` | Backend ready (threaded replies) |
| **Notifications** | `GET /api/notifications` | Backend ready |
| **AI Segmentation** | `POST /api/ai/segmentation` | Backend ready (queued) |
| **AI Visualization** | `POST /api/ai/visualization` | Backend ready (queued) |
| **Design templates** | `GET /api/templates` | Backend ready |

---

## Coming Soon

These features are designed and backend-ready, with UI coming in future updates:

- **📸 Camera Capture** — Photograph rooms directly from the app
- **🎨 AI Visualization** — Select a renovation category (wall color, tiles, cabinets, etc.) and see an AI-generated preview of the changes
- **🔀 Before/After Comparison** — Drag a slider to compare the original room photo with the AI visualization
- **✏️ Design Editor** — Annotate, draw, and add text labels to your designs using the built-in Fabric.js editor
- **📚 Design Templates** — Browse pre-built design templates for inspiration
- **💰 Budget Tracking** — Track estimated vs. actual spending per room and category with charts
- **🤝 Collaboration** — Share projects with family members or contractors, add comments on rooms and designs
- **🔔 Notifications** — Get notified when collaborators comment or when AI processing completes
- **📄 Export** — Download before/after images and project summaries as PDF
- **👤 Profile Management** — Update your name, avatar, and account settings

---

## Technical Notes

- **Supported image formats:** JPEG, PNG, WebP (max 20MB per photo)
- **Browser support:** Chrome, Edge, Firefox, Safari (optimized for Android Chrome)
- **Data privacy:** EXIF data (GPS, camera info) is stripped from all uploaded photos
- **Session:** Login sessions last 15 minutes, with automatic refresh for up to 7 days
- **Offline:** Saved projects can be browsed offline (when PWA is installed)

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| "Get Started" button doesn't work | Clear browser cache and reload |
| Can't login after registration | Make sure password has uppercase, lowercase, and a number |
| Photo upload fails | Check file is JPEG/PNG/WebP and under 20MB. Try a smaller image first. |
| Projects don't appear after login | Log out and log back in to refresh the session |
| Page shows spinner forever | Check that the API server is running on port 4000 |
| 401 Unauthorized errors | Your session expired — log in again |
