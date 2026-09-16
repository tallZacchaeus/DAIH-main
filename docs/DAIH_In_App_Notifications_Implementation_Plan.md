# DAIH In-App Notifications Implementation Plan

**Feature:** In-app notifications  
**Target apps:** Customer PWA first; reception/admin surfaces may follow  
**Architecture:** Express modular monolith, Prisma/PostgreSQL, transactional outbox, shared API client, Next.js app shell  
**Important UI constraint:** The existing notification bell in `apps/customer-pwa/components/dashboard/TopAppBar.tsx` must keep its current visual appearance. Behavior may be attached to the existing button, but do not redesign the bell or change the top bar layout in the first pass.

---

## 1. Current State

The platform already has several pieces that should be reused:

- Durable domain events are recorded through the transactional outbox.
- Email notifications are already queued through BullMQ in `apps/api/src/modules/notifications/`.
- Shared toast UI exists in `packages/ui/src/components/Toast.tsx`.
- Both `apps/customer-pwa` and `apps/reception-app` mount `ToastProvider`.
- The customer PWA top bar already renders a notification bell, but it is not wired to any data or behavior.

The missing piece is a persistent, user-facing notification store plus authenticated APIs and frontend state to read, display, and mark notifications.

---

## 2. Goals

1. Persist in-app notifications so they survive reloads and can support unread counts.
2. Create authenticated notification APIs for the current user.
3. Generate in-app notifications from existing domain events.
4. Expose notification methods through `@daih/api-client`.
5. Attach behavior to the existing customer PWA bell without changing its visual styling.
6. Use existing shared toasts for optional transient "new notification" feedback.

---

## 3. Non-Goals For First Pass

- Do not redesign the top bar or notification bell.
- Do not introduce WebSockets/SSE in the initial implementation.
- Do not replace the existing email notification queue.
- Do not add browser push notifications.
- Do not build a full notification preferences center.
- Do not create a separate visual toast system.

Polling is sufficient for the first pass and fits the current client architecture.

---

## 4. Data Model

Add a Prisma `Notification` model in `apps/api/src/db/prisma/schema.prisma`.

Suggested model:

```prisma
model Notification {
  id          String    @id @default(uuid())
  userId      String
  type        String
  title       String
  message     String
  linkHref    String?
  metadata    Json?
  readAt      DateTime?
  archivedAt  DateTime?
  createdAt   DateTime  @default(now())

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, readAt, createdAt])
  @@index([userId, archivedAt, createdAt])
  @@map("notifications")
}
```

Also add the reverse relation to `User`:

```prisma
notifications Notification[]
```

Optional idempotency enhancement:

```prisma
sourceEventId String? @unique
```

This can prevent duplicate in-app notifications if an outbox event is retried after a partial handler failure.

---

## 5. Backend Module

Create or expand the notifications module:

- `apps/api/src/modules/notifications/notifications.types.ts`
- `apps/api/src/modules/notifications/notifications.service.ts`
- `apps/api/src/modules/notifications/notifications.controller.ts`
- `apps/api/src/modules/notifications/notifications.routes.ts`

Mount the router in `apps/api/src/app.ts`:

```ts
app.use("/api/v1/notifications", notificationsRouter);
```

### Endpoints

All endpoints require `authenticate`.

| Method  | Route                                | Purpose                                       |
| ------- | ------------------------------------ | --------------------------------------------- |
| `GET`   | `/api/v1/notifications`              | List current user's notifications             |
| `GET`   | `/api/v1/notifications/unread-count` | Return unread notification count              |
| `PATCH` | `/api/v1/notifications/:id/read`     | Mark one notification as read                 |
| `PATCH` | `/api/v1/notifications/read-all`     | Mark all current user's notifications as read |
| `PATCH` | `/api/v1/notifications/:id/archive`  | Optional: archive one notification            |

### Service Behavior

- Scope every query by `req.user.id`.
- Never allow users to read or mutate another user's notifications.
- Default list limit: 20.
- Max list limit: 50.
- Sort newest first.
- Exclude archived notifications by default.
- Return `unreadCount` separately or via the unread count endpoint.

---

## 6. Event Mapping

Extend existing outbox handlers so in-app notifications are created alongside email queueing.

Initial customer events:

| Event                       | Recipient                  | Title                   | Link                                             |
| --------------------------- | -------------------------- | ----------------------- | ------------------------------------------------ |
| `booking.confirmed`         | booking owner              | Booking confirmed       | `/bookings` or `/qr?bookingId=...`               |
| `booking.rescheduled`       | booking owner              | Booking rescheduled     | `/bookings`                                      |
| `booking.cancelled`         | booking owner              | Booking cancelled       | `/bookings`                                      |
| `payment.successful`        | payer                      | Payment received        | `/bookings`                                      |
| `payment.failed`            | payer                      | Payment failed          | `/bookings`                                      |
| `payment.capacity_conflict` | payer and operations users | Booking needs attention | customer: `/bookings`, staff: future admin route |
| `access.checked_in`         | booking owner              | Check-in confirmed      | `/dashboard`                                     |
| `access.checked_out`        | booking owner              | Check-out recorded      | `/dashboard`                                     |

Implementation options:

1. Add helper methods to `notifications.service.ts`, for example `createForUser(...)` and `createFromOutboxEvent(...)`.
2. Call those helpers from existing event handlers in `apps/api/src/modules/events/handlers/`.
3. Keep email queue behavior unchanged.

For events whose payload only has `customerEmail`, resolve the user with Prisma before creating the notification.

---

## 7. Shared Types

Add `packages/types/src/notification.types.ts`:

```ts
export type NotificationType =
  | "booking.confirmed"
  | "booking.rescheduled"
  | "booking.cancelled"
  | "booking.reminder"
  | "access.checked_in"
  | "access.checked_out"
  | "payment.successful"
  | "payment.failed"
  | "payment.capacity_conflict"
  | "system";

export interface NotificationDTO {
  id: string;
  type: NotificationType | string;
  title: string;
  message: string;
  linkHref?: string | null;
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: NotificationDTO[];
  unreadCount: number;
  nextCursor?: string | null;
}

export interface NotificationUnreadCountResponse {
  unreadCount: number;
}
```

Export it from `packages/types/src/index.ts`.

---

## 8. API Client

Add an `api.notifications` namespace in `packages/api-client/src/client.ts`:

```ts
public notifications = {
  list: (options?: { limit?: number; cursor?: string }) => this.request<NotificationListResponse>(...),
  getUnreadCount: () => this.request<NotificationUnreadCountResponse>(...),
  markRead: (id: string) => this.request<NotificationDTO>(..., { method: "PATCH" }),
  markAllRead: () => this.request<{ success: boolean; unreadCount: number }>(..., { method: "PATCH" }),
};
```

Invalidate any local notification cache after mark-read or mark-all-read if cache helpers are used.

---

## 9. Customer PWA Wiring

Create:

- `apps/customer-pwa/components/notifications/NotificationProvider.tsx`
- `apps/customer-pwa/components/notifications/NotificationDropdown.tsx`
- `apps/customer-pwa/components/notifications/useNotifications.ts`

Provider behavior:

- Start only when `useAuth()` has an authenticated user.
- Fetch list and unread count on mount.
- Refetch on window focus.
- Poll every 30-60 seconds while authenticated.
- Clear notification state on logout.
- Use `useToast()` to show a transient toast only for newly seen notification IDs.

Attach behavior to the existing bell in `TopAppBar.tsx`:

- Preserve the current button styling.
- Add `onClick` to toggle the dropdown.
- Add ARIA state such as `aria-expanded`.
- Add an unread badge only if it can be positioned without changing the button's appearance or layout.
- Dropdown may be rendered adjacent to the existing button, absolutely positioned within the existing action area.
- Clicking a notification marks it as read and navigates to `linkHref` when present.
- Add a compact "Mark all read" control inside the dropdown.

---

## 10. Reception App Consideration

The reception app currently uses page-local action banners for scan/check-in/check-out actions. Do not wire the customer notification bell there in the first pass.

Later, staff-facing in-app notifications can be added for:

- capacity conflicts
- suspicious access attempts
- failed payment reconciliation
- operational announcements

That should be a separate scope because staff routing, roles, and notification priority are different from customer notifications.

---

## 11. Testing Plan

Backend:

- Unit test notification service formatting and ownership checks.
- Integration test listing notifications for the authenticated user.
- Integration test unread count.
- Integration test mark-one-read.
- Integration test mark-all-read.
- Event handler test: `booking.confirmed` creates a notification for the booking owner.
- Event handler test: duplicate `sourceEventId` does not create duplicate notifications if the idempotency field is added.

Frontend:

- Notification provider fetches only when authenticated.
- Bell click opens/closes dropdown.
- Dropdown renders unread and read states.
- Clicking an item calls mark-read and navigates if `linkHref` exists.
- Mark-all-read clears the unread count.
- Existing bell visual snapshot should remain unchanged aside from optional unread badge.

Manual:

1. Register or log in as customer.
2. Create a booking hold.
3. Complete or simulate successful payment.
4. Confirm a `booking.confirmed` outbox event creates an in-app notification.
5. Open the customer PWA dashboard.
6. Click the existing bell.
7. Confirm the notification appears.
8. Click the item and verify it is marked read.
9. Reload and confirm read state persists.

---

## 12. Rollout Steps

1. Add schema and migration.
2. Add notification service, controller, routes, and tests.
3. Wire domain event handlers.
4. Add shared DTOs.
5. Add API client namespace.
6. Add customer PWA provider and dropdown behavior.
7. Run API tests and frontend typecheck.
8. Verify manually against local/staging data.

---

## 13. Risks And Decisions

- **Duplicate notifications:** If outbox retries after partially completing a handler, duplicate rows are possible. Add `sourceEventId` if this is unacceptable.
- **Polling freshness:** Polling is not instant. Use focus refetch plus a 30-60 second interval for the first pass.
- **Unread badge constraint:** If the badge changes the bell appearance too much, keep unread count inside the dropdown only for the first pass.
- **Payload gaps:** Some events only include email or booking ID. The notification service should resolve full recipient and display data server-side.
- **Role-specific notifications:** Staff notifications need separate routing and priority rules; do not mix them into customer UX prematurely.
