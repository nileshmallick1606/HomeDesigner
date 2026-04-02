# Technical Requirements Document — Apply Template to Room

## 1. Summary
Single backend endpoint + frontend flow for applying templates to rooms.

## 2. Architecture
```
Library page → Click "Apply to Room" → Dialog: select project → select room
  → POST /api/templates/:templateId/apply { roomId }
  → Backend: validate → create Design → queue AI job → copy canvasState
  → Redirect to /projects/:projectId/rooms/:roomId (job processes in background)
```

## 3. Design Constraints
- AT-DC-1: Reuse existing project/room fetching patterns (apiClient.fetch)
- AT-DC-2: Room must have at least 1 photo to apply template
- AT-DC-3: Follow existing visualization request flow (BullMQ queue)
- AT-DC-4: Use existing MUI dialog/select patterns

## 4. Edge Cases
| # | Question | Decision |
|---|----------|----------|
| AT-E1 | Room has no photos? | Show error message, disable apply button |
| AT-E2 | User has no projects? | Show "Create a project first" with CTA |
| AT-E3 | Rate limit hit? | Show error from API (existing rate limit handling) |
