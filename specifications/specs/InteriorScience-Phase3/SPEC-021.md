# SPEC-021 — Template Seed Data & WebSocket

**Parent Feature:** InteriorScience Phase 3
**Spec Number:** 021 of 022 (Phase 3: 5 of 6)
**Prerequisites:** SPEC-017

## Status: Not Started

### 1. Objective

Populate the design template library with 12 seed templates (2 per room type) so the Library tab has useful content, and implement a Socket.IO WebSocket gateway for real-time updates to job status, comments, and notifications.

- **Before:** Library page exists but shows an empty state because the templates table has no data. Notification bell and job status use polling with delays. No real-time communication.
- **After:** 12 system templates with Sharp-generated thumbnails appear in the Library page. WebSocket gateway pushes job:status, comment:new, and notification:new events to connected clients. JobStatus component uses WebSocket with polling fallback. NotificationBell updates instantly.
- **Success criteria:** `npx prisma db seed` populates 12 templates with thumbnails. Library page displays templates with filtering by room type. Socket.IO gateway authenticates via JWT. Real-time events deliver within 1 second. WebSocket auto-reconnects with backoff (P3-DC-6). Token refresh on WS auth error (P3-E5). Polling fallback works when WebSocket unavailable.

### 2. Architecture

```
Template Seed Data:
  apps/api/prisma/seed.ts
    ├── Define 12 templates (2 per room type):
    │   ├── Bathroom: "Modern Minimalist Bathroom", "Spa-Inspired Bathroom"
    │   ├── Kitchen: "Contemporary Open Kitchen", "Rustic Farmhouse Kitchen"
    │   ├── Bedroom: "Scandinavian Bedroom", "Cozy Industrial Bedroom"
    │   ├── Living Room: "Mid-Century Modern Living", "Coastal Casual Living"
    │   ├── Dining Room: "Elegant Formal Dining", "Bohemian Dining Space"
    │   └── Balcony: "Urban Garden Balcony", "Minimalist Zen Balcony"
    ├── For each template:
    │   ├── Generate placeholder thumbnail via Sharp (400x300 colored rectangle + text)
    │   └── Save thumbnail to uploads/ directory
    └── Insert templates with isSystem: true

WebSocket Gateway:
  apps/api/src/common/gateways/events.gateway.ts
    ├── @WebSocketGateway({ cors: true, namespace: '/events' })
    ├── Authentication: JWT token from handshake auth/query
    │   ├── Verify token via JwtService
    │   ├── Attach userId to socket.data
    │   └── Reject connection on invalid token
    ├── Client joins rooms on connection:
    │   └── socket.join(`user:${userId}`) — for user-specific events
    ├── Server emits:
    │   ├── job:status → { jobId, status, progress?, result? }
    │   ├── comment:new → { comment object }
    │   └── notification:new → { notification object }
    └── Register in AppModule (or CommonModule)

Frontend Socket Client:
  apps/web/lib/socket-client.ts
    ├── Create socket.io-client instance
    ├── Connect with JWT token in auth
    ├── Auto-reconnect with exponential backoff (P3-DC-6)
    ├── Token refresh on auth error (P3-E5)
    └── Export: useSocket() hook or singleton
```

### 3. Design Constraints

- P3-DC-6: WebSocket MUST auto-reconnect with exponential backoff. Fallback to polling if WebSocket is unavailable. Non-critical — app fully works without real-time.
- P3-DC-3: Snackbar notifications for template actions and connection state changes.
- P3-DC-8: All Phase 1 and Phase 2 constraints remain in effect.
- P3-E5: Token expires while WebSocket connected -> WebSocket catches auth error -> disconnect -> apiClient refreshes token -> reconnect with new token.
- P3-E6: User clicks "Apply Template" but has no projects -> Show prompt to create a project first with CTA button.

### 4. Detailed Design

#### 4a. Database / Schema Changes
- None — Template model already exists in Prisma schema with fields: id, name, description, category, roomType, thumbnailUrl, isSystem, createdAt, updatedAt.

#### 4b. Backend / API Changes

**File: `apps/api/prisma/seed.ts`** (CREATE or UPDATE)
- Define seed data for 12 templates, organized by room type:

```
Templates:
  Bathroom:
    1. "Modern Minimalist Bathroom" — BATHROOM_CAT — "Clean lines, white tiles, floating vanity, rain shower"
    2. "Spa-Inspired Bathroom" — BATHROOM_CAT — "Natural stone, wooden accents, freestanding tub, ambient lighting"
  Kitchen:
    3. "Contemporary Open Kitchen" — KITCHEN_CAT — "Handleless cabinets, quartz countertops, island with seating"
    4. "Rustic Farmhouse Kitchen" — KITCHEN_CAT — "Shaker cabinets, butcher block, apron sink, open shelving"
  Bedroom:
    5. "Scandinavian Bedroom" — FURNISHINGS — "Light wood, white textiles, minimal decor, pendant lighting"
    6. "Cozy Industrial Bedroom" — FURNISHINGS — "Exposed brick, metal frames, warm textiles, Edison bulbs"
  Living Room:
    7. "Mid-Century Modern Living" — FURNISHINGS — "Tapered legs, organic shapes, warm wood, statement lighting"
    8. "Coastal Casual Living" — FURNISHINGS — "Neutral palette, natural textures, rattan accents, blue tones"
  Dining Room:
    9. "Elegant Formal Dining" — FURNISHINGS — "Chandelier, upholstered chairs, dark wood table, wainscoting"
    10. "Bohemian Dining Space" — FURNISHINGS — "Mixed chairs, macrame, plants, colorful textiles, low lighting"
  Balcony:
    11. "Urban Garden Balcony" — FURNISHINGS — "Vertical planters, bistro set, string lights, herb garden"
    12. "Minimalist Zen Balcony" — FURNISHINGS — "Floor cushions, bamboo screen, stone accents, water feature"
```

- Thumbnail generation via Sharp:
  - 400x300 pixel colored rectangle (color based on room type — e.g., blue for bathroom, green for kitchen, warm beige for bedroom, etc.)
  - Text overlay via SVG: room type label (top) + template name (center) + category badge (bottom)
  - Save to uploads/templates/ directory as PNG
  - Set thumbnailUrl to relative path: /api/media/files/templates/{filename}.png

- Seed execution:
  - Upsert templates by name (idempotent — safe to re-run)
  - Create uploads/templates/ directory if it does not exist
  - Add to package.json prisma.seed: "ts-node apps/api/prisma/seed.ts"

**File: `apps/api/src/common/gateways/events.gateway.ts`** (CREATE)
- Socket.IO gateway using @nestjs/websockets decorators.

```ts
@WebSocketGateway({ cors: true, namespace: '/events' })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    try {
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
    } catch {
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Cleanup if needed
  }

  // Called by other services to emit events
  emitJobStatus(userId: string, data: { jobId: string; status: string; progress?: number; result?: any }) {
    this.server.to(`user:${userId}`).emit('job:status', data);
  }

  emitNewComment(userId: string, data: { comment: any }) {
    this.server.to(`user:${userId}`).emit('comment:new', data);
  }

  emitNotification(userId: string, data: { notification: any }) {
    this.server.to(`user:${userId}`).emit('notification:new', data);
  }
}
```

- EventsGateway must be registered in a dedicated module so it can be injected into other services (AI, Comments, Notifications).

**File: `apps/api/src/common/gateways/gateway.module.ts`** (CREATE)
- NestJS module exporting EventsGateway as both a provider and an export, so other modules can inject it.
- Imports: JwtModule (needed by EventsGateway for token verification).

**File: `apps/api/src/app.module.ts`** (MODIFY)
- Add GatewayModule to the imports array (not EventsGateway directly as a provider — it must be in a module so other modules like AiModule, CommentsModule, and NotificationsModule can import it for injection).
- Ensure @nestjs/websockets and socket.io are available (already installed per TRD).

**File: `apps/api/src/ai/ai.service.ts`** (MODIFY — optional enhancement)
- After job status changes (processing, completed, failed), call eventsGateway.emitJobStatus() to push real-time update.
- Inject EventsGateway via constructor.

**File: `apps/api/src/comments/comments.service.ts`** (MODIFY — optional enhancement)
- After new comment created, call eventsGateway.emitNewComment() for project members.

**File: `apps/api/src/notifications/notifications.service.ts`** (MODIFY — optional enhancement)
- After new notification created, call eventsGateway.emitNotification() for the target user.

#### 4c. Frontend / UI Changes

**File: `apps/web/lib/socket-client.ts`** (CREATE)
- Socket.IO client singleton with connection management:

```ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;

  const baseUrl = `${window.location.protocol}//${window.location.hostname}:4000`;
  socket = io(`${baseUrl}/events`, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,          // Start at 1s
    reconnectionDelayMax: 30000,      // Max 30s (exponential backoff)
    timeout: 10000,
  });

  socket.on('connect_error', (err) => {
    if (err.message === 'Authentication failed') {
      // P3-E5: Attempt token refresh and reconnect
      refreshTokenAndReconnect();
    }
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
```

- Install socket.io-client in apps/web: `pnpm add socket.io-client`

**File: `apps/web/lib/use-socket.ts`** (CREATE)
- React hook wrapping socket connection lifecycle:
  - Connect on mount (with token from useAuth).
  - Disconnect on unmount.
  - Provide on/off event listener helpers.
  - Expose isConnected state.

**File: `apps/web/components/ai/job-status.tsx`** (MODIFY)
- Update to use WebSocket for job:status events instead of polling.
- Fallback: if socket is not connected (getSocket() returns null or isConnected is false), fall back to existing polling behavior.
- On 'job:status' event matching current jobId -> update status display immediately.

**File: `apps/web/components/notifications/notification-bell.tsx`** (MODIFY)
- Listen for 'notification:new' WebSocket event.
- On receive: increment unread count badge, prepend notification to list.
- Fallback: existing polling for notification count still runs as backup.

**File: `apps/web/package.json`** (MODIFY)
- Add dependency: socket.io-client

#### 4d. Shared / Cross-cutting Changes
- @nestjs/websockets and socket.io already installed in apps/api (per TRD).
- socket.io-client is a new frontend dependency.
- EventsGateway is a singleton — injected into services that need to emit events.
- WebSocket is non-critical infrastructure. All features work without it (polling fallback). The gateway failing should not break the application.

### 5. File Manifest & Impact Analysis

| Action | File Path | What Changes | Risk Level |
|--------|-----------|-------------|------------|
| CREATE/UPDATE | apps/api/prisma/seed.ts | 12 template seed entries with Sharp-generated thumbnails | Med |
| CREATE | apps/api/src/common/gateways/events.gateway.ts | Socket.IO gateway with JWT auth, event emission methods | High |
| CREATE | apps/web/lib/socket-client.ts | Socket.IO client singleton, connect/disconnect, auto-reconnect | Med |
| CREATE | apps/web/lib/use-socket.ts | React hook for socket connection lifecycle | Med |
| CREATE | apps/api/src/common/gateways/gateway.module.ts | NestJS module wrapping EventsGateway, exports it for injection | Low |
| MODIFY | apps/api/src/app.module.ts | Import GatewayModule in imports array | Low |
| MODIFY | apps/api/src/ai/ai.service.ts | Emit job:status events via gateway (optional) | Med |
| MODIFY | apps/api/src/comments/comments.service.ts | Emit comment:new events via gateway (optional) | Med |
| MODIFY | apps/api/src/notifications/notifications.service.ts | Emit notification:new events via gateway (optional) | Med |
| MODIFY | apps/web/components/ai/job-status.tsx | Use WebSocket for status updates, polling fallback | Med |
| MODIFY | apps/web/components/notifications/notification-bell.tsx | Real-time notification updates via WebSocket | Med |
| MODIFY | apps/web/package.json | Add socket.io-client dependency | Low |

### 6. Dependency & Reference Check

#### Template Seed
- Prisma schema: Template model must have fields: name, description, category (enum), roomType (enum or string), thumbnailUrl, isSystem (Boolean).
- uploads/templates/ directory must be created during seed (mkdir -p).
- Sharp is available in apps/api for thumbnail generation.
- Media endpoint (/api/media/files/*) must serve static files from uploads/ — verify this route exists and serves the templates/ subdirectory.
- Seed script referenced in package.json prisma.seed field.

#### WebSocket Backend
- @nestjs/websockets — installed (per TRD). Verify in apps/api/package.json.
- socket.io — installed (per TRD). Verify in apps/api/package.json.
- JwtService — available from AuthModule. EventsGateway needs JwtModule imported or JwtService injected.
- EventsGateway methods (emitJobStatus, etc.) called by AI service, comments service, notifications service. These services need EventsGateway injected.

#### WebSocket Frontend
- socket.io-client — new dependency for apps/web.
- useAuth() hook provides token for WebSocket authentication.
- Existing polling logic in job-status.tsx and notification-bell.tsx must be preserved as fallback.
- API port (4000) used in socket connection URL. Must match backend configuration.

### 7. Implementation Plan

**Step 1:** Install socket.io-client
- File: apps/web/package.json
- Action: modify
- Details: Add socket.io-client to dependencies. Run pnpm install.

**Step 2:** Create seed script
- File: apps/api/prisma/seed.ts
- Action: create (or update if exists)
- Details: Define 12 templates. For each: generate 400x300 colored PNG thumbnail via Sharp with room type + name text overlay. Save to uploads/templates/. Upsert template records with isSystem: true. Add prisma.seed to package.json.

**Step 3:** Create WebSocket gateway
- File: apps/api/src/common/gateways/events.gateway.ts
- Action: create
- Details: Socket.IO gateway with /events namespace. JWT authentication in handleConnection. User rooms (`user:${userId}`). Emit methods: emitJobStatus, emitNewComment, emitNotification.

**Step 4:** Create GatewayModule and register in AppModule
- Files: apps/api/src/common/gateways/gateway.module.ts (create), apps/api/src/app.module.ts (modify)
- Action: create + modify
- Details: Create GatewayModule that provides and exports EventsGateway (imports JwtModule). Add GatewayModule to AppModule imports array. Other modules (AiModule, CommentsModule, NotificationsModule) that need to emit events must also import GatewayModule.

**Step 5:** Wire gateway into backend services
- Files: apps/api/src/ai/ai.service.ts, comments/comments.service.ts, notifications/notifications.service.ts
- Action: modify
- Details: Inject EventsGateway. Call emit methods after relevant state changes (job completed, comment created, notification created).

**Step 6:** Create frontend socket client
- File: apps/web/lib/socket-client.ts
- Action: create
- Details: Singleton socket.io-client. connectSocket(token), disconnectSocket(), getSocket(). Auto-reconnect with exponential backoff (1s to 30s). Handle auth errors by refreshing token and reconnecting (P3-E5).

**Step 7:** Create useSocket hook
- File: apps/web/lib/use-socket.ts
- Action: create
- Details: React hook that connects on mount, disconnects on unmount. Provides on/off helpers and isConnected state.

**Step 8:** Update JobStatus component
- File: apps/web/components/ai/job-status.tsx
- Action: modify
- Details: Listen for 'job:status' WebSocket event. Update status immediately on receive. Fall back to polling if socket not connected.

**Step 9:** Update NotificationBell component
- File: apps/web/components/notifications/notification-bell.tsx
- Action: modify
- Details: Listen for 'notification:new' event. Increment badge count, prepend to notification list. Polling continues as fallback.

**Step 10:** Run seed
- Command: npx prisma db seed
- Details: Verify 12 templates created. Verify thumbnails exist in uploads/templates/. Verify Library page displays templates.

### 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Seed script fails if uploads/ directory does not exist | Low | Create uploads/templates/ directory in seed script (mkdir -p equivalent via fs.mkdirSync recursive). |
| Seed overwrites manually-created templates | Low | Upsert by name + isSystem:true. Only touches system templates. User-created templates untouched. |
| WebSocket connection drops on mobile networks | Med | P3-DC-6: Auto-reconnect with exponential backoff (1s to 30s). Polling fallback ensures functionality. |
| JWT token expires during WebSocket session | Med | P3-E5: Catch auth error on connect_error. Refresh token via apiClient. Reconnect with new token. |
| WebSocket gateway crashes and takes down the API | High | Gateway is isolated via NestJS lifecycle. Catch all errors in handleConnection. Gateway failure should not affect REST endpoints. |
| Socket.IO version mismatch between server and client | Med | Pin both socket.io (server) and socket.io-client to compatible major versions. socket.io@4 + socket.io-client@4. |
| Multiple tabs open — duplicate WebSocket connections | Low | Each tab has its own connection. Server emits to user room — all tabs receive. Acceptable for MVP. |
| Sharp thumbnail generation fails in CI/Docker | Low | Sharp uses pre-built binaries for most platforms. Fallback: skip thumbnail generation, use null thumbnailUrl. |

### 9. Testing Strategy (MANDATORY — 3 Tiers)

#### 9a. Unit Tests
- Seed script: 12 templates defined with correct structure (name, description, category, roomType)
- Seed script: each template has unique name
- Seed script: Sharp generates 400x300 PNG buffer without error
- EventsGateway.handleConnection: valid JWT -> client joins user room
- EventsGateway.handleConnection: invalid JWT -> client disconnected
- EventsGateway.emitJobStatus: emits to correct user room
- EventsGateway.emitNewComment: emits to correct user room
- EventsGateway.emitNotification: emits to correct user room
- socket-client.ts: connectSocket creates socket instance with auth token
- socket-client.ts: disconnectSocket sets socket to null
- useSocket hook: connects on mount, disconnects on unmount

#### 9b. Integration Tests
- Seed execution: 12 templates inserted in database with isSystem: true
- Seed execution: thumbnail files exist in uploads/templates/
- Seed re-run: idempotent — no duplicate templates
- WebSocket: client connects with valid JWT -> receives welcome / joins room
- WebSocket: client connects with expired JWT -> disconnected with error
- WebSocket: server emits job:status -> client receives event within 1s
- WebSocket: server emits notification:new -> client receives event
- JobStatus component: receives WebSocket update -> UI updates without polling
- JobStatus component: socket not connected -> falls back to polling
- NotificationBell: receives WebSocket notification -> badge count increments
- Library page: displays 12 templates after seed
- Library page: filtering by room type works (e.g., Bathroom shows 2 templates)

#### 9c. E2E UI Automation Tests
- Library tab -> 12 templates visible with thumbnails
- Library tab -> filter by "Bathroom" -> 2 templates shown
- Library tab -> filter by "Kitchen" -> 2 templates shown
- Template card shows name, description, category badge
- Start a visualization job -> job status updates in real-time (no 5s polling delay)
- Receive a notification -> bell icon badge updates without page refresh
- Disconnect network briefly -> WebSocket reconnects automatically
- Close and reopen tab -> WebSocket reconnects with token

### 10. Verification Criteria
- [ ] `npx prisma db seed` runs without errors
- [ ] 12 templates exist in database with isSystem: true
- [ ] Each template has name, description, category, roomType, thumbnailUrl
- [ ] Thumbnail PNG files exist in uploads/templates/ (12 files, 400x300 each)
- [ ] Library page displays all 12 templates with thumbnails
- [ ] Library page filtering by room type works correctly
- [ ] socket.io-client installed in apps/web
- [ ] EventsGateway registered and accepting connections on /events namespace
- [ ] WebSocket authenticates via JWT token in handshake
- [ ] Invalid JWT -> connection rejected with error message
- [ ] job:status event delivered to correct user within 1 second
- [ ] comment:new event delivered to correct user
- [ ] notification:new event delivered to correct user
- [ ] JobStatus component updates via WebSocket when connected
- [ ] JobStatus component falls back to polling when WebSocket unavailable
- [ ] NotificationBell updates badge in real-time via WebSocket
- [ ] WebSocket auto-reconnects after disconnection (P3-DC-6)
- [ ] Exponential backoff: reconnection delay increases (1s, 2s, 4s, ... up to 30s)
- [ ] Token refresh on WebSocket auth error (P3-E5)
- [ ] App fully functional without WebSocket (polling fallback)
