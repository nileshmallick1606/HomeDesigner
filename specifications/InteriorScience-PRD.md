# Product Requirements Document — InteriorScience

## 1. Executive Summary

- **Product Type:** Full-Stack Platform (Web-based, mobile-first PWA)
- **Summary:** InteriorScience is a one-stop, mobile-first web platform that enables homeowners and architects to visualize, plan, and manage complete home interior transformations. The platform covers the full spectrum of home renovation — civil/structural work, furnishings, bathroom fittings, kitchen remodeling, electrical, painting, and more. Its core USP is AI-powered before/after visualization: users photograph their existing space, apply planned changes across categories, and see a realistic preview of the renovated space before any physical work begins. The platform serves both individual homeowners undertaking personal renovations and architecture professionals (individuals and organizations) managing client projects.

## 2. Product Vision

- **Vision Statement:** "A one-stop mobile-first platform that lets anyone visualize, plan, and manage home interior transformations — see your renovated space before a single wall is touched."
- **Problem Statement:** Homeowners and architects currently lack a unified, accessible tool for planning, visualizing, and managing complete home overhauls spanning civil/structural changes (walls, flooring, plumbing, electrical), furnishings (furniture, decor, lighting), bathroom fittings (sanitary ware, tiles, fixtures), kitchen remodeling, and all other interior categories. Current tools are either too narrow (only decor/cosmetic), too professional and expensive (CAD/BIM), or fragmented across multiple disconnected apps for design, visualization, project tracking, and contractor coordination. This makes home renovation planning overwhelming, error-prone, expensive, and difficult to preview before committing financially.
- **Current State:** Users rely on a combination of Pinterest for inspiration, expensive professional tools (AutoCAD, 3ds Max, SketchUp) for design, spreadsheets for budgeting, WhatsApp for contractor communication, and imagination for visualization. No single platform ties these together with realistic before/after previews.
- **Desired Future State:** A single platform where any user can photograph a room, select renovation categories (civil, furnishings, bathroom, kitchen, etc.), apply changes visually, see a realistic AI-generated before/after comparison, manage the entire project (rooms, budget, timeline), and collaborate with architects or family members — all from their Android phone.
- **Business Justification:** The global home renovation market is valued at $900B+ and growing. The intersection of AI-powered visualization and accessible mobile tools is underserved. Professionals pay $500-5,000/year for design tools; homeowners have no affordable visualization option. InteriorScience democratizes interior visualization while providing professionals a client-facing tool that replaces expensive software.

## 3. Target Users & Personas

### Persona 1 — Homeowner (Individual)
- **Role:** Individual homeowner, tenant, or flat/apartment owner planning renovation
- **Goals:** Visualize changes before spending money, plan renovation room-by-room and category-by-category, compare design options side-by-side, track renovation progress and budget, make confident decisions without professional design background
- **Pain Points:** Cannot imagine the final outcome from a contractor's verbal description, overwhelmed by choices (tiles, fittings, colors, materials), budget overruns due to poor planning, poor communication with contractors, costly mistakes from wrong material/color choices
- **Skill Level:** Novice to intermediate (non-technical, smartphone-comfortable)

### Persona 2 — Individual Architect / Interior Designer
- **Role:** Freelance or independent architect, interior designer, or renovation consultant
- **Goals:** Present design proposals to clients with compelling, realistic visuals, manage multiple client projects efficiently, streamline client approval process, build and showcase portfolio, reduce time spent on manual mockups
- **Pain Points:** Expensive professional tools (AutoCAD, 3ds Max licenses), difficulty communicating design vision to non-technical clients, managing multiple revision rounds, creating realistic visuals is time-consuming, client expectations mismatch
- **Skill Level:** Intermediate to expert (design-proficient)

### Persona 3 — Architecture Organization
- **Role:** Architecture firm, interior design studio, or renovation company with multiple team members
- **Goals:** Standardize project workflows across team, collaborate on designs across team members, manage client portfolio at scale, present professional proposals consistently, control brand quality across all client deliverables
- **Pain Points:** Tool licensing costs for entire team, team coordination and version control of designs, onboarding new team members to proprietary workflows, client presentation overhead, inconsistent quality across team members
- **Skill Level:** Expert (professional design tools proficient)

### Secondary Users
- **Contractors/Vendors:** View-only access to approved plans and specifications for execution reference
- **Family Members/Co-Owners:** Collaborative decision-making — view, comment, and vote on design options
- **Real Estate Agents:** Staging visualization — show potential buyers how a property could look after renovation

## 4. User Stories & Use Cases

### Core Workflows

| # | As a [persona] | I want to [action] | So that [outcome] | Priority |
|---|---------------|--------------------|--------------------|----------|
| US1 | Homeowner | Photograph my room and see it with new wall colors/textures | I can decide on colors before buying paint | P0 — MVP |
| US2 | Homeowner | Visualize my bathroom with new tiles and fittings | I can choose sanitary ware and tiles with confidence | P0 — MVP |
| US3 | Homeowner | Create a renovation project with multiple rooms | I can plan my entire home overhaul in one place | P0 — MVP |
| US4 | Homeowner | Compare before and after side by side | I can see the impact of planned changes clearly | P0 — MVP |
| US5 | Homeowner | Track budget per room and per category | I can control renovation costs and avoid overruns | P0 — MVP |
| US6 | Homeowner | Share my project with family members | We can make renovation decisions together | P0 — MVP |
| US7 | Homeowner | Browse design templates for kitchens, bathrooms, living rooms | I get inspiration and starting points for my renovation | P0 — MVP |
| US8 | Architect | Create a project on behalf of a client | I can manage client renovations professionally | P0 — MVP |
| US9 | Architect | Generate before/after visualizations for client proposals | I can present compelling, realistic design options | P0 — MVP |
| US10 | Architect | Share project with client for review and approval | Clients can see and approve designs remotely | P0 — MVP |
| US11 | Homeowner | Visualize new kitchen cabinets and countertops | I can plan kitchen remodeling with realistic preview | P0 — MVP |
| US12 | Homeowner | See how new flooring looks in my living room | I can choose between tile, wood, marble options visually | P0 — MVP |
| US13 | Architect (Org) | Manage team members and assign projects | Our firm can collaborate efficiently on client work | P1 — Phase 2 |
| US14 | Homeowner | View furniture in 3D before placing in room | I can check dimensions and style fit before purchasing | P1 — Phase 2 |
| US15 | Homeowner | Use AR to see changes overlaid on live camera feed | I get the most immersive preview experience | P1 — Phase 2 |
| US16 | Architect | Generate a Bill of Quantities (BOQ) from design | I can provide clients with accurate material estimates | P2 — Phase 3 |
| US17 | Homeowner | Find contractors by specialty in my area | I can hire verified professionals for execution | P2 — Phase 3 |
| US18 | Homeowner | Get AI-powered design suggestions based on my style | I discover options I wouldn't have thought of myself | P1 — Phase 2 |

### User Journey Maps

#### Primary Journey — Homeowner Room Visualization (MVP)
1. User opens app → sees dashboard with "Create New Project" CTA
2. Creates project → names it (e.g., "Flat 302 Renovation"), sets overall budget
3. Adds a room → selects room type (bathroom, kitchen, bedroom, living room, etc.)
4. Captures room photo using phone camera (or uploads existing photo)
5. AI detects room elements (walls, floor, ceiling, fixtures) via SAM segmentation
6. User selects renovation category: Civil | Furnishings | Bathroom | Kitchen | Electrical | Other
7. Within category, selects specific change (e.g., Bathroom → Tiles → selects tile pattern/color)
8. AI generates visualization of the room with the applied change
9. User views before/after comparison using slider
10. Saves design to project → can apply additional changes or move to next room
11. Reviews project summary: all rooms, all changes, total budget impact
12. Shares project with family/contractor for feedback

#### Secondary Journey — Architect Client Proposal
1. Architect logs in → sees client project dashboard
2. Creates new project for client → adds client details
3. Visits client site → captures room photos for all rooms in scope
4. For each room: applies design changes across categories, generates visualizations
5. Curates best options into a proposal view
6. Shares proposal link with client
7. Client reviews visualizations, adds comments/feedback
8. Architect revises based on feedback → client approves
9. Final approved designs become the project specification

## 5. Feature Requirements

### MVP Features (Release 1)

| # | Feature | Description | Priority | Acceptance Criteria |
|---|---------|-------------|----------|-------------------|
| F1 | User Registration & Profiles | Email/password + Google OAuth signup. Profile types: Homeowner, Architect (Individual), Architect (Organization). | P0 | User can register, login, set profile type, update profile |
| F2 | Project Management | Create, edit, delete renovation projects. Set project name, description, overall budget, timeline. List all rooms in project. | P0 | User can CRUD projects, add/remove rooms, set budget |
| F3 | Room Management | Add rooms to project. Room types: bathroom, kitchen, bedroom, living room, dining room, balcony, utility, custom. Room photos (capture + upload). | P0 | User can add rooms with type and photos, edit room details |
| F4 | Photo Capture & Upload | In-app camera capture (via web camera API) and gallery upload. Support JPEG/PNG, up to 20MB. Auto-orientation and basic compression. | P0 | Photos captured/uploaded, stored in R2, displayed in room view |
| F5 | AI Room Segmentation | SAM-based detection of room elements (walls, floor, ceiling, windows, doors, fixtures). Elements become selectable/editable layers. | P0 | Room photo segmented into identifiable elements with 80%+ accuracy |
| F6 | Category-Based Visualization | Select renovation category (Civil, Furnishings, Bathroom, Kitchen, Electrical, Other) and sub-category. Apply visual changes: color, texture, material, fixture replacement. AI generates modified room image. | P0 | User can select category → sub-option → see AI-generated visualization |
| F7 | Before/After Comparison | Side-by-side and slider-based comparison of original photo vs. AI-generated visualization. Swipe/drag to reveal. | P0 | Smooth slider interaction, instant rendering, works on mobile |
| F8 | Photo Editing Tools | Basic editing via Fabric.js: color adjustment, texture overlay, annotation/markup, text labels, undo/redo. Canvas state serialization (save/resume editing). | P0 | User can edit, annotate, save state, and resume later |
| F9 | Design Templates Library | Pre-built design templates organized by room type and category. E.g., "Modern Minimalist Bathroom," "Rustic Kitchen," "Contemporary Living Room." | P0 | Templates browsable by room type and category, applicable to user photos |
| F10 | Budget Tracking | Set budget per project, per room, and per category. Track estimated vs. actual spending. Visual budget summary (charts). | P0 | Budget editable at all levels, summary view with charts |
| F11 | Project Sharing & Collaboration | Share project via link. Roles: Owner, Editor, Viewer. Real-time status updates via WebSocket. Comments on rooms/visualizations. | P0 | Link sharing works, role permissions enforced, comments functional |
| F12 | Save & Export | Save all visualizations to project. Export before/after images as JPEG/PNG. Export project summary as PDF. | P0 | Downloads work on Android Chrome, file quality maintained |
| F13 | Responsive Mobile-First UI | Material Design 3 aesthetic. Bottom tab navigation. Optimized for 360px+ screens. Touch-friendly controls (pinch-zoom, swipe). | P0 | Passes mobile usability audit, smooth on mid-range Android devices |

### Future Features (Post-MVP)

| # | Feature | Description | Target Release | Notes |
|---|---------|-------------|---------------|-------|
| F14 | AR Room Overlay | WebXR-based real-time AR — overlay design changes on live camera feed | Phase 2 | Depends on WebXR maturity on Android Chrome |
| F15 | 3D Model Previews | Three.js-based 3D viewing of furniture, fittings, fixtures before placement | Phase 2 | Foundation laid in MVP via Three.js inclusion |
| F16 | Video Walkthrough Generation | Generate before/after video walkthrough of entire project (room to room) | Phase 2 | FFmpeg server-side stitching |
| F17 | AI Design Suggestions | AI recommends design options based on user style preferences and room type | Phase 2 | Requires user preference data from MVP usage |
| F18 | Team Collaboration (Org) | Multi-member organizations: invite team, assign projects, role management | Phase 2 | Architecture ready in MVP RBAC model |
| F19 | 3D Room Modeling from Photos | Generate 3D room model from 2D photos for spatial planning | Phase 2 | Emerging tech — evaluate feasibility |
| F20 | Material/Product Catalog | Real brand products (tiles, sanitary ware, furniture, countertops) with pricing | Phase 3 | Requires vendor partnerships |
| F21 | Contractor Directory | Find contractors by specialty (civil, plumbing, electrical, carpentry, painting) and location | Phase 3 | Requires contractor onboarding |
| F22 | BOQ Generation | Auto-generate Bill of Quantities from design — materials, quantities, estimated costs | Phase 3 | Requires product catalog (F20) |
| F23 | Cost Estimation Engine | AI-powered cost estimation based on room size, materials, labor rates by location | Phase 3 | Requires market data integration |
| F24 | White-Label Option | Architecture firms can brand the platform with their own logo/colors for client-facing use | Phase 3 | Subscription-tier feature |

### Explicitly Out of Scope
- Actual structural engineering certification or load-bearing analysis
- Government permit or regulatory filing
- Direct material procurement / e-commerce (MVP)
- Licensed plumbing or electrical plan signing
- Real estate valuation or appraisal
- Full CAD/BIM-level design capabilities
- Physical contractor hiring and payment processing (MVP)

## 6. Information Architecture

### Main Sections (Homeowner)
1. **Home / Dashboard** — Project overview, recent activity, quick actions
2. **My Projects** — List of all renovation projects with status
3. **Visualize** (+) — Camera capture / upload → category-based editing
4. **Design Library** — Templates and inspiration organized by room type and category (Civil, Furnishings, Bathroom, Kitchen, Other)
5. **Profile & Settings** — Account, preferences, subscription, notifications

### Additional Sections (Architect)
6. **Client Management** — Client list, project assignments, shared proposals
7. **Portfolio** — Showcase completed projects (before/after gallery)
8. **Team** (Org only) — Member management, role assignments, activity

### Navigation Model
- **Primary:** Bottom tab bar (Home, Projects, Capture [+], Library, Profile)
- **Contextual:** Top app bar within project/room views with breadcrumb navigation
- **Secondary:** Slide-out drawer for settings, help, feedback

## 7. UI/UX Requirements

### Design System
- Material Design 3 (Android-primary aesthetic)
- Clean, modern, visual-content-forward layout
- Large image previews and thumbnails throughout
- Neutral color palette with accent colors for CTAs

### Accessibility
- WCAG 2.1 AA compliance
- Minimum touch target size: 48x48dp
- Color contrast ratio: 4.5:1 minimum
- Screen reader support for critical flows
- Alt text for all generated visualizations

### Responsive Requirements
- **Primary:** Android phones (360px–430px width)
- **Secondary:** Android tablets (600px–900px)
- **Tertiary:** Desktop browsers (1024px+)
- All layouts fluid, no horizontal scrolling

### Key Screens (MVP)
1. Onboarding / Registration
2. Dashboard (empty state + populated)
3. Project list + Project detail
4. Room detail with photo gallery
5. Camera capture screen
6. Visualization editor (Fabric.js canvas with category sidebar)
7. Before/After comparison (slider view)
8. Design template browser
9. Budget tracker (per project / per room / per category)
10. Share/collaboration view
11. Profile & Settings

### Interaction Patterns
- Swipe left/right: before/after comparison
- Pinch-zoom: photo/visualization detail
- Drag-and-drop: furniture/fixture placement
- Long-press: element selection on room photo
- Pull-to-refresh: project updates

## 8. Success Metrics & KPIs

| Metric | Target (MVP Launch + 3 months) | Measurement Method |
|--------|-------------------------------|-------------------|
| Registered Users | 10,000 | PostHog analytics |
| Monthly Active Users (MAU) | 3,000 | PostHog analytics |
| Projects Created | 500+ | Database query |
| Visualizations Generated | 5,000+ | AI job queue metrics |
| 30-Day Retention | 60%+ | Cohort analysis (PostHog) |
| Average Visualizations per User | 5+ | Database query |
| Before/After Shares | 200+ | Share event tracking |
| Architect Signups | 50+ | Registration analytics |
| App Rating (Play Store via TWA) | 4.0+ | Play Store reviews |
| Visualization Generation Success Rate | 95%+ | AI pipeline monitoring |
| Average Generation Time (CPU) | <60 seconds | Job queue metrics |
| NPS Score | 40+ | In-app survey |

## 9. Assumptions & Constraints

### Assumptions
- Users have smartphones with cameras capable of 8MP+ photos
- Users are willing to photograph their spaces and upload to the platform
- Internet connectivity is available for AI processing (offline mode limited to viewing saved visualizations)
- Market demand exists for accessible, non-professional interior visualization tools
- AI image generation quality (Stable Diffusion + ControlNet) is sufficient for realistic, trustworthy previews at the category level (wall colors, flooring, tiles, fixtures)
- Users will accept 30-60 second generation times during MVP (CPU inference)
- Free-tier users will convert to paid tiers once value is demonstrated

### Constraints
- **Budget:** Zero third-party cost during development. Minimal cost at launch (~€40-50/month hosting). Revenue must cover costs within 6-12 months.
- **Team:** Small team (3-8 developers assumed). Full-stack TypeScript skills required.
- **Android-first:** Must work on all platforms via web, but Android Chrome is the optimization target.
- **AI/ML compute:** CPU inference only for MVP. GPU investment deferred until unit economics justify it.
- **No native app:** PWA + TWA only. No React Native or native Android development.
- **Privacy:** User home photos are sensitive personal data. All processing must happen on owned infrastructure (no third-party AI APIs for MVP).

## 10. Release Strategy

### Approach: Phased Soft Launch
1. **Closed Alpha** (Internal) — Core team + 20-30 trusted users. Validate core visualization pipeline, catch critical bugs.
2. **Closed Beta** — 100-200 users (80% homeowners, 20% architects). Collect feedback on visualization quality, UX flow, and feature gaps. Invite-only.
3. **Open Beta** — Waitlist-based public access. Play Store listing via TWA. Monitor performance at scale (100-1,000 concurrent users).
4. **Public Launch** — Open registration. Marketing push. Full feature set validated.

### Initial Target Users
- Tech-savvy homeowners in metro areas actively planning or undergoing renovation
- Individual architects/designers looking for affordable client presentation tools
- Home renovation communities (Reddit, Facebook groups, YouTube renovation channels)

### Feedback & Iteration Plan
- In-app feedback widget (accessible from every screen)
- Monthly user interviews (5-10 users per round)
- Analytics-driven feature prioritization (PostHog funnels)
- 2-week sprint cycles with user feedback integration
- Public roadmap for transparency (optional)

### Launch Success Criteria
- 95%+ uptime during first month
- <5% error rate in AI visualization pipeline
- 60%+ of beta users create at least one complete project
- Positive qualitative feedback on visualization quality from 70%+ of surveyed users

## 11. Dependencies

| Dependency | Status | Impact if Not Ready |
|-----------|--------|-------------------|
| Stable Diffusion + ControlNet model optimization for CPU | Not started | Core USP blocked — must be validated early |
| SAM model for room segmentation | Available (open-source) | Segmentation quality affects all visualization features |
| Interior design training/fine-tuning dataset | Not started | AI quality depends on domain-specific examples |
| Cloudflare R2 account setup | Not started | Photo storage blocked — low risk (quick setup) |
| Google OAuth API credentials | Not started | Social login unavailable — fallback to email/password |
| Design template content creation | Not started | Empty template library at launch — need initial seed content |
| Play Store developer account | Not started | TWA listing blocked — $25 one-time, quick process |

## 12. Open Questions

1. **Monetization Model:** Freemium with usage limits? Subscription tiers? Per-visualization pricing? Architect vs. homeowner pricing differentiation?
2. **AI Fine-Tuning Data:** Where do we source interior design before/after training images? Open datasets? Partnerships with renovation companies? User-contributed (with consent)?
3. **Offline Capability:** Should MVP support offline viewing of saved projects, or require constant connectivity?
4. **Internationalization:** Is the MVP English-only, or should we support Hindi and regional languages from the start (given Indian market focus)?
5. **Content Moderation:** How do we handle inappropriate content in shared projects or uploaded photos beyond automated scanning?
6. **Architect Verification:** Should architects be verified (credentials check) before getting professional features, or is self-declaration sufficient?
7. **Data Retention:** How long do we store AI-generated visualizations for free-tier users? Indefinitely or with expiry?
