# Technical Requirements Document — InteriorScience

## 1. Technical Summary

InteriorScience is a full-stack, mobile-first Progressive Web Application (PWA) built on a TypeScript-everywhere architecture: React/Next.js frontend, NestJS backend, PostgreSQL database, and self-hosted AI/ML pipeline (Stable Diffusion + ControlNet + SAM). The platform enables users to photograph rooms, apply category-based renovation changes (civil, furnishings, bathroom, kitchen, electrical), and view AI-generated before/after visualizations. The system is designed for zero third-party service cost during development and minimal cost at launch, with all services self-hosted or on free tiers. The architecture supports progressive scaling from single-server Docker Compose deployment to distributed containerized services as demand grows.

## 2. Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React (Next.js 14+) as PWA | Largest ecosystem for image/canvas/3D libraries, SSR for SEO, TypeScript-native, react-konva and Fabric.js integration, PWA installability on Android |
| Mobile Delivery | PWA + TWA (Trusted Web Activity) | Single codebase, Play Store listing via TWA, no native app maintenance, instant updates, $0 dev cost |
| Backend | Node.js with NestJS | Full TypeScript stack (shared types with frontend), modular architecture, built-in WebSocket/Bull queue/guards support, maps to domain modules |
| ORM | Prisma | Type-safe database access, auto-generated migrations, PostgreSQL-optimized, TypeScript-native |
| Primary Database | PostgreSQL (self-hosted) | Relational data model (users→orgs→projects→rooms→designs), row-level security for multi-tenancy, JSONB for flexible metadata, $0 |
| Cache / Queue Store | Redis (self-hosted) | Session management, BullMQ job queue backing store, caching, pub/sub for real-time updates, $0 |
| Object Storage | Cloudflare R2 (free tier) | 10GB storage, 10M reads/month, zero egress cost, S3-compatible API, user photos + generated images |
| AI — Image Generation | Stable Diffusion + ControlNet (self-hosted) | Open-source, no per-inference cost, ControlNet preserves room geometry, fine-tunable for interior design, CPU inference for MVP |
| AI — Room Segmentation | SAM (Segment Anything Model) | Open-source, identifies room elements (walls, floor, ceiling, fixtures), runs on CPU, enables category-specific editing |
| Client-Side Editing | Fabric.js | Interactive canvas editing, object manipulation, image filters, built-in serialization (save/load state as JSON), undo/redo, mature ecosystem |
| 3D Rendering / AR | Three.js + WebXR | Three.js for 3D model previews (MVP), WebXR for AR overlay (Phase 2), browser-native, $0, aligns with PWA |
| Server-Side Media | Sharp + FFmpeg | Sharp: image resizing, format conversion, compositing. FFmpeg: video generation (before/after walkthroughs). Both open-source, $0 |
| Authentication | Custom JWT (Passport.js) + Google OAuth | No third-party auth service cost, JWT for stateless API auth, Google OAuth for social login (free), bcrypt for passwords |
| Email | Resend (free tier) | 3K emails/month free, transactional emails (verification, sharing, notifications), simple API |
| Push Notifications | Firebase Cloud Messaging (FCM) | Free, unlimited, Android-optimized, works with PWA service workers |
| Analytics | PostHog (self-hosted) | Free, open-source, event tracking, funnels, retention analysis, feature flags, no data sent to third party |
| Error Tracking | Sentry (self-hosted) | Free, open-source, real-time error tracking, stack traces, release tracking |
| Monitoring | Grafana + Prometheus | Free, open-source, infrastructure metrics, custom dashboards, alerting |
| CI/CD | GitHub Actions (free tier) | 500 min/month (private repos), automated testing, linting, building, deployment pipelines |
| Hosting (Dev) | localhost | $0, full local development environment via Docker Compose |
| Hosting (Staging) | Oracle Cloud always-free tier | 4 ARM cores, 24GB RAM, genuinely $0, sufficient for staging/demo |
| Hosting (Production) | Hetzner dedicated server | ~€40-50/month, 6-core, 64GB RAM, 1TB SSD, runs entire stack on single server for MVP |
| CDN | Cloudflare (free tier) | Free CDN, DDoS protection, DNS, SSL termination |
| SSL | Let's Encrypt | Free, automated certificate renewal |
| Maps | OpenStreetMap + Leaflet | Free, open-source, no API key costs (replaces Google Maps) |
| Payments (Post-MVP) | Stripe | Free until transactions occur, standard payment processing for subscriptions |

## 3. Data Requirements

### Core Data Entities

```
User
├── Profile (name, email, avatar, role, preferences)
├── Organization (optional, for architect firms)
│   ├── OrgMember (user, role: admin/member)
│   └── OrgSettings (branding, defaults)
├── Project[]
│   ├── ProjectMeta (name, description, budget, timeline, status)
│   ├── ProjectMember[] (user, role: owner/editor/viewer)
│   ├── Room[]
│   │   ├── RoomMeta (name, type, dimensions, budget)
│   │   ├── RoomPhoto[] (original photos, metadata, R2 URLs)
│   │   ├── Segmentation[] (SAM output: element masks, labels)
│   │   ├── Design[]
│   │   │   ├── DesignMeta (name, category, sub-category, status)
│   │   │   ├── CanvasState (Fabric.js JSON serialization)
│   │   │   ├── Visualization[] (AI-generated images, R2 URLs)
│   │   │   └── DesignVersion[] (version history)
│   │   └── RoomBudget (per-category budget breakdown)
│   ├── ProjectBudget (aggregate budget tracking)
│   └── Comment[] (on rooms, designs, visualizations)
├── Template[] (design templates, system-provided + user-created)
└── Notification[] (shares, comments, AI completion)
```

### Data Relationships
- User ↔ Organization: many-to-many (via OrgMember)
- User ↔ Project: many-to-many (via ProjectMember with role)
- Project → Room: one-to-many
- Room → RoomPhoto: one-to-many
- Room → Design: one-to-many
- Design → Visualization: one-to-many (each AI generation is a version)
- Design → CanvasState: one-to-one (current Fabric.js state)

### Storage Requirements
- **PostgreSQL:** Structured data (users, projects, rooms, designs, metadata, permissions, comments, budgets). Estimated: <1GB for 10K users.
- **Cloudflare R2:** Binary assets (photos, visualizations, thumbnails). Estimated: 50GB for MVP launch, growing ~5GB/month.
- **Redis:** Ephemeral data (sessions, cache, job queues). Estimated: <512MB.

### Data Volumes & Growth

| Metric | Launch | 6 Months | 1 Year | 2 Years |
|--------|--------|----------|--------|---------|
| Users | 1-5K | 10-50K | 50-100K | 200-500K |
| Projects | 200-1K | 5-20K | 20-50K | 100-250K |
| Photos (original) | 1-5K | 20-100K | 100-500K | 500K-2M |
| Visualizations (AI) | 2-10K | 50-200K | 200K-1M | 1-5M |
| Storage (R2) | 5-50GB | 200GB-1TB | 1-5TB | 5-20TB |
| DB Size (PostgreSQL) | <500MB | 1-5GB | 5-20GB | 20-100GB |

### Retention & Archival
- **Active accounts:** All data retained indefinitely (within tier limits)
- **Deleted accounts:** Data purged within 30 days (GDPR compliance)
- **Free-tier limits:** TBD — may impose project count or storage limits
- **Archival:** Projects inactive >12 months moved to cold storage (R2 Infrequent Access)
- **AI-generated images:** Stored as long as parent project exists

## 4. Database Strategy

### Database Engine
- **PostgreSQL 16+** — self-hosted via Docker
- **Connection pooling:** PgBouncer for production

### Schema Approach
- **Prisma ORM** — declarative schema definition in `prisma/schema.prisma`
- **Migrations:** Prisma Migrate for version-controlled, reproducible migrations
- **Naming:** snake_case for DB columns, camelCase in application code (Prisma handles mapping)
- **UUIDs:** Primary keys as UUIDs (v7 for time-ordered) — prevents ID enumeration, supports future sharding

### Row-Level Security (RLS)
- Enforce data isolation at the database level for multi-tenancy
- Organization data visible only to org members
- Project data visible only to project members
- Applied via PostgreSQL RLS policies + Prisma middleware

### Indexing Strategy
- Composite indexes on frequently filtered columns (user_id + status, project_id + room_id)
- GIN index on JSONB columns (room metadata, design parameters)
- Partial indexes for active records (WHERE deleted_at IS NULL)

### Backup & Recovery
- **Development:** Docker volume persistence, manual dumps
- **Staging/Production:** Automated daily pg_dump to R2, 30-day retention
- **Point-in-time recovery:** WAL archiving to R2 (production)
- **RTO:** <1 hour, **RPO:** <24 hours (MVP), <1 hour (production)

## 5. Infrastructure & Hosting

### Environment Topology

| Environment | Infrastructure | Purpose | Cost |
|-------------|---------------|---------|------|
| Local Dev | Docker Compose on developer machine | Development, unit tests | $0 |
| Staging | Oracle Cloud free tier (4 ARM cores, 24GB RAM) | Integration testing, demo, QA | $0 |
| Production | Hetzner dedicated (6-core, 64GB RAM, 1TB SSD) | Live application | ~€40-50/month |

### Single-Server Architecture (MVP)

All services run on one server via Docker Compose:

```
┌─────────────────────────────────────────────┐
│              Hetzner Dedicated               │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Next.js  │  │  NestJS  │  │ AI Worker │  │
│  │ Frontend │  │   API    │  │ (SD+SAM)  │  │
│  │ :3000    │  │  :4000   │  │  (queue)  │  │
│  └──────────┘  └──────────┘  └───────────┘  │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │PostgreSQL│  │  Redis   │  │  Nginx    │  │
│  │  :5432   │  │  :6379   │  │  :80/443  │  │
│  └──────────┘  └──────────┘  └───────────┘  │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Sentry  │  │ PostHog  │  │Prometheus │  │
│  │  :9000   │  │  :8000   │  │ + Grafana │  │
│  └──────────┘  └──────────┘  └───────────┘  │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐    ┌──────────────┐
│  Cloudflare CDN │    │ Cloudflare   │
│  (free tier)    │    │ R2 Storage   │
└─────────────────┘    └──────────────┘
```

### Networking & DNS
- **Domain:** Custom domain via Cloudflare DNS (free)
- **SSL:** Let's Encrypt certificates via Certbot (auto-renewal)
- **Reverse Proxy:** Nginx — routes traffic to Next.js (frontend) and NestJS (API)
- **CDN:** Cloudflare free tier — caches static assets, images, generated visualizations
- **WebSocket:** Nginx configured for WebSocket upgrade (collaboration, AI job status)

### Scaling Path (Post-MVP)
1. **Vertical:** Upgrade Hetzner server (more RAM/CPU) — simplest
2. **Horizontal:** Separate API and AI worker to different servers
3. **Container orchestration:** Move to Docker Swarm or Kubernetes when >3 servers
4. **Managed services:** Consider managed PostgreSQL (Neon/Supabase), managed Redis (Upstash) if ops burden grows

## 6. DevOps & CI/CD

### Deployment Pipeline

```
Feature Branch → PR → GitHub Actions (lint + test + build) → Review → Merge to main
                                                                        │
                                                              ┌─────────▼──────────┐
                                                              │  Auto-deploy to    │
                                                              │  Staging (Oracle)  │
                                                              └─────────┬──────────┘
                                                                        │
                                                              ┌─────────▼──────────┐
                                                              │  Manual promote    │
                                                              │  to Production     │
                                                              │  (Hetzner)         │
                                                              └────────────────────┘
```

### GitHub Actions Workflow
1. **On PR:** Lint (ESLint + Prettier) → Type check → Unit tests → Build verification
2. **On merge to main:** All above + Docker image build → Push to registry → Deploy to staging
3. **Manual trigger:** Promote staging → production (docker pull + restart on Hetzner)

### Deployment Strategy
- **MVP:** Rolling deployment via Docker Compose (pull new images, restart services)
- **Downtime:** Brief (<30s) during container restart — acceptable for MVP
- **Post-MVP:** Blue/green deployment for zero-downtime upgrades

### Deployment Frequency
- **Staging:** On every merge to main (continuous)
- **Production:** Weekly releases (manual promotion after staging validation)

### Branching Strategy
- **Trunk-based development** with short-lived feature branches
- Branch naming: `feature/`, `fix/`, `chore/`
- PRs require: passing CI, 1 review, no merge conflicts

### Monitoring & Alerting

| Tool | Purpose | Alerts |
|------|---------|--------|
| Sentry (self-hosted) | Application errors, stack traces, release tracking | Error spike >5/min, new error types |
| Prometheus + Grafana | Infrastructure metrics (CPU, memory, disk, network) | CPU >80%, memory >85%, disk >90% |
| PostHog (self-hosted) | User analytics, funnels, retention, feature usage | No alerts — dashboards only |
| Custom health checks | API uptime, DB connectivity, Redis connectivity, AI worker status | Any service down for >1 min |
| BullMQ dashboard | AI job queue depth, processing times, failures | Queue depth >100, failure rate >5% |

### Logging Strategy
- **Structured logging:** JSON format via NestJS Logger + Winston
- **Log levels:** error, warn, info, debug (debug only in dev/staging)
- **Log storage:** File-based on server, rotated daily, 30-day retention
- **Log aggregation:** Deferred to post-MVP (consider Loki + Grafana when needed)

## 7. Integration Points

| System/Service | Direction | Protocol | Notes |
|---------------|-----------|----------|-------|
| Cloudflare R2 | Bidirectional | S3-compatible REST API | Photo upload, visualization storage, CDN-backed retrieval |
| Stable Diffusion + ControlNet | Internal (API → Worker) | BullMQ job queue (Redis) | Async image generation jobs |
| SAM (Segment Anything) | Internal (API → Worker) | BullMQ job queue (Redis) | Room element segmentation |
| Google OAuth | Inbound | OAuth 2.0 / OIDC | Social login — user authentication |
| Resend | Outbound | REST API | Transactional emails (verification, sharing notifications) |
| Firebase Cloud Messaging | Outbound | REST API | Push notifications to Android PWA |
| Stripe (Post-MVP) | Bidirectional | REST API + Webhooks | Subscription management, payment processing |
| OpenStreetMap / Leaflet | Client-side | Tile server (HTTP) | Property location mapping (optional) |

## 8. Third-Party Services

| Service | Purpose | Vendor | Cost Model | Criticality | MVP? |
|---------|---------|--------|-----------|-------------|------|
| Cloudflare R2 | Object storage (photos, visualizations) | Cloudflare | Free tier: 10GB storage, 10M reads | High — stores all user media | Yes |
| Cloudflare CDN | Content delivery, DDoS protection | Cloudflare | Free tier | Medium — performance optimization | Yes |
| Resend | Transactional email | Resend | Free tier: 3K emails/month | Low — email verification, notifications | Yes |
| Firebase Cloud Messaging | Push notifications | Google | Free, unlimited | Low — engagement feature | Yes |
| Google OAuth | Social login | Google | Free | Low — convenience, email/password is fallback | Yes |
| Let's Encrypt | SSL certificates | ISRG | Free | High — HTTPS required | Yes |
| Oracle Cloud | Staging server | Oracle | Always-free tier | Medium — staging/demo environment | Yes |
| Stripe | Payment processing | Stripe | 2.9% + 30¢ per transaction | High (post-MVP) — revenue collection | No (Post-MVP) |
| OpenStreetMap | Map tiles | OSM Foundation | Free | Low — optional feature | Optional |

**Total third-party cost for MVP: $0**

## 9. Security Architecture

### Authentication
- **Method:** Custom JWT implementation via Passport.js in NestJS
- **Token strategy:** Access token (15 min expiry) + Refresh token (7 day expiry, stored in httpOnly cookie)
- **Social login:** Google OAuth 2.0 via Passport Google Strategy
- **Password storage:** bcrypt with salt rounds = 12
- **Registration:** Email verification required before full access

### Authorization (RBAC)

| Role | Scope | Permissions |
|------|-------|-------------|
| Free User | Platform | Create limited projects, basic visualization, view templates |
| Pro User | Platform | Unlimited projects, full visualization, priority queue |
| Architect Individual | Platform | All Pro features + client management, portfolio, professional templates |
| Architect Org Admin | Organization | All Architect features + team management, billing, org settings |
| Architect Org Member | Organization | All Architect features within assigned projects |
| Platform Admin | System | Full system access, user management, content moderation |

| Project Role | Permissions |
|-------------|-------------|
| Owner | Full CRUD, manage members, delete project |
| Editor | Edit rooms, create designs, generate visualizations, comment |
| Viewer | View only, comment |

- **Implementation:** NestJS Guards + Custom Decorators (`@Roles()`, `@ProjectRole()`)
- **Database:** PostgreSQL Row-Level Security policies for data isolation

### Data Encryption
- **In transit:** TLS 1.3 (HTTPS everywhere via Let's Encrypt + Cloudflare)
- **At rest:** PostgreSQL data directory encryption (LUKS on Hetzner). R2 server-side encryption (default).
- **Sensitive fields:** Email addresses and personal data encrypted at application level (AES-256-GCM) before storage

### Input Validation & Sanitization
- **Framework:** class-validator + class-transformer in NestJS (decorator-based validation on all DTOs)
- **File uploads:** MIME type validation, file size limits (20MB photos), magic byte verification, EXIF stripping
- **SQL injection:** Prevented by Prisma parameterized queries (never raw SQL without parameterization)
- **XSS:** Content Security Policy headers, output encoding, React's built-in XSS protection
- **CSRF:** SameSite cookies + CSRF tokens for state-changing operations

### Rate Limiting
- **API:** Global rate limit: 100 requests/min per IP. Auth endpoints: 10 requests/min per IP.
- **AI generation:** Free tier: 10 generations/day. Pro tier: 100 generations/day.
- **File upload:** 50 uploads/day per user
- **Implementation:** NestJS ThrottlerModule + Redis-backed sliding window

### Content Moderation
- **Upload scanning:** File type validation, size limits, basic image analysis
- **User reports:** Flag mechanism for inappropriate shared content
- **Admin tools:** Content review dashboard, user suspension capability

### Security Headers
```
Content-Security-Policy: default-src 'self'; img-src 'self' blob: data: *.r2.cloudflarestorage.com
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(self), geolocation=()
```

## 10. Scalability Plan

### Expected Load

| Metric | Launch | 6 Months | 1 Year |
|--------|--------|----------|--------|
| Concurrent users | 10-50 | 100-500 | 500-2,000 |
| API requests/min | 100-500 | 1K-5K | 5K-20K |
| AI generations/day | 50-200 | 1K-5K | 5K-20K |
| Photo uploads/day | 100-500 | 2K-10K | 10K-50K |

### Scaling Strategy

| Phase | Trigger | Action |
|-------|---------|--------|
| MVP | Launch | Single server (Hetzner), Docker Compose, CPU inference |
| Scale 1 | API response >500ms p95 OR CPU >80% sustained | Vertical scaling: upgrade Hetzner server (more cores/RAM) |
| Scale 2 | AI queue depth consistently >50 OR generation >2min | Separate AI worker to dedicated GPU server (Hetzner GPU or Vast.ai) |
| Scale 3 | >1000 concurrent users | Separate API and DB to different servers, add read replica |
| Scale 4 | >5000 concurrent users | Move to Kubernetes, horizontal pod autoscaling, managed DB |

### Performance Optimization Strategies
- **CDN:** All static assets and generated images served via Cloudflare CDN
- **Image optimization:** Thumbnails generated on upload (Sharp), WebP format, lazy loading
- **Database:** Connection pooling (PgBouncer), query optimization, appropriate indexes
- **Caching:** Redis cache for templates, user sessions, frequently accessed project metadata
- **API:** Response compression (gzip/brotli), pagination on all list endpoints
- **Frontend:** Next.js SSG for marketing pages, dynamic imports, code splitting, service worker caching
- **AI queue:** Priority queue (paid users first), rate limiting (free tier), background processing

## 11. Technical Constraints

| Constraint | Source | Impact |
|-----------|--------|--------|
| CPU-only AI inference (MVP) | Zero-cost budget | Visualization generation takes 30-60s instead of 3-5s. Must design UX around async generation with progress feedback. |
| Single server deployment (MVP) | Zero-cost budget | All services compete for resources. AI generation may impact API performance. Mitigated by job queue rate limiting. |
| Cloudflare R2 free tier: 10GB | Zero-cost budget | ~200-500 high-res photos. Must implement image compression and thumbnail strategy. May need to upgrade early. |
| GitHub Actions: 500 min/month | Free tier for private repos | Must optimize CI pipeline duration. Skip unnecessary builds. Consider self-hosted runner on staging server. |
| PWA limitations | No native app | Cannot access ARCore directly (WebXR only), limited background processing, no app store features (in-app purchases via Play Billing). |
| WebXR browser support | Web standard maturity | AR features limited to Chrome/Samsung Internet on Android. No iOS AR support via web. |
| No third-party AI APIs | Privacy + cost constraint | Must self-host and maintain AI models. Model updates, fine-tuning, and optimization are our responsibility. |

## 12. Non-Functional Requirements

### Performance
- **Page load (Time to Interactive):** <3 seconds on 4G connection (mid-range Android device)
- **API response time:** <200ms for data queries (p95), <500ms for complex queries (p95)
- **Photo upload:** <5 seconds for 10MB image on 4G
- **AI visualization generation:** <60 seconds on CPU (MVP), <10 seconds on GPU (future)
- **Before/after comparison:** Instant — fully client-side rendering
- **Canvas editing (Fabric.js):** 60fps interaction on mid-range Android devices

### Security
- OWASP Top 10 mitigated (see Section 9)
- No plaintext password storage
- HTTPS everywhere (no HTTP fallback)
- User data never shared with third parties without consent
- Regular dependency vulnerability scanning (npm audit, Snyk free tier)

### Scalability
- Architecture supports 10x growth without re-architecture
- Stateless API design enables horizontal scaling
- Queue-based AI processing decouples generation from request handling
- Database schema designed for sharding readiness (UUID PKs, tenant isolation)

### Availability
- **Target uptime:** 99% (MVP), 99.9% (production maturity)
- **Planned maintenance window:** Sundays 02:00-04:00 UTC
- **Recovery:** Automated health checks, container auto-restart via Docker Compose restart policies
- **Backup:** Daily database dumps, 30-day retention

### Accessibility
- WCAG 2.1 AA compliance
- Semantic HTML, ARIA labels on interactive elements
- Keyboard navigation for core flows
- Screen reader compatible for project management features
- Color contrast ratio: 4.5:1 minimum
- Touch target minimum: 48x48dp

## 13. Edge Case Decisions

| # | Category | Question | Decision | Rationale |
|---|----------|----------|----------|-----------|
| E1 | Failure Modes | What happens when AI image generation fails mid-processing? | Retry with exponential backoff (max 3 attempts). Show "processing" state with estimated time. If all retries fail, notify user and offer manual re-trigger. Never lose original photo. Queue-based architecture ensures job persistence. | AI inference on CPU is more prone to timeouts. User must never lose their uploaded photo. Retry is cheap. |
| E2 | Empty/Null States | What does the app look like for a brand-new user? | Guided onboarding tutorial with sample room. "Try it now" CTA with demo photo. Empty state screens with clear action prompts. Sample project pre-loaded. | First impression determines retention. An empty app is confusing. Demo content shows value immediately. |
| E3 | Data Integrity | What if photo upload is interrupted? | Chunked/resumable uploads (tus protocol). Upload progress with pause/resume. Partial uploads stored 24h server-side. Client retains local copy until server confirmation. | Mobile users on unreliable networks. Losing a photo after a 30s upload is a rage-quit moment. |
| E4 | Performance | What if AI processing queue backs up? | Paid user priority queue. Queue depth monitoring with alerts. User sees queue position and estimated wait. Circuit breaker at threshold with "high demand" message. Free-tier rate limit (10 generations/day). | CPU inference is slow. Under load, queue can grow unbounded without controls. Rate limiting prevents resource exhaustion. |
| E5 | Security | How to handle inappropriate uploaded content? | Automated content validation on upload (file type, size, basic analysis). Flag and quarantine suspicious content. ToS covering acceptable use. EXIF stripping for privacy. No public sharing without user consent. | User photos of homes are generally benign but platform must have safeguards. EXIF data can expose GPS location. |
| E6 | Third-Party Outage | What if AI model service fails? | Graceful degradation: basic editing tools remain functional. Queue jobs for retry on recovery. User notification: "Advanced visualization temporarily unavailable." Non-AI features continue working. | AI is the USP but shouldn't be a single point of failure for the entire app. Core project management must survive AI outage. |
| E7 | Data Privacy / GDPR | How are personal home photos handled? | Encrypted at rest. Active account = retained, deleted account = purged within 30 days. GDPR: right to download, right to deletion. No photos used for AI training without explicit opt-in. Privacy policy clearly states handling. EU data stays in EU region (if applicable). | Home photos are sensitive — they reveal wealth, layout, security systems. Legal obligation under GDPR. Trust is critical for adoption. |
| E8 | Concurrency | What if multiple users edit same project? | MVP: simple locking ("This project is being edited by [user]"). Real-time presence indicators. Phase 2: full real-time collaboration with optimistic concurrency and field-level conflict resolution. | Full real-time collab is complex. Simple locking is sufficient for MVP where most projects have 1-2 active editors. |
| E9 | Multi-Tenancy | How is data isolated between users and orgs? | Logical multi-tenancy (shared DB, tenant-scoped queries). PostgreSQL row-level security. Org members see only their org's projects. Architect-client sharing is explicit (per-project, not org-wide). Audit logging for data access. | Separate databases per org is wasteful at MVP scale. RLS provides strong isolation without infrastructure complexity. |
| E10 | Migration/Rollback | How to handle AI model upgrades? | Model versioning: store which model generated each visualization. Users can re-generate with new model. Never auto-replace existing visualizations. A/B test new models before rollout. Keep previous model deployable for 30 days. | Users may prefer their existing visualizations. Auto-replacement could change decisions already made based on previous output. |

## 14. Design Constraints

These constraints are derived from edge case decisions and technical requirements. They MUST be respected by /design_RLZN and enforced during /implement_RLZN.

1. **DC-1 (from E1):** All AI processing MUST be asynchronous via BullMQ job queue. The API must never perform synchronous AI inference. Job status must be queryable via WebSocket or polling endpoint.

2. **DC-2 (from E1):** Original user photos MUST be stored in R2 immediately upon upload, before any AI processing begins. AI failures must never result in photo loss.

3. **DC-3 (from E3):** File uploads MUST support resumable/chunked upload protocol. Client must retain local copy until server sends explicit confirmation.

4. **DC-4 (from E4):** AI job queue MUST implement priority levels (paid > free) and per-user rate limiting. Queue depth must be monitored with configurable circuit breaker threshold.

5. **DC-5 (from E5):** All uploaded images MUST have EXIF data stripped before storage. File type validation must check magic bytes, not just file extension.

6. **DC-6 (from E6):** The application MUST function (project management, basic editing, viewing saved visualizations) when the AI worker is offline. AI availability must not be a hard dependency for non-AI features.

7. **DC-7 (from E7):** User data deletion MUST cascade completely: account → projects → rooms → photos → visualizations → canvas states → comments. Deletion must be irreversible and complete within 30 days.

8. **DC-8 (from E8):** MVP MUST implement project-level locking when a user is actively editing. Lock must auto-release after 5 minutes of inactivity.

9. **DC-9 (from E9):** ALL database queries for user data MUST be scoped by user_id or organization_id. No query should ever return data across tenants. Enforce via PostgreSQL RLS policies AND application-level middleware.

10. **DC-10 (from E10):** Every AI-generated visualization MUST store the model version that generated it. Visualizations are immutable once generated — new generations create new records, never overwrite.

11. **DC-11 (from T6):** Fabric.js canvas state MUST be serialized to JSON and stored in the database for every design. Users must be able to close the app and resume editing exactly where they left off.

12. **DC-12 (from T1/T3):** The application MUST be a valid PWA: service worker for offline asset caching, web app manifest, installable on Android. Must pass Lighthouse PWA audit with score >90.

13. **DC-13 (from T22):** Time to Interactive MUST be <3 seconds on a mid-range Android device on 4G. Bundle size must be monitored and kept <500KB (gzipped) for initial load.

14. **DC-14 (from Security):** All API endpoints MUST validate input via class-validator DTOs. No endpoint may accept unvalidated user input. Rate limiting must be applied globally and per-endpoint for sensitive operations.

## 15. Technical Dependencies

| Dependency | Status | Type | Impact if Not Ready |
|-----------|--------|------|-------------------|
| Stable Diffusion model (SDXL/SD 1.5) | Available (open-source) | AI Model | Core visualization blocked |
| ControlNet models (canny, depth, seg) | Available (open-source) | AI Model | Room geometry preservation blocked |
| SAM (Segment Anything Model) | Available (open-source) | AI Model | Room element detection blocked |
| ONNX Runtime (for CPU optimization) | Available (open-source) | Runtime | CPU inference performance critical |
| Fabric.js | Available (open-source, v6+) | Library | Client-side editing blocked |
| Three.js | Available (open-source) | Library | 3D preview features blocked |
| Next.js 14+ | Available (open-source) | Framework | Frontend development blocked |
| NestJS 10+ | Available (open-source) | Framework | Backend development blocked |
| Prisma | Available (open-source) | ORM | Database access blocked |
| PostgreSQL 16+ | Available (open-source) | Database | All data storage blocked |
| Redis 7+ | Available (open-source) | Database | Caching, queues, sessions blocked |
| Docker + Docker Compose | Available (open-source) | Infrastructure | Deployment blocked |
| Interior design dataset (for fine-tuning) | Not available | Data | AI quality may be suboptimal without domain-specific training |
| Design template content | Not available | Content | Empty template library at launch |
| Seed data (sample rooms, demo project) | Not available | Content | Onboarding experience incomplete |

## 16. Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| AI visualization quality insufficient on CPU (too slow or poor quality) | Medium | High — USP is unusable | Optimize with ONNX Runtime, use LCM/Turbo models (fewer inference steps), implement quality presets (draft vs. final), consider budget GPU as fallback |
| R2 free tier (10GB) exhausted quickly with high-res photos | High | Medium — uploads blocked | Implement aggressive image compression (WebP, max 2048px), generate thumbnails, monitor storage usage, budget for R2 paid tier (~$0.015/GB/month) |
| Single server bottleneck under concurrent AI + API load | Medium | Medium — degraded performance | Separate AI worker process with own resource limits via Docker, rate limit AI jobs, consider second server earlier than planned |
| SAM segmentation accuracy insufficient for room elements | Low-Medium | High — editing experience poor | Implement manual segmentation fallback (user draws selection), fine-tune SAM on interior photos, allow users to correct segmentation |
| PWA/TWA rejected by Play Store quality checks | Low | Medium — no Play Store presence | Follow Google PWA quality criteria strictly, test with Lighthouse, ensure offline functionality meets minimum bar |
| Oracle Cloud free tier unreliable for staging | Medium | Low — staging unavailable | Have Docker Compose local setup as backup staging, document manual deploy process |
| AI model size exceeds server RAM (SDXL needs ~8GB VRAM/RAM) | Medium | High — AI worker crashes | Use SD 1.5 instead of SDXL for MVP (lower RAM), optimize with model quantization (float16), implement model loading/unloading |
| Fabric.js performance on low-end Android devices | Medium | Medium — editing laggy | Limit canvas resolution, implement progressive loading, test on target devices early, provide "lite mode" |
| WebXR (Phase 2) may not mature enough for production AR | Medium | Low (Phase 2) — AR feature delayed | WebXR is Phase 2, not MVP. Evaluate alternatives (Capacitor + ARCore) closer to Phase 2. |

## 17. Open Technical Questions

1. **SD model selection:** Should we start with SD 1.5 (lighter, faster on CPU, lower quality) or SDXL (heavier, better quality, may struggle on CPU)? Need benchmarking on target hardware.
2. **ControlNet pipeline:** Which ControlNet preprocessors are optimal for interior design? Canny edges for room structure + depth for perspective + segmentation for materials? Need experimentation.
3. **Fine-tuning strategy:** LoRA fine-tuning on interior design images vs. prompt engineering vs. both? What dataset is needed and how to source it?
4. **Fabric.js vs. direct Canvas API:** For the before/after slider specifically, should it use Fabric.js or a lightweight custom Canvas implementation for maximum mobile performance?
5. **Resumable upload protocol:** tus protocol vs. custom chunked upload implementation? tus has server libraries for Node.js but adds a dependency.
6. **PostgreSQL RLS performance:** Row-level security policies can impact query performance. Need benchmarking on expected query patterns with RLS enabled.
7. **Docker Compose resource allocation:** How to allocate CPU/RAM between API, AI worker, PostgreSQL, Redis, and monitoring services on a single server? Need profiling.
8. **Service worker caching strategy:** What to cache offline (saved visualizations, project data) vs. always fetch (AI generation results, templates)? Need to balance offline UX with storage limits on mobile.
9. **Image format strategy:** WebP for all generated images (smaller, good quality) vs. JPEG (universal compatibility)? Browser support is sufficient for WebP on our target platforms.
10. **Monitoring overhead:** Self-hosted Sentry + PostHog + Prometheus + Grafana on same server — how much overhead does this add? May need to defer some monitoring to post-MVP if resources are tight.
