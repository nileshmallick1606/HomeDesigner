# SPEC-004 — Photo Pipeline (Capture, Upload, Storage)

**Parent Feature:** InteriorScience MVP
**Spec Number:** 004 of 9
**Prerequisites:** SPEC-003

## Status: Not Started

### 1. Objective

Implement the complete photo pipeline: in-app camera capture via Web Camera API, gallery upload, resumable/chunked upload via tus protocol to the backend, EXIF stripping, image compression and thumbnail generation via Sharp, storage in Cloudflare R2, and display of room photos in the room detail view.

- **Before:** Rooms exist but have no photos. No media pipeline.
- **After:** Users can capture photos with their phone camera or upload from gallery. Photos are compressed, EXIF-stripped, thumbnailed, stored in R2, and displayed in room detail with a gallery view.
- **Success criteria:** User can capture/upload a photo, see upload progress with pause/resume capability, photo appears in room gallery within 5 seconds of upload completion. EXIF data is stripped (DC-5). Original photo stored in R2 before any processing (DC-2).

### 2. Architecture

```
Photo Capture/Upload Flow:
  User taps "Add Photo" in Room Detail
    → Option 1: Open camera (Web Camera API) → capture → preview → confirm
    → Option 2: Open file picker → select from gallery
  
  Client starts tus upload to POST /api/media/upload
    → tus server receives chunks (resumable)
    → On complete: validate file (magic bytes, size ≤20MB)
    → Strip EXIF data (Sharp)
    → Store original in R2 (DC-2: before any AI processing)
    → Generate thumbnails (300px, 600px, 1200px) via Sharp
    → Store thumbnails in R2
    → Create RoomPhoto record in DB
    → Return photo metadata to client
    → Client displays photo in room gallery

Storage Layout in R2:
  /{userId}/photos/{photoId}/original.webp
  /{userId}/photos/{photoId}/thumb-300.webp
  /{userId}/photos/{photoId}/thumb-600.webp
  /{userId}/photos/{photoId}/thumb-1200.webp
```

Error Flow:
```
Upload interrupted → tus protocol resumes from last chunk
  → Client shows "Paused" state with resume button
  → Server retains partial upload for 24 hours (E3)

File validation fails (wrong type, too large) →
  → Return 400 with clear error message
  → Client shows inline error, no retry

R2 upload fails →
  → Retry 3 times with exponential backoff
  → If all fail → mark photo as failed → notify user
  → Partial files cleaned up after 24 hours
```

### 3. Design Constraints

- DC-2: Original user photos MUST be stored in R2 immediately upon upload, before any AI processing begins. AI failures must never result in photo loss.
- DC-3: File uploads MUST support resumable/chunked upload protocol (tus). Client must retain local copy until server sends explicit confirmation.
- DC-5: All uploaded images MUST have EXIF data stripped before storage. File type validation must check magic bytes, not just file extension.
- DC-13: Time to Interactive <3 seconds. Lazy loading for photo galleries.
- DC-14: All API endpoints MUST validate input via class-validator DTOs.
- TRD §9: File uploads: MIME type validation, file size limits (20MB), magic byte verification.
- TRD §12: Photo upload <5 seconds for 10MB on 4G.
- AI-DECIDED #7: WebP primary format, JPEG fallback. All generated thumbnails in WebP.
- AI-DECIDED #6: tus protocol for resumable uploads.

### 4. Detailed Design

#### 4a. Database / Schema Changes
- No new schema — RoomPhoto model created in SPEC-002
- Ensure R2 bucket created and accessible

#### 4b. Backend / API Changes

**File: `apps/api/src/media/media.module.ts`**
- Imports: PrismaModule, R2Module
- Providers: MediaService, TusService, ImageProcessingService
- Controllers: MediaController

**File: `apps/api/src/media/media.controller.ts`**
- POST /api/media/upload — tus upload endpoint (handles tus protocol headers)
- PATCH /api/media/upload/:uploadId — tus chunk upload
- HEAD /api/media/upload/:uploadId — tus offset query
- DELETE /api/media/upload/:uploadId — cancel upload
- GET /api/media/:photoId — Get photo metadata
- DELETE /api/media/:photoId — Delete photo (removes from R2 + DB)
- GET /api/media/:photoId/download — Download original

**File: `apps/api/src/media/media.service.ts`**
- processUpload(): Called after tus upload complete. Validates file, strips EXIF, compresses, generates thumbnails, stores in R2, creates RoomPhoto record.
- deletePhoto(): Removes R2 objects + DB record.
- getPhotoUrl(): Generates signed URL or public CDN URL for photo.
- cleanupStaleUploads(): Cron job to clean up partial uploads >24 hours old.

**File: `apps/api/src/media/tus.service.ts`**
- Configures tus-node-server with local file store for chunks
- Max file size: 20MB
- Handles upload creation, chunk receiving, completion callback
- On completion → calls mediaService.processUpload()

**File: `apps/api/src/media/image-processing.service.ts`**
- stripExif(): Uses Sharp to read image and write without metadata (DC-5)
- compress(): Convert to WebP, quality 85, max dimension 4096px
- generateThumbnails(): Create 300px, 600px, 1200px width thumbnails in WebP
- validateImage(): Check magic bytes (JPEG: FF D8 FF, PNG: 89 50 4E 47, WebP: 52 49 46 46 ...57 45 42 50 — RIFF header with WEBP signature), verify dimensions, check file size

**File: `apps/api/src/r2/r2.module.ts`**
- Provides R2Service using @aws-sdk/client-s3 (S3-compatible API)

**File: `apps/api/src/r2/r2.service.ts`**
- upload(): Upload buffer to R2 with key path
- download(): Download object from R2
- delete(): Delete object from R2
- getSignedUrl(): Generate presigned URL (1 hour expiry)
- Configuration from env: R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET_NAME

#### 4c. Frontend / UI Changes

**File: `apps/web/components/media/photo-capture.tsx`**
- Camera capture component using navigator.mediaDevices.getUserMedia()
- Live viewfinder with capture button
- Preview captured image with "Use Photo" / "Retake" buttons
- Handles camera permissions (request, denied state)
- Mobile-optimized: full-screen viewfinder

**File: `apps/web/components/media/photo-upload.tsx`**
- File picker component (accept: image/jpeg, image/png, image/webp)
- Drag-and-drop zone (desktop)
- tus-js-client integration for resumable upload
- Upload progress bar with percentage
- Pause/resume/cancel buttons
- Error states: file too large, wrong type, upload failed
- Retains local preview until server confirms storage
- **Offline/poor connectivity handling:** If upload fails due to network issues, the photo is stored in IndexedDB with room association metadata. A "Pending Uploads" indicator shows the count of queued photos. When connectivity resumes (online event), uploads automatically retry. User can also manually trigger retry from the pending uploads list.

**File: `apps/web/components/media/photo-gallery.tsx`**
- Grid of photo thumbnails (2-3 columns on mobile)
- Lazy loading with intersection observer
- Tap to open full-size viewer
- Pinch-to-zoom on full-size image
- Swipe between photos
- Delete photo option (long-press or menu)

**File: `apps/web/components/media/photo-viewer.tsx`**
- Full-screen photo viewer overlay
- Pinch-to-zoom, pan gesture support
- Before/after toggle (placeholder for SPEC-007)
- Share/download options
- Close (X) button

**Update: `apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx`**
- Add Photos section with photo-gallery component
- "Add Photo" FAB → bottom sheet: "Take Photo" / "Upload from Gallery"
- Photo count badge on room card

**File: `apps/web/app/(main)/capture/page.tsx`**
- Standalone capture page (from bottom tab "+" button)
- Camera opens → capture photo → select project → select room → upload
- Quick flow for adding photos without navigating through project first

#### 4d. Shared / Cross-cutting Changes

**File: `packages/shared/src/types/media.ts`**
- PhotoDto, UploadProgressDto interfaces
- ALLOWED_MIME_TYPES, MAX_FILE_SIZE constants

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| CREATE | apps/api/src/media/media.module.ts | Media module | Low |
| CREATE | apps/api/src/media/media.controller.ts | Upload/photo endpoints | High |
| CREATE | apps/api/src/media/media.service.ts | Photo processing logic | High |
| CREATE | apps/api/src/media/tus.service.ts | tus protocol server | High |
| CREATE | apps/api/src/media/image-processing.service.ts | Sharp processing | Med |
| CREATE | apps/api/src/r2/r2.module.ts | R2 storage module | Med |
| CREATE | apps/api/src/r2/r2.service.ts | R2 S3-compatible client | Med |
| CREATE | apps/web/components/media/photo-capture.tsx | Camera capture | High |
| CREATE | apps/web/components/media/photo-upload.tsx | tus upload with progress | High |
| CREATE | apps/web/components/media/photo-gallery.tsx | Photo grid gallery | Med |
| CREATE | apps/web/components/media/photo-viewer.tsx | Full-screen viewer | Med |
| CREATE | apps/web/app/(main)/capture/page.tsx | Standalone capture page | Med |
| CREATE | packages/shared/src/types/media.ts | Shared media types | Low |
| MODIFY | apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx | Add photos section | Med |
| MODIFY | apps/api/src/app.module.ts | Import MediaModule, R2Module | Low |

### 6. Dependency & Reference Check

#### Backend Wiring
- npm packages: tus-node-server, sharp, @aws-sdk/client-s3, file-type (magic bytes)
- MediaModule and R2Module registered in AppModule
- Cron job for stale upload cleanup (NestJS @Cron decorator via @nestjs/schedule)

#### Frontend Wiring
- npm packages: tus-js-client
- Photo components imported in room detail page
- Capture page registered in bottom tab "+" navigation

### 7. Implementation Plan

**Step 1:** Create R2 storage service
- Files: apps/api/src/r2/r2.module.ts, r2.service.ts
- Action: create
- Details: S3-compatible client for Cloudflare R2. Upload, download, delete, signed URL methods. Config from env vars.

**Step 2:** Create image processing service
- Files: apps/api/src/media/image-processing.service.ts
- Action: create
- Details: Sharp-based EXIF stripping (DC-5), WebP compression, thumbnail generation (300/600/1200px), magic byte validation.

**Step 3:** Create tus upload service
- Files: apps/api/src/media/tus.service.ts
- Action: create
- Details: tus-node-server configuration. Local file store for chunks. Max 20MB. Completion callback triggers processing pipeline.

**Step 4:** Create media service and controller
- Files: apps/api/src/media/media.module.ts, media.controller.ts, media.service.ts
- Action: create
- Details: Full upload pipeline: tus → validate → strip EXIF → compress → thumbnail → R2 → DB record. Delete with R2 cleanup. Stale upload cron.

**Step 5:** Register modules
- Files: apps/api/src/app.module.ts
- Action: modify
- Details: Import MediaModule, R2Module, ScheduleModule.

**Step 6:** Create shared media types
- Files: packages/shared/src/types/media.ts
- Action: create

**Step 7:** Create camera capture component
- Files: apps/web/components/media/photo-capture.tsx
- Action: create
- Details: getUserMedia() for camera access. Viewfinder, capture, preview. Permission handling.

**Step 8:** Create tus upload component
- Files: apps/web/components/media/photo-upload.tsx
- Action: create
- Details: tus-js-client for resumable upload. Progress bar, pause/resume. Local preview until server confirms.

**Step 9:** Create photo gallery and viewer components
- Files: apps/web/components/media/photo-gallery.tsx, photo-viewer.tsx
- Action: create
- Details: Thumbnail grid with lazy loading. Full-screen viewer with pinch-zoom.

**Step 10:** Update room detail page and create capture page
- Files: apps/web/app/(main)/projects/[id]/rooms/[roomId]/page.tsx, apps/web/app/(main)/capture/page.tsx
- Action: modify/create
- Details: Add photos section to room detail. Standalone capture page from bottom tab.

### 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| tus protocol complexity with Nginx reverse proxy | High | Configure Nginx for large body size, proper tus headers forwarding, test chunked uploads through proxy |
| Camera API not available on all browsers | Med | Feature detection, fallback to file picker only, clear message if camera unavailable |
| R2 free tier storage exhaustion (10GB) | Med | Aggressive compression (WebP quality 85, max 4096px), monitor storage via R2 API, budget for paid tier |
| Sharp memory usage on large images | Med | Stream processing, limit concurrent processing, set Sharp memory limits |
| Mobile browser camera permission UX varies | Med | Clear permission request dialog, help text for denied permissions |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests
- **ImageProcessingService.stripExif:** Output image has no EXIF metadata
- **ImageProcessingService.validateImage:** Accepts JPEG/PNG/WebP, rejects GIF/BMP/SVG, rejects files >20MB
- **ImageProcessingService.validateImage:** Validates magic bytes match declared MIME type
- **ImageProcessingService.compress:** Output is WebP, smaller than input, dimensions ≤4096px
- **ImageProcessingService.generateThumbnails:** Creates 3 thumbnails at correct widths
- **R2Service.upload:** Uploads buffer to correct key path
- **MediaService.processUpload:** Full pipeline: validate → strip → compress → thumbnail → R2 → DB
- **MediaService.deletePhoto:** Removes all R2 objects and DB record

#### 9b. Integration Tests
- **Upload flow end-to-end:** tus upload → processing → R2 storage → DB record → GET returns metadata
- **Resume upload:** Upload 50% → disconnect → resume → completes successfully
- **File validation rejection:** Upload non-image file → 400 error with message
- **File size rejection:** Upload >20MB file → 400 error
- **Photo deletion:** Upload → delete → R2 objects removed → 404 on GET
- **R2 connectivity:** Upload and download cycle verifies R2 integration

#### 9c. E2E UI Automation Tests
- **Gallery upload flow:** Login → navigate to room → "Add Photo" → select file → see progress → photo appears in gallery
- **Camera capture flow:** Login → "+" tab → camera opens → capture → select room → uploaded
- **Upload progress:** Start upload → see progress bar → pause → resume → completes
- **Photo viewer:** Tap thumbnail → full-screen opens → pinch-zoom works → close
- **Delete photo:** Long-press photo → confirm delete → photo removed from gallery
- **Error handling:** Upload invalid file → error message shown → can retry with valid file

### 10. Verification Criteria
- [ ] tus upload works with resume capability (DC-3)
- [ ] EXIF data stripped from all uploaded photos (DC-5)
- [ ] Magic byte validation rejects non-image files (DC-5)
- [ ] Original photo stored in R2 before any processing (DC-2)
- [ ] Thumbnails generated at 300/600/1200px in WebP
- [ ] Photos display in room gallery with lazy loading
- [ ] Camera capture works on Android Chrome
- [ ] File picker works as fallback
- [ ] Upload progress shows with pause/resume
- [ ] Photo deletion removes R2 objects + DB record
- [ ] Stale uploads cleaned up after 24 hours
- [ ] All endpoints validate input (DC-14)
- [ ] Upload works through Nginx proxy
