# InteriorScience — User Guide

> **See your renovated space before a single wall is touched.**

InteriorScience is an AI-powered platform that helps homeowners and architects visualize, plan, and manage home interior renovations. Upload photos of your rooms, select a design category, and see AI-generated before/after previews — all from your phone or desktop browser.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Navigation](#navigation)
3. [Projects](#projects)
4. [Rooms](#rooms)
5. [Photos](#photos)
6. [AI Visualization](#ai-visualization)
7. [Before/After Comparison](#beforeafter-comparison)
8. [Budget Tracking](#budget-tracking)
9. [Sharing & Collaboration](#sharing--collaboration)
10. [Comments](#comments)
11. [Notifications](#notifications)
12. [Camera Capture](#camera-capture)
13. [Design Library](#design-library)
14. [Profile & Account](#profile--account)
15. [Complete User Flows](#complete-user-flows)
16. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Create Your Account

1. Open the app at your server URL (e.g., `http://localhost:3000`)
2. Click **"Get Started"** on the landing page
3. Fill in your details:
   - **Full Name** — your display name
   - **Email** — used for login
   - **Password** — minimum 8 characters, must include uppercase, lowercase, and a number
   - **Profile Type** — choose one:
     - **Homeowner** — planning your own renovation
     - **Architect (Individual)** — freelance designer
     - **Architecture Organization** — design firm
4. Click **"Create Account"**
5. You'll be redirected to the sign-in page

### Sign In

1. Enter your email and password
2. Click **"Sign In"**
3. You'll land on your **Dashboard**

> **Tip:** If you're already signed in, visiting the landing page automatically redirects you to the dashboard.

---

## Navigation

### Bottom Tab Bar

The app uses a **fixed bottom tab bar** on every screen with 5 sections:

| Tab | What It Does |
|-----|-------------|
| **Home** | Dashboard — your recent projects at a glance |
| **Projects** | Full list of all your renovation projects |
| **Capture** | Camera capture — photograph rooms directly |
| **Library** | Browse design templates for inspiration |
| **Profile** | Your account, settings, and logout |

### Notification Bell

A **bell icon** appears at the top-right of every page. It shows a red badge with your unread notification count (max "99+"). Click it to see recent notifications and mark them as read.

### Route Protection

All app pages are protected — if you're not signed in, you'll be automatically redirected to the login page.

---

## Projects

A **project** represents one renovation — like "Flat 302 Renovation" or "Kitchen Remodel 2026."

### Creating a Project

1. From the **Dashboard** or **Projects** tab, click **"Create New Project"** (or the floating **+** button)
2. Fill in:
   - **Project Name** (required) — e.g., "Flat 11D Sankalpa 2 Renovation"
   - **Description** (optional) — notes about the renovation scope
   - **Overall Budget** (optional) — your total budget in ₹
3. Click **"Create Project"**
4. You'll see your new project's detail page

### Project Detail Page

Shows everything about your project:
- **Project header** — name, status badge, budget, description
- **Share button** — share your project with family or contractors
- **Rooms section** — grid of room cards with type icons
- **Budget summary** — overall progress bar + category breakdown
- **Comments section** — discuss the project with collaborators

---

## Rooms

Each project contains **rooms** — the individual spaces you're renovating.

### Adding a Room

1. Open a project
2. Click **"Add Room"**
3. Select a **room type** from the 8-card grid:
   - Bathroom, Kitchen, Bedroom, Living Room, Dining Room, Balcony, Utility, Custom
4. The room name auto-fills from the type (you can customize it)
5. Click **"Add Room"**

### Room Detail Page

The room detail page is the **most feature-rich screen** in the app. It contains:

1. **Photos section** — upload, view, and delete room photos
2. **Start Design section** — select a category and generate AI visualizations
3. **Designs section** — view all saved design visualizations
4. **Budget section** — track estimated vs actual costs by category

---

## Photos

### Uploading Photos

1. Open a room's detail page
2. Click the **"Upload Photo"** button (dashed border area)
3. Select an image from your device
   - **Supported formats:** JPEG, PNG, WebP
   - **Max size:** 20MB
4. A progress bar shows during upload
5. The photo appears in the gallery grid immediately

**What happens during upload:**
- The image is validated (magic byte checking for security)
- EXIF data (GPS location, camera info) is automatically stripped for privacy
- The image is compressed and converted to WebP format
- Three thumbnail sizes are generated (300px, 600px, 1200px)

### Deleting Photos

1. In the photo gallery, click the **trash icon** on any photo (top-right corner)
2. A confirmation dialog shows a preview of the photo
3. Click **"Delete"** to confirm, or **"Cancel"** to keep it

---

## AI Visualization

This is the **core feature** of InteriorScience — see what your room would look like with different renovation changes.

### Requesting a Visualization

1. Upload at least one photo to a room (the "Start Design" section only appears when photos exist)
2. Select a **design category** from the 6 options:

   | Category | What It Simulates | Visual Effect |
   |----------|-------------------|---------------|
   | **Civil** | Wall paint, plaster | Blue tint |
   | **Furnishings** | New furniture, decor | Warm brightness |
   | **Bathroom** | New tiles, fixtures | Cyan tone |
   | **Kitchen** | Cabinets, countertops | Green tint |
   | **Electrical** | New lighting | Warm temperature |
   | **Other** | General changes | Sepia tone |

3. Click **"Generate [Category] Visualization"**
4. Watch the progress:
   - **Queued** — waiting in the processing queue
   - **Processing** — AI is generating the visualization (may take up to 60 seconds)
   - **Complete** — result is ready!
   - **Failed** — something went wrong (retry available)

5. The **Before/After Slider** appears showing your original photo alongside the AI-generated visualization

> **Note:** Current visualizations use mock AI transforms (color/style filters) with an "AI Preview (Mock)" watermark. Real AI model integration (Stable Diffusion + ControlNet) is planned for a future release.

### Viewing Saved Designs

All generated designs appear as **cards** below the visualization section. Each card shows:
- Thumbnail of the generated image
- Category label
- Status badge

Click any card to open the **Design Detail Page** with:
- Full-width before/after slider
- Design metadata (category, model version, creation date)
- **Regenerate** button — create a new visualization
- **Delete** button — remove this design

---

## Before/After Comparison

The **Before/After Slider** is an interactive comparison tool:

- **Drag** the slider handle left/right to reveal before or after
- **Arrow keys** (← →) for fine control
- **Labels** show "Before" (original) and "After" (AI visualization)
- Available on both the room detail page (300px height) and design detail page (400px height)

---

## Budget Tracking

Track your renovation costs at both the project level and room level.

### Project Budget Summary

On the project detail page, the **Budget Summary** shows:
- Overall budget amount you set
- Total estimated costs (sum of all room budgets)
- Total actual costs spent so far
- **Color-coded progress bar:**
  - Green — under 70% of budget spent
  - Yellow — 70-90% of budget spent
  - Red — over 90% of budget spent
- Category breakdown list

### Room Budget Editor

On the room detail page, the **Budget Editor** lets you:
1. **Add a budget item:**
   - Select a category (Civil, Furnishings, Bathroom, Kitchen, Electrical, Other)
   - Enter estimated amount (₹)
   - Enter actual amount (₹)
   - Click **"Add Item"**
2. **Delete a budget item** — click the trash icon next to any item
3. Items are tracked per-category within each room
4. All room budgets roll up to the project-level summary

---

## Sharing & Collaboration

### Sharing a Project

1. On the project detail page, click the **Share icon** (top-right, near project name)
2. In the Share Dialog:
   - Select a **role** for the recipient:
     - **Viewer** — can see everything but not edit
     - **Editor** — can edit rooms, add photos, create designs
   - Optionally set an **expiration** (days until link expires)
   - Click **"Create Link"**
3. **Copy the generated URL** using the copy icon
4. Share the URL with family members, contractors, or colleagues
5. When they open the link, they'll be added to the project with the assigned role

### Managing Share Links

- View all active share links in the Share Dialog
- Each link shows: role badge and creation date
- Click **"Revoke"** to disable a share link

---

## Comments

Discuss designs and decisions with project collaborators.

### Adding Comments

1. On the project detail page, scroll to the **Comments** section
2. Type your comment in the text input
3. Press **Enter** or click the **Send** button
4. Your comment appears immediately with your name and timestamp

### Viewing Comments

- Comments show: author avatar (initials), name, timestamp, and content
- The section header shows the total **comment count**
- Scroll through the comment history

---

## Notifications

Stay informed about project activity.

### Notification Bell

- **Red badge** on the bell icon shows unread count
- Badge caps at **99+** for high counts
- Count refreshes every 30 seconds automatically

### Notification List

1. Click the **bell icon** to open the dropdown
2. Each notification shows:
   - Type icon (comment, share invite, AI complete)
   - Title
   - Time ago (e.g., "5m ago", "2h ago", "3d ago")
3. Click **"Mark all as read"** to clear the badge

---

## Camera Capture

Photograph rooms directly from the app.

### Using the Camera

1. Navigate to the **Capture** tab (center + button)
2. Click **"Open Camera"**
3. Allow camera access when prompted
4. Point at your room and click **"Capture"**
5. Review the photo:
   - **Retake** — try again
   - **Use Photo** — proceed to upload (room selection coming soon)

### Camera Permissions

- The app requests camera access explicitly
- If denied: a message explains how to enable it in browser settings
- On desktop without camera: the app shows a message suggesting the upload feature on room detail pages instead

> **Note:** The capture page currently lets you take photos but the upload-to-room flow is not yet connected. For now, use the **Upload Photo** button directly on room detail pages.

---

## Design Library

Browse pre-built design templates for inspiration.

### Browsing Templates

1. Navigate to the **Library** tab
2. Use the **room type tabs** to filter:
   - All, Bathroom, Kitchen, Bedroom, Living Room, Dining Room
3. Templates display as cards with:
   - Thumbnail image (or grey placeholder)
   - Template name
   - Category chip

> **Note:** The template library will be populated with seed data in a future update. The page currently fetches from the API but may show empty results until templates are added.

---

## Profile & Account

### Viewing Your Profile

1. Navigate to the **Profile** tab
2. See your:
   - Avatar (first letter of your name)
   - Full name
   - Email address
   - Profile type badge (Homeowner, Architect, etc.)
   - Platform role badge

### Editing Your Name

1. On the profile page, update the name field
2. Click **"Save"**
3. A green "Name updated!" confirmation appears

### Logging Out

1. On the profile page, click **"Log Out"**
2. Your session is cleared and you're returned to the landing page

### Deleting Your Account

1. On the profile page, scroll to the **Danger Zone**
2. Click **"Delete Account"**
3. Read the warning: all data will be permanently deleted
4. Click **"Delete Forever"** to confirm
5. Your account and all associated data (projects, rooms, photos, designs) are removed

---

## Complete User Flows

### Flow 1: First-Time Setup (5 minutes)

```
Landing Page → Register → Login → Dashboard (empty)
  → Create Project → Add Room (Bathroom) → Add Room (Kitchen)
  → Upload Photo to Bathroom → Upload Photo to Kitchen
```

### Flow 2: Generate Your First Visualization (2 minutes)

```
Room Detail (with photo) → Select "Bathroom" category
  → Click "Generate" → Wait for processing (QUEUED → PROCESSING → COMPLETED)
  → See Before/After Slider → Click design card → Full comparison view
```

### Flow 3: Track Your Budget (3 minutes)

```
Room Detail → Budget section → Add Item: Civil, ₹50,000 estimated
  → Add Item: Furnishings, ₹30,000 estimated
  → Go to Project Detail → See Budget Summary (progress bar, category breakdown)
```

### Flow 4: Share with Family (1 minute)

```
Project Detail → Click Share icon → Select "Viewer" role
  → Click "Create Link" → Copy URL → Send to family via WhatsApp
```

### Flow 5: Capture Room Photo on Mobile (2 minutes)

```
Capture tab → Open Camera → Point at room → Capture
  → Review → Retake or Use Photo
```

---

## Technical Notes

| Item | Detail |
|------|--------|
| **Supported image formats** | JPEG, PNG, WebP (max 20MB per photo) |
| **Browser support** | Chrome, Edge, Firefox, Safari (optimized for Android Chrome) |
| **Data privacy** | EXIF data (GPS, camera info) stripped from all uploads |
| **Session duration** | 15-minute access tokens, auto-refresh for up to 7 days |
| **PWA** | Installable on Android via "Add to Home Screen" |
| **Currency** | Indian Rupee (₹) for all budget values |
| **AI mode** | Mock (color transforms + watermark). Real AI planned. |

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| "Get Started" button doesn't work | Clear browser cache and reload |
| Can't login after registration | Make sure password has uppercase, lowercase, and a number |
| Photo upload fails | Check file is JPEG/PNG/WebP and under 20MB. Ensure API server is running. |
| Visualization stuck on "Queued" | Make sure the AI worker is running: `cd apps/ai-worker && npx ts-node src/main.ts` |
| Projects don't appear after login | Your session may have expired — log out and log back in |
| Page shows spinner forever | Check that the API server is running on port 4000 |
| 401 Unauthorized errors | Your session expired — log in again |
| Camera not working | Ensure browser has camera permission. HTTPS may be required on some devices. |
| Budget not updating | Refresh the page after adding items |
| Share link not working | Ensure the recipient creates an account first |

---

## Setup for Testing

### Start the servers

```bash
# Terminal 1 — Database
docker compose up postgres redis -d

# Terminal 2 — API
cd apps/api
pnpm dev

# Terminal 3 — Frontend
cd apps/web
pnpm dev

# Terminal 4 — AI Worker (required for visualizations)
cd apps/ai-worker
npx ts-node --transpile-only src/main.ts
```

### Access the app
- **Frontend:** http://localhost:3000
- **API Health:** http://localhost:4000/api/health
- **API Docs (Swagger):** http://localhost:4000/api/docs

### Mobile Testing
1. Find your PC's IP: `ipconfig` (look for IPv4 address)
2. Start frontend with: `npx next dev --hostname 0.0.0.0 --port 3000`
3. Open `http://<YOUR-PC-IP>:3000` on your phone
