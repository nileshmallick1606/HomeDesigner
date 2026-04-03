# Business Requirements Document — Replicate AI Visualization (Phase 1)

## 1. Executive Summary

- **Work type:** Enhancement
- **Summary:** Replace the mock Sharp color transforms in the AI visualization pipeline with real Stable Diffusion inference via Replicate's Cloud API. Users will see photorealistic room visualizations approaching competitor quality (Homestyler, Planner 5D). The existing BullMQ pipeline, before/after slider, and design management UX remain unchanged — only the image generation engine is swapped. Self-hosted fallback activates when Replicate is unavailable or unconfigured.

## 2. Business Context

- **Problem:** Current visualizations use Sharp color filters (tint, saturation shifts). Users can immediately tell these are fake, which undermines the core USP: "see your renovated space before a single wall is touched."
- **Current state:** Mock transforms produce color-shifted versions of the original photo. "AI Preview" watermark added. Results don't help users make real renovation decisions.
- **Desired future state:** Photorealistic AI-generated room images that show realistic material changes (tiles, paint, cabinets, flooring). Quality approaches commercial tools.
- **Business justification:** Without convincing visualizations, the product has no differentiation. Replicate integration costs ~$0.03/image, manageable at early scale.

## 3. Stakeholders

| Role | Interest |
|------|---------|
| Homeowner users | See convincing previews of renovation changes |
| Architect users | Present professional proposals to clients |
| Product owner | Core USP delivered, product-market fit validated |

## 4. Business Requirements

| # | Requirement | Priority | Acceptance Criteria |
|---|------------|----------|-------------------|
| RA-1 | Visualization engine uses Replicate Cloud API | P0 | AI worker calls Replicate instead of Sharp. Generated images are photorealistic. |
| RA-2 | One-time privacy consent before first AI use | P0 | Dialog shown on first "Generate" click. Consent stored in localStorage. Declining disables AI features. |
| RA-3 | Self-hosted fallback when Replicate unavailable | P0 | If API key missing, Replicate down, or timeout: fall back to existing Sharp transforms with note. |
| RA-4 | Quality preset support (Draft/Final) | P1 | Draft: faster/cheaper model. Final: higher quality model. Existing UI toggle works. |
| RA-5 | Model exploration — pick best for interior design | P1 | Evaluate Replicate models for interior visualization. Configure best option. |
| RA-6 | Existing rate limits apply | P1 | Free: 10/day, Paid: 50/day (currently set to unlimited for dev). Same enforcement. |
| RA-7 | No watermark on Replicate-generated images | P1 | Real AI outputs have no "AI Preview" watermark. Mock fallback keeps watermark. |

## 5. User Stories

| # | As a | I want to | So that |
|---|------|-----------|---------|
| US-RA-1 | Homeowner | See a photorealistic preview of my room with new tiles | I can make confident renovation decisions |
| US-RA-2 | Homeowner | Be informed before my photos are sent to cloud AI | I control my privacy |
| US-RA-3 | User | Still get visualizations when cloud AI is down | I'm never blocked from using the app |

## 6. Scope

**In scope (Phase 1):**
- Replicate API integration in AI worker
- Consent dialog on first AI use
- Self-hosted fallback
- Model selection for interior design
- Remove watermark on real AI outputs

**Out of scope (Phase 2 — separate BRD):**
- Segmentation-guided element selection UI
- Targeted inpainting (change only selected walls/floor)
- User-provided free-text prompts
- Stripe billing / per-user API key

## 7. Dependencies

| Dependency | Status | Impact |
|-----------|--------|--------|
| Replicate account + API token | Not created | Must sign up and add REPLICATE_API_TOKEN to env |
| Internet connectivity | Available | Required for cloud AI features |
| Existing BullMQ pipeline | Working | No changes needed |
| Existing prompt-builder.ts | Working | Reuse for prompt generation |

## 8. Success Metrics

- Generated images are clearly photorealistic (not color filters)
- Quality approaches competitor tools (Homestyler, Planner 5D)
- Response time: <30 seconds including Replicate processing
- Fallback works seamlessly when Replicate is unavailable
- Cost: <$5/day at current testing volume
