# DAIH Milestone 1.5 — QR & Reception Implementation Plan

**Milestone:** 1.5 — QR & Reception  
**Phase:** Phase 1 — Minimum Viable Product  
**Target Window:** Weeks 9–10  
**Architecture:** Modular monolith with transactional outbox, BullMQ asynchronous job workers, and Next.js frontend clients  
**Companion Docs:** `docs/DAIH_Milestone_Plan.md`, `docs/DAIH_Technical_Design_Document.md`, `docs/DAIH_File_Structure.md`

---

## 1. Executive Summary & Objectives

Milestone 1.5 bridges digital reservations and physical workspace access. Upon payment confirmation, customers receive a cryptographically signed opaque digital access pass (QR token). At DAIH reception gates and security checkpoints, staff use the dedicated Reception & Security Terminal app to scan passes, inspect member identities, record check-ins and check-outs, enforce state machine transitions, and automatically reject invalid or early/expired passes with explicit error diagnostics.

In parallel, Milestone 1.5 delivers the live **Notification Engine** powered by BullMQ, enabling queued and retried transactional emails (booking confirmations, access passes, reminders, check-in welcome notices, and session summaries) with Resend and ZeptoMail fallback.

### Exit Criteria

1. **Full Operational Workflow**: Complete end-to-end flow in staging: `Book Space → Complete Payment → Receive Signed QR Pass → Scan at Reception Terminal → Verify & Check In → Midday Check Out → Re-Check In → Day End Completion` with all state transitions logged, timestamped, and auditable.
2. **Rejection Logic Matrix**: Reception app and API rigorously reject invalid-token scenarios with clear visual diagnostics:
   - Early check-in attempts before `startTime` (`TOO_EARLY`)
   - Expired pass / token past booking end time (`EXPIRED`)
   - **No-Show Unredeemed Pass** (`NO_SHOW`): Displays tamper-proof audit proof showing the pass was never scanned/redeemed during the scheduled window, accompanied by the strict No-Refund Policy notice and guidance for Admin discretionary rescheduling.
   - Cancelled booking (`CANCELLED`)
   - Unpaid / draft / held booking (`UNPAID`)
   - Already-completed pass (`COMPLETED`)
   - Tampered / forged signature (`INVALID_SIGNATURE`)
3. **Live Notifications**: Event-driven notification dispatch via BullMQ with automatic retries and Sentry monitoring.
4. **Admin Telemetry**: Real-time daily activity feed, live workspace occupancy, and customer access logs in the Admin Portal.

---

## 2. Confirmed Business & Access Rules

1. **Strict Check-In Window (No Early Check-In)**:
   - **Rule**: Check-in is **strictly blocked before `startTime`** (`now < startTime`).
   - **Rationale**: Check-in triggers internet access and credential issuance; early check-in would grant unauthorized extended internet time.
   - **Behavior**: Scans attempted before `startTime` return a strict `TOO_EARLY` / `OUT_OF_WINDOW_EARLY` rejection with the exact scheduled start time displayed. Check-in is permitted only when `now >= startTime` and `now < endTime`.

2. **Re-Check-In for Checked-Out Users (Same Day)**:
   - **Rule**: A checked-out user **is permitted to check back in** provided their `endTime` has not elapsed for that day.
   - **State Transition**: `CHECKED_OUT → CHECKED_IN` is allowed when `now < endTime`.
   - **Behavior**: If a member checks out earlier in the day and returns before their booking slot ends, scanning their pass allows reception to check them back in. Each entry/exit creates a distinct `VisitSession` record.

3. **Wi-Fi Credential Lifecycle & Continuous Day Access**:
   - **Fresh Daily Check-In (New Day)**:
     - On the **first check-in of each day**, a **fresh, unique Wi-Fi credential (username/PIN/voucher)** is generated/rotated with validity running through that day's `endTime`.
     - For multi-day or monthly plans, credentials rotate every day upon morning arrival.
   - **Midday Check-Out & Same-Day Re-Entry**:
     - **Continuous Access**: Mid-day checkout **does NOT disconnect or pause internet access**. The member's Wi-Fi connection remains active and uninterrupted throughout the booked window until `endTime`.
     - When the member returns and re-checks in, their devices stay seamlessly connected without needing any re-authentication.
   - **Day End / Expiry (`now >= endTime`)**:
     - The credential is permanently expired on the router/controller when `endTime` elapses.

4. **Completion Lifecycle**:
   - **Rule**: A booking transitions to `COMPLETED` **only after `endTime` passes** (enforced by the background lifecycle sweeper or on access evaluation once time expires). Checking out before `endTime` sets state to `CHECKED_OUT` and records departure timestamp, but final completion occurs when the scheduled duration elapses.

5. **Prisma Schema Model — `VisitSession`**:
   - Granular visit tracking (`bookingId`, `userId`, `staffUserId`, `terminalId`, `checkInTime`, `checkOutTime`, `ipAddress`, `notes`) alongside `Booking.checkedInAt` and `Booking.checkedOutAt`.

6. **Reception Terminal Scanner UX**:
   - Support three seamless modes: Hardware 2D Barcode Scanner (USB wedge), Live Camera QR Scanner, and Manual Search.

7. **Notification Engine & Queue**:
   - Transactional emails queued via BullMQ with 3 automatic retries, exponential backoff, and Sentry monitoring.

---

## 3. State Machine Graph

```
DRAFT → HELD → PENDING_PAYMENT → CONFIRMED ──┐
                                     │       │
                                     ▼       │
                       ┌──────► CHECKED_IN   │
                       │             │       │
      (Re-entry before │             ▼       │
        endTime allowed)        CHECKED_OUT  │
                       └─────────────┤       │
                                     ▼       ▼
                                 COMPLETED (when now >= endTime)
```

---

## 4. Proposed Changes by Component

### 4.1 Database & Schema (`apps/api/src/db/prisma/schema.prisma`)

#### `schema.prisma`

- Add `VisitSession` model:
  ```prisma
  model VisitSession {
    id           String    @id @default(uuid())
    bookingId    String
    userId       String
    staffUserId  String?
    terminalId   String?   @default("REC-GATE-01")
    checkInTime  DateTime  @default(now())
    checkOutTime DateTime?
    ipAddress    String?
    notes        String?
    createdAt    DateTime  @default(now())
    updatedAt    DateTime  @updatedAt

    booking      Booking   @relation(fields: [bookingId], references: [id], onDelete: Cascade)
    user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@index([bookingId])
    @@index([userId])
    @@index([checkInTime])
    @@map("visit_sessions")
  }
  ```

---

### 4.2 Backend API — Access & State Machine

- **`booking.state-machine.ts`**: Update transition table to allow `CHECKED_OUT -> [CHECKED_IN, COMPLETED]`.
- **`qr-token.util.ts`**: Implement tamper-proof signed opaque token generator & parser (HMAC-SHA256).
- **`access.repository.ts`**: Repository for booking access queries, active/closed `VisitSession` records, terminal activity stream, and real-time occupancy.
- **`access.service.ts`**:
  - Rejects if `now < startTime` (`TOO_EARLY`).
  - Rejects if `now >= endTime` (`EXPIRED`).
  - Rejects if `CANCELLED`, `UNPAID`, `COMPLETED`, or `INVALID_SIGNATURE`.
  - Check-in transitions `CONFIRMED`/`ACTIVE`/`CHECKED_OUT` -> `CHECKED_IN`, creates `VisitSession`, emits `access.checked_in`.
  - Check-out transitions `CHECKED_IN` -> `CHECKED_OUT`, closes `VisitSession`, emits `access.checked_out`. (Internet access continues uninterrupted until `endTime`).
- **`access.controller.ts`**: Express controller for access pass endpoints.
- **`access.routes.ts`**: Connect routes with RBAC middleware.
- **`access.test.ts`**: Unit & integration tests covering check-in, check-out, same-day re-entry, and all rejection states.

---

### 4.3 Notification Engine & BullMQ Queue (`apps/api/src/modules/notifications/`)

- **`notifications.queue.ts`**: BullMQ producer for `notifications` queue.
- **`notification-dispatch.job.ts`**: BullMQ worker job processor executing queued email tasks, with Sentry failure capture.
- **`templates/`**: Confirmation, Reminder, Check-In Welcome (with Wi-Fi credentials), Check-Out Summary, Cancellation notices.
- **`handlers/access-events.handler.ts`**: Outbox event handler wiring domain events to notification queue.
- **`worker.ts`**: Initialize `notificationWorker` and wire `access-events.handler.ts`.

---

### 4.4 Shared Packages & Frontends

- **`packages/types` & `packages/api-client`**: Add `api.access` namespace and access DTOs.
- **`apps/reception-app`**:
  - Connect to live API.
  - Three-mode scanner (USB wedge, Live Camera, Manual Search).
  - Dynamic action buttons: "Confirm Check-In", "Process Check-Out", and "Re-Check In (Member Return)".
  - Clear rejection views with explicit explanations.
  - Real-time shift activity feed.
- **`apps/customer-pwa`**: Render live signed QR pass with countdown and Wi-Fi access details.
- **`apps/admin-portal`**: Connect daily activity feed and occupancy widgets to live telemetry.

---

## 5. Verification & Testing Plan

### 5.1 Automated Test Suite

- `pnpm --filter @daih/api test`:
  - `access.test.ts` verifying all rejection scenarios, token signing, check-in/checkout/re-check-in transitions, and RBAC rules.
  - `booking.test.ts` & `payments.test.ts`.

### 5.2 Manual & Staging Verification

1. Early Check-In Rejection test.
2. Initial Check-In at `startTime` (Wi-Fi access active).
3. Check-Out midday (State becomes `CHECKED_OUT`, Wi-Fi remains active).
4. Re-Check-In before `endTime` (State becomes `CHECKED_IN`, Wi-Fi remains seamlessly connected).
5. Post-`endTime` completion (State becomes `COMPLETED`, Wi-Fi revoked, pass expired).
