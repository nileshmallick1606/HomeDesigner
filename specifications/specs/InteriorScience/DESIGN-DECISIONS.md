# Design Decisions — InteriorScience

**Designed by:** Design_Advanced (autonomous)
**Date:** 2026-04-02
**PRD:** specifications/InteriorScience-PRD.md
**TRD:** specifications/InteriorScience-TRD.md

## Context Read

- PRD: 13 MVP features (F1-F13), 18 user stories (US1-US12 MVP), 3 personas, 11 key screens
- TRD: Full tech stack defined, 14 design constraints (DC-1 to DC-14), 10 edge case decisions (E1-E10), 10 open technical questions, single-server Docker Compose architecture
- Existing codebase: GREENFIELD — zero code, zero configuration, zero dependencies installed
- This is the initial design for the entire InteriorScience platform MVP

## Clarifying Questions Auto-Answered

| # | Question | AI Decision | Rationale | Source |
|---|----------|------------|-----------|--------|
| 1 | Monorepo tooling: pnpm workspaces vs Nx vs Turborepo? | pnpm workspaces | Lightest weight, no additional build system overhead, sufficient for 2-app monorepo (frontend + backend + shared). Nx/Turborepo add complexity not needed at this scale. | [AI-DECIDED] |
| 2 | SD model selection: SD 1.5 vs SDXL? (TRD OQ#1) | SD 1.5 for MVP | TRD Risk section mentions "Use SD 1.5 instead of SDXL for MVP (lower RAM)". CPU-only inference makes SDXL impractical (8GB+ RAM, very slow). SD 1.5 + ControlNet is proven for interior design. Upgrade path to SDXL when GPU available. | [TRD Recommended] |
| 3 | ControlNet pipeline: which preprocessors? (TRD OQ#2) | Canny + Depth for MVP | Canny edges preserve room geometry (walls, windows, doors). Depth map preserves perspective. Segmentation from SAM handles material regions. Start with canny+depth, add seg preprocessor in Phase 2. | [AI-DECIDED] |
| 4 | Fine-tuning strategy? (TRD OQ#3) | Prompt engineering first, LoRA later | No interior design dataset available (TRD §15 "Not available"). Start with carefully crafted prompts + ControlNet for geometry. Collect user-generated pairs (with consent) for future LoRA fine-tuning. | [AI-DECIDED] |
| 5 | Fabric.js vs Canvas API for before/after slider? (TRD OQ#4) | Lightweight custom Canvas for slider, Fabric.js for editor | Before/after slider needs maximum mobile performance (just 2 images + clip). Fabric.js overhead not justified for simple comparison. Fabric.js used for the full editing canvas. | [AI-DECIDED] |
| 6 | Resumable upload: tus vs custom? (TRD OQ#5) | tus protocol | tus has mature Node.js server (tus-node-server) and client (tus-js-client) libraries. Handles resume, chunking, and partial uploads out of the box. Custom implementation would reinvent the wheel. Aligns with DC-3. | [AI-DECIDED] |
| 7 | Image format strategy? (TRD OQ#9) | WebP primary, JPEG fallback | WebP supported on all target platforms (Android Chrome, modern browsers). 25-35% smaller than JPEG at equivalent quality. Generate WebP by default via Sharp, serve JPEG only for incompatible clients. | [AI-DECIDED] |
| 8 | Monitoring overhead on single server? (TRD OQ#10) | Defer Sentry and PostHog self-hosted to post-MVP | Self-hosted Sentry + PostHog consume significant RAM (~2-4GB combined). On a single 64GB server shared with AI inference, this is a meaningful cost. Use Sentry cloud free tier (5K events/month) and PostHog cloud free tier (1M events/month) for MVP. Switch to self-hosted when scaling to dedicated monitoring server. | [AI-DECIDED] |
| 9 | Service worker caching strategy? (TRD OQ#8) | Cache: app shell, static assets, saved project metadata. Network-first: visualizations, templates, AI results | App shell caching enables fast re-opens. Project metadata cached for offline viewing. AI-generated images are large — cache on demand (when user views), evict LRU when storage exceeds 100MB. | [AI-DECIDED] |
| 10 | Docker resource allocation on single server? (TRD OQ#7) | AI Worker: 32GB RAM limit. PostgreSQL: 8GB. API: 4GB. Redis: 2GB. Frontend: 2GB. Nginx: 512MB. Remaining: OS + monitoring | AI inference is the heaviest consumer. SD 1.5 with ONNX needs ~4-8GB per inference. Reserve 32GB for AI worker to handle concurrent jobs. PostgreSQL needs RAM for connection pooling and indexes. | [AI-DECIDED] |
| 11 | PRD OQ#3: Offline capability for MVP? | Offline viewing of saved projects, online-required for AI | PWA service worker caches app shell + saved project data. Users can browse saved visualizations offline. AI generation, photo upload, and collaboration require connectivity. Clear offline indicator in UI. Aligns with DC-12. | [AI-DECIDED] |
| 12 | PRD OQ#4: Internationalization for MVP? | English-only for MVP | PRD doesn't specify target market language priority. English covers the broadest initial audience. i18n architecture (next-intl or react-i18next) should be set up in the frontend scaffold so adding languages later is trivial. | [AI-DECIDED] |
| 13 | PRD OQ#6: Architect verification? | Self-declaration for MVP | Verification requires manual review process and admin tooling. Self-declaration (select "Architect" profile type during registration) is sufficient for MVP. Add verification badge system in Phase 2. | [AI-DECIDED] |
| 14 | PRD OQ#7: Data retention for free-tier? | Indefinite for MVP, revisit at 10K users | Premature to impose limits before understanding usage patterns. R2 free tier is 10GB — monitor storage and impose limits only when approaching capacity. | [AI-DECIDED] |
| 15 | PRD OQ#1: Monetization model? | Freemium with generation limits for MVP | Free tier: 10 AI generations/day (matches DC-4 rate limit). Pro tier: 100/day. Architect tier: unlimited + client management. Defer pricing to post-launch based on usage data. Subscription via Stripe (post-MVP). | [AI-DECIDED] |
| 16 | PostgreSQL RLS performance? (TRD OQ#6) | Enable RLS but benchmark during integration testing | RLS is critical for DC-9 (tenant isolation). Performance impact is typically <5% with proper indexes. Add application-level middleware as defense-in-depth (belt + suspenders). Benchmark during SPEC-002 implementation. | [AI-DECIDED] |
| 17 | Next.js App Router vs Pages Router? | App Router (Next.js 14+) | App Router is the future of Next.js, supports React Server Components, better for PWA integration, streaming SSR. TRD specifies Next.js 14+ which assumes App Router. | [AI-DECIDED] |

## Architecture Decision

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    NGINX REVERSE PROXY                       │
│                    (:80/443 + SSL)                           │
│         ┌──────────────┬──────────────┐                     │
│         │  /           │  /api/*      │                     │
│         ▼              ▼              │                     │
│  ┌─────────────┐ ┌─────────────┐     │                     │
│  │  Next.js    │ │   NestJS    │     │                     │
│  │  Frontend   │ │   API       │     │                     │
│  │  (PWA)      │ │  (:4000)    │     │                     │
│  │  (:3000)    │ │             │     │                     │
│  │             │ │  ┌────────┐ │     │                     │
│  │  React +    │ │  │ Auth   │ │     │                     │
│  │  Fabric.js  │ │  │ Users  │ │     │                     │
│  │  Three.js   │ │  │ Projects│ │    │                     │
│  │  Canvas     │ │  │ Rooms  │ │     │                     │
│  │             │ │  │ AI Jobs│ │     │                     │
│  └─────────────┘ │  │ Media  │ │     │                     │
│                  │  │ Budget │ │     │                     │
│                  │  │ Share  │ │     │                     │
│                  │  └────────┘ │     │                     │
│                  └──────┬──────┘     │                     │
│                         │            │                     │
│         ┌───────────────┼───────┐    │                     │
│         ▼               ▼       ▼    │                     │
│  ┌─────────────┐ ┌──────────┐ ┌──────────┐               │
│  │ PostgreSQL  │ │  Redis   │ │ AI Worker│               │
│  │  (:5432)    │ │  (:6379) │ │ (BullMQ) │               │
│  │             │ │          │ │          │               │
│  │  Users      │ │  Cache   │ │  SAM     │               │
│  │  Projects   │ │  Sessions│ │  SD 1.5  │               │
│  │  Rooms      │ │  Queue   │ │  ControlNet│              │
│  │  Designs    │ │  PubSub  │ │          │               │
│  │  Budgets    │ │          │ │  ONNX    │               │
│  └─────────────┘ └──────────┘ └────┬─────┘               │
│                                     │                     │
│                              ┌──────▼──────┐              │
│                              │ Cloudflare  │              │
│                              │ R2 Storage  │              │
│                              │ (S3-compat) │              │
│                              └─────────────┘              │
└──────────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │  Cloudflare CDN  │
              │  (free tier)     │
              └──────────────────┘
```

### Data Flow — AI Visualization Pipeline

```
User captures photo → Upload via tus → Store in R2 (DC-2) → 
  API creates RoomPhoto record → Returns photo ID

User requests segmentation →
  API enqueues SAM job (BullMQ, DC-1) →
  AI Worker picks up job → SAM processes → 
  Store masks in R2 + metadata in DB →
  WebSocket notifies client → UI shows segmented elements

User selects category + change →
  API enqueues SD+ControlNet job (BullMQ, DC-1, DC-4 rate limits) →
  AI Worker picks up job (priority queue: paid > free) →
  SD 1.5 + ControlNet generates image → 
  Store in R2 with model version (DC-10) →
  WebSocket notifies client → UI shows visualization

User views before/after → Client-side canvas rendering (instant)
```

### Error Flow

```
AI job fails →
  Retry with exponential backoff (max 3, DC-1/E1) →
  If all retries fail → Mark job as failed →
  Notify user → Offer manual re-trigger →
  Original photo always safe in R2 (DC-2)

AI Worker offline →
  Non-AI features continue (DC-6) →
  Jobs queue in Redis →
  User sees "AI temporarily unavailable" →
  When worker recovers → jobs process from queue

Upload interrupted →
  tus protocol handles resume (DC-3) →
  Partial uploads stored 24h server-side →
  Client retains local copy until confirmation
```

Architecture generated. Auto-approved. [AI-DECIDED]

## Spec Decomposition Decision

### Decision 16 — Spec Decomposition

**Question:** How should the InteriorScience MVP (13 features) be decomposed into independent, implementable specs?

**AI Decision:** 9 specs in the following execution order:

```
SPEC-001: Project Scaffolding & Infrastructure
SPEC-002: Database Schema & Authentication
SPEC-003: Project & Room Management
SPEC-004: Photo Pipeline (Capture, Upload, Storage)
SPEC-005: AI Segmentation Pipeline (SAM)
SPEC-006: AI Visualization Pipeline (SD + ControlNet)
SPEC-007: Visualization Experience (Before/After + Fabric.js Editor)
SPEC-008: Design Templates & Budget Tracking
SPEC-009: Collaboration, Sharing & Export
```

**Rationale:** 
- Each spec maps to a coherent layer of functionality
- Dependencies flow forward: infrastructure → data → auth → core CRUD → media → AI → visualization → auxiliary features
- Each spec is implementable in one focused session
- Specs 005-006 (AI workers) are backend-heavy and independent of each other's frontend
- Specs 008-009 are largely independent of each other
- F13 (Mobile-First UI/PWA) is cross-cutting — baked into every spec rather than separate

**Source:** [AI-DECIDED]

## TRD Open Questions Resolved

| # | Open Question | AI Answer | Source |
|---|-------------|-----------|--------|
| 1 | SD model selection (1.5 vs SDXL) | SD 1.5 for MVP | [TRD Recommended] |
| 2 | ControlNet preprocessors | Canny + Depth | [AI-DECIDED] |
| 3 | Fine-tuning strategy | Prompt engineering first | [AI-DECIDED] |
| 4 | Fabric.js vs Canvas for slider | Custom Canvas for slider | [AI-DECIDED] |
| 5 | Resumable upload protocol | tus protocol | [AI-DECIDED] |
| 6 | RLS performance | Enable + benchmark | [AI-DECIDED] |
| 7 | Docker resource allocation | AI: 32GB, PG: 8GB, API: 4GB | [AI-DECIDED] |
| 8 | Service worker strategy | App shell + metadata cached, AI images on-demand | [AI-DECIDED] |
| 9 | Image format | WebP primary, JPEG fallback | [AI-DECIDED] |
| 10 | Monitoring overhead | Use cloud free tiers for MVP | [AI-DECIDED] |

## Design Review (via /review_design — dual-lens)

**Iterations:** 1
**Total issues found:** 13
**All Critical and Moderate issues:** RESOLVED

### Architect Lens (8 issues)

| # | Severity | Issue | Spec | Fix Applied |
|---|----------|-------|------|-------------|
| A1 | Critical | ai-worker app missing from SPEC-001 scaffold | SPEC-001 | Added apps/ai-worker/ to directory, Docker Compose, pnpm workspaces |
| A2 | Critical | Duplicate WebSocket gateways in SPEC-005 and SPEC-009 | SPEC-005, SPEC-009 | SPEC-009 gateway is canonical; SPEC-005 marked as interim |
| A3 | Critical | SPEC-008 templates need Fabric.js from SPEC-007 for "Apply" | SPEC-008 | Updated prerequisites to include SPEC-007 |
| A4 | Moderate | WebP magic bytes missing from photo validation | SPEC-004 | Added RIFF/WEBP signature bytes |
| A5 | Moderate | Project lock status not queryable without WebSocket | SPEC-003 | Added getLockStatus() with polling fallback |
| A6 | Moderate | No password validation rules in registration DTO | SPEC-002 | Added min 8 chars, uppercase + lowercase + number |
| A7 | Moderate | Shared vs separate AI rate limit counters ambiguous | SPEC-005, SPEC-006 | Clarified: shared counter, 10/day free, 50/day paid |
| A8 | Moderate | Canvas auto-save conflict in multiple tabs | SPEC-007 | Added optimistic concurrency with expectedVersion |

### UI/UX Lens (5 issues)

| # | Severity | Issue | Spec | Fix Applied |
|---|----------|-------|------|-------------|
| U1 | Moderate | No skeleton/loading states for dashboard | SPEC-003 | Added skeleton-card.tsx with shimmer animation |
| U2 | Moderate | No offline handling for photo capture | SPEC-004 | Added IndexedDB queue, pending uploads indicator |
| U3 | Moderate | No estimated wait time before AI generation | SPEC-006 | Added /api/ai/jobs/estimate endpoint + UI text |
| U4 | Moderate | Share token lost during auth redirect | SPEC-009 | Added sessionStorage persistence + returnTo param |
| U5 | Low | Registration form missing Architect Org option | SPEC-002 | Expanded to 3 profile types with Org Name field |

**Unresolved items:** None — all Critical and Moderate issues fixed in spec files.
