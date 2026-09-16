# DAIH Workspace Platform — Technical Design Document (TDD)

**Version:** 1.0
**Based on:** DAIH Workspace Management & Customer Experience Platform Proposal (22 July 2026)
**Stack adaptation:** NestJS → **Node.js/Express**; adds **Datadog** + **Sentry** for observability
**Companion docs:** `DAIH_File_Structure.md`, `DAIH_Milestone_Plan.md`

---

## 1. Purpose & Scope

This TDD translates the approved product proposal into an implementable technical design for Phase 0 (Discovery) through Phase 1 (MVP), with forward notes for Phase 2 (Automation) and Phase 3 (Growth). It defines architecture, data model, API surface, booking-concurrency controls, security controls, and observability — all scoped to the team's actual stack: **Express** (not NestJS), **Next.js**, **PostgreSQL**, **Redis/BullMQ**, **Paystack**, **Datadog + Sentry**.

Out of scope for this document: UI wireframes, pricing/policy decisions (owned by the DAIH Product Owner — see §14 of the proposal), and RADIUS hardware procurement.

---

## 2. Architecture Overview

**Pattern:** Modular monolith, API-first, single deployable Express application with a separate BullMQ worker process sharing the same codebase.

```
Experience Layer
 ├─ Public Website (Next.js)         — plans, content, SEO
 ├─ Customer PWA (Next.js)            — registration, booking, QR
 ├─ Reception App (Next.js)            — scan, check-in/out
 └─ Admin Portal (Next.js)              — operations, finance, reports
              │
              ▼  REST / OpenAPI (JSON)
Application Layer — Express Modular API
 ├─ Identity & RBAC     ├─ Inventory & Pricing
 ├─ Booking Engine       ├─ Subscriptions
 ├─ Payments & Ledger      ├─ QR / Access
 ├─ Notifications            ├─ Reporting & Audit
              │
              ▼
Data & Integration Layer
 ├─ PostgreSQL (source of truth)
 ├─ Redis + BullMQ (holds, timers, alerts, retries)
 ├─ S3-compatible object storage (IDs, invoices, exports)
 ├─ Paystack (payment + webhooks)
 ├─ Email/SMS providers (transactional alerts)
 └─ RADIUS/Router (Phase 2 — time-bound internet)
```

**Why a modular monolith (unchanged from proposal rationale):** bookings, payments, subscriptions, and access are tightly coupled and benefit from one transactional data model and one deployable unit at MVP scale. Internal module boundaries (see File Structure doc §2) allow extraction into standalone services later if load evidence justifies it — no premature microservices.

---

## 3. Technology Stack

| Layer                    | Technology                                                                  | Notes                                                                                                                                         |
| ------------------------ | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Public/customer frontend | Next.js (TypeScript, PWA support)                                           | Installable customer experience, SSR, shared design system                                                                                    |
| Admin/reception frontend | Next.js (shared component system)                                           | Role-scoped routes reusing `packages/ui`                                                                                                      |
| Backend API              | **Node.js + Express (TypeScript)**                                          | REST/OpenAPI; modular route/controller/service structure in place of Nest modules                                                             |
| Validation               | Zod (or Joi)                                                                | Request schema validation middleware per route                                                                                                |
| Database                 | PostgreSQL                                                                  | Relational integrity, range-type exclusion constraints for bookings                                                                           |
| ORM                      | Prisma + targeted raw SQL                                                   | Type safety, with raw SQL for the booking exclusion constraint and reporting queries                                                          |
| Cache & jobs             | Redis + BullMQ                                                              | Hold expiry, countdown alerts, notification retries, report jobs, rate limiting                                                               |
| File storage             | S3-compatible object storage                                                | Encrypted ID docs, receipts, invoices, signed URLs                                                                                            |
| Payments                 | Paystack hosted checkout + webhooks                                         | No raw card data touches DAIH servers                                                                                                         |
| Network access (Phase 2) | MikroTik-compatible RADIUS/FreeRADIUS                                       | Session-Timeout, disconnect, accounting                                                                                                       |
| **Error monitoring**     | **Sentry**                                                                  | Frontend + backend exception tracking, release tagging, source maps                                                                           |
| **Observability/APM**    | **Datadog**                                                                 | Distributed tracing (dd-trace), Express middleware auto-instrumentation, custom metrics, log correlation, uptime/synthetic checks, dashboards |
| Testing                  | Jest, Supertest (API integration), Playwright (E2E)                         | Concurrency tests are mandatory for booking module                                                                                            |
| CI/CD                    | GitHub Actions                                                              | Staging + production environments, migrations gated behind tests                                                                              |
| Auth                     | Short-lived JWT access token + HttpOnly refresh cookie + persisted sessions | Refresh rotation, reuse detection, rate limiting, MFA-ready privileged sessions (see §7)                                                      |

**Team-fit note:** Express replaces NestJS from the original proposal. Every architectural control described (modular boundaries, API-first design, PostgreSQL exclusion constraints, webhook-driven payment confirmation) is preserved — only the framework changes. Express modules are organized to mirror what Nest would call "modules" (see File Structure doc), using a consistent routes → controller → service → repository layering per domain to keep the codebase testable and swappable later.

---

## 4. User Roles & Access Boundaries

| Role                | Responsibilities                                     | Access boundary                                 |
| ------------------- | ---------------------------------------------------- | ----------------------------------------------- |
| Customer/Member     | Register, book, pay, view status/QR/receipts         | Own records only                                |
| Reception Officer   | Search bookings, scan QR, check in/out, log walk-ins | Operational data; limited PII                   |
| Security Officer    | Verify access eligibility, night-plan checks         | Access status + approved safety fields only     |
| Operations Admin    | Manage resources, plans, schedules, overrides        | Operational admin; no financial/security config |
| Finance Officer     | Transactions, invoices, refunds, reconciliation      | Financial records; restricted profile data      |
| Super Administrator | Role management, system config, integrations, audit  | Privileged; MFA + enhanced logging required     |
| Management Viewer   | Dashboards, approved reports                         | Read-only aggregates                            |

RBAC is enforced via an `rbac.middleware.ts` guard on every route, checking role against a permission map stored in `packages/types/roles.types.ts` and mirrored server-side. All privileged actions (role changes, overrides, refunds) are written to the append-only Audit module regardless of outcome.

---

## 5. Core Data Model

| Entity             | Key fields                                                                           | Critical control                                                          |
| ------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| User               | Identity, contact, status, verification, roles                                       | Unique email/phone; MFA for privileged roles                              |
| CustomerProfile    | Client ID, org, emergency/approved-identity fields                                   | Field-level access + retention rules                                      |
| PolicyConsent      | Policy version, purpose, timestamp, channel, withdrawal state                        | Evidence of lawful processing                                             |
| FacilityResource   | Location, type, capacity, features, status, maintenance blocks                       | One real record per bookable unit/pool                                    |
| PlanPrice          | Duration, validity, benefits, access window, tax, cancellation rule                  | Effective-dated; never hard-coded in frontend                             |
| Booking            | Customer, resource, time range, status, hold expiry, source                          | State machine + DB-level overlap prevention                               |
| Subscription       | Plan, balance, start/expiry, usage rules, renewal state                              | Immutable usage ledger, not just a mutable counter                        |
| Payment            | Gateway reference, amount, status, channel, webhook event, reconciliation            | Idempotent updates; no raw card data stored                               |
| AccessToken        | Signed token ID, validity, use count, revocation                                     | Opaque; status always re-checked server-side                              |
| VisitSession       | Check-in/out, staff/device, usage, network session ID                                | Audit evidence + time reconciliation                                      |
| Notification       | Template, channel, recipient, state, retry, delivery result                          | Queue/retry + contact history                                             |
| AuditEvent         | Actor, action, target, before/after, time, IP/device context                         | Append-only, protected from edits                                         |
| AuthSession        | User, refresh token hash, token family, expiry, device/IP metadata, revocation state | Server-side session control with refresh rotation and reuse detection     |
| VerificationToken  | User, hashed token, expiry, consumed timestamp                                       | Email verification requires a later login; raw tokens are never stored    |
| PasswordResetToken | User, hashed token, expiry, consumed timestamp                                       | Password reset revokes active sessions after success                      |
| ClientIdSequence   | Year, next sequence number                                                           | Sequential Client IDs, e.g. `DAIH-2026-000001`, generated transactionally |
| OutboxEvent        | Event type, aggregate, payload, status, retry metadata                               | Identity and operational changes publish events after durable DB commits  |

### 5.1 Booking State Machine

```
DRAFT → HELD → PENDING_PAYMENT → CONFIRMED → CHECKED_IN → COMPLETED
  │        │           │              │
  ▼        ▼           ▼              ▼
ABANDONED EXPIRED   FAILED/EXPIRED  CANCELLED/NO_SHOW
                                       │
                                       ▼
                              REFUND_PENDING → REFUNDED
```

Implemented as an explicit `booking.state-machine.ts` with a transition table — invalid transitions throw a typed error and are rejected at the service layer before touching the DB.

### 5.2 Preventing Double-Booking (three enforcement levels)

1. **Query level:** availability search excludes confirmed bookings, active holds, and admin blocks.
2. **Transaction level:** booking creation runs inside a Postgres transaction with row-level locking (`SELECT ... FOR UPDATE` on the resource/time window, or `SERIALIZABLE` isolation for the booking insert).
3. **Database level:** the `booking` table's time range column uses a PostgreSQL **exclusion constraint** (`EXCLUDE USING gist`) so two active reservations can never overlap for the same resource, regardless of application-layer bugs. This is defined in raw SQL (`db/raw-sql/booking-exclusion-constraint.sql`) since Prisma cannot express it natively.

Concurrency is verified with Jest/Supertest tests that fire simultaneous booking requests for the same resource/time slot and assert exactly one succeeds.

### 5.3 Event-Driven Application Boundary

Phase 1 uses an event-driven modular monolith with a transactional outbox rather than a separate message broker. Domain services write state changes and `OutboxEvent` records in the same PostgreSQL transaction. The BullMQ worker dispatches pending events to module handlers for email delivery, audit logging, and observability. This keeps identity, booking, payment, and access workflows event-driven while preserving simple local development and reliable MVP operations.

Identity events introduced in Milestone 1.1:

- `identity.user_registered`
- `identity.policy_consent_captured`
- `identity.email_verification_requested`
- `identity.email_verified`
- `identity.login_succeeded`
- `identity.login_failed`
- `identity.session_refreshed`
- `identity.session_revoked`
- `identity.password_reset_requested`
- `identity.password_changed`
- `identity.staff_user_created`

Events must not contain raw passwords, raw verification/reset tokens, refresh tokens, or sensitive identity documents.

---

## 6. Key Workflows

### 6.1 Registration & Onboarding

1. Customer submits name, email, phone, password; accepts required policy versions.
2. API validates the request, hashes the password, generates a sequential Client ID (e.g. `DAIH-2026-000245`) inside a transaction, records required policy consent, and stores the user as unverified.
3. The same transaction writes outbox events for registration, consent capture, and email-verification delivery.
4. Email verification marks the account verified but does not create a login session; the customer must log in after verification.
5. Only service-relevant profile fields are requested; night access can trigger additional approved-identity/emergency fields.
6. Government ID files are encrypted at rest (S3 + field-level encryption), access-restricted, and excluded from normal staff search.
7. Every accepted policy/consent version is recorded with timestamp and channel.

### 6.1.1 Authentication, Tokens & Sessions

- Access tokens are short-lived JWTs, defaulting to 15 minutes. They are returned in API responses and held in frontend memory only.
- Refresh tokens are opaque, single-use tokens stored only in `HttpOnly`, `Secure`, `SameSite=Lax` cookies. They are never exposed to frontend JavaScript. Local development may disable `Secure` and omit the cookie domain.
- Production cookies should target the shared parent domain, e.g. `.daih.ng`, so `app.daih.ng`, `admin.daih.ng`, and `api.daih.ng` can participate safely. The refresh cookie path is restricted to `/api/v1/identity/refresh`.
- Refresh rotation is mandatory: every refresh request revokes the previous refresh token and issues a new token pair.
- Refresh-token reuse revokes the affected session/token family and emits a security event.
- Server-side `AuthSession` records are the source of truth for refresh validity, revocation, expiry, device metadata, IP address, user agent, and last-used timestamp. Redis may cache session status, but PostgreSQL remains authoritative.
- Access-token claims include `sub`, `sessionId`, `role`, `clientId`, and `emailVerified`; privileged actions must still check the current user/session state server-side.
- Customer self-registration is the only public registration path. Staff/admin accounts are created only by Super Administrators.
- The first Super Administrator is created by a seed script using environment variables, never by an unauthenticated public endpoint.

### 6.1.2 Password Reset & Email Delivery

- Password reset request responses are generic and do not reveal whether the email exists.
- Reset and verification tokens are stored only as hashes with expiry and consumed timestamps.
- Successful password reset revokes active sessions for the user and requires a new login.
- Transactional email uses a provider abstraction with Resend as the primary provider and ZeptoMail as the fallback provider.

### 6.2 Booking & Payment

1. Customer selects service/date/duration/resource.
2. API creates a short-lived **HOLD** (recommended 10 minutes) — a BullMQ delayed job (`hold-expiry.job.ts`) auto-releases inventory if payment isn't completed.
3. Customer pays via Paystack hosted checkout. **Browser callback is never trusted as confirmation.**
4. Paystack webhook is verified server-side (HMAC signature, `webhook.verifier.ts` middleware) and processed idempotently (webhook event ID stored and checked before applying state change) inside one DB transaction.
5. Booking → `CONFIRMED`; invoice, receipt, and signed QR generated.
6. Cancellation/refund calculated per approved policy and logged to Audit.

### 6.3 QR Access & Check-In

1. QR encodes an **opaque signed token** (JWT or HMAC-signed reference ID) — never raw personal data. Backend resolves booking details on scan.
2. Reception sees name/photo (where approved), Client ID, workspace, time, payment status, warnings.
3. Expired, cancelled, unpaid, already-consumed (where single-use), or out-of-window tokens are rejected server-side.
4. Check-in records staff/device/time/location; timers and internet access begin from the agreed trigger.
5. Check-out completes usage, terminates access, updates subscription balances.

### 6.4 Internet Session Workflow (Phase 2)

1. Confirmed check-in triggers a RADIUS/captive-portal credential scoped to the booking.
2. Controller applies `Session-Timeout` equal to permitted usage.
3. Warning thresholds (e.g. 15 min / 5 min remaining) fire via BullMQ scheduled jobs.
4. Checkout/expiry sends disconnect/CoA command where supported; credential marked unusable.
5. Network accounting reconciled against booking usage.

---

## 7. Security & Privacy

Aligned with the Nigeria Data Protection Act (NDPA) 2023 and current NDPC guidance; formal legal/privacy review required before production.

| Control area      | Requirement                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| Data minimisation | Collect only what the selected service needs; no medical/gov-ID data for routine bookings absent documented purpose |
| Sensitive data    | Identity/medical data stored separately, encrypted, field-level access + logging, shorter retention                 |
| Authentication    | Argon2/bcrypt password hashing, email verification, rate limiting, session controls, MFA for privileged staff       |
| Authorisation     | RBAC, least privilege, per-role data visibility                                                                     |
| Payments          | Hosted gateway entry only; webhook signature verification; never store PAN/CVV/bank credentials                     |
| QR security       | Opaque signed tokens, revocation, expiry, live server-side status check                                             |
| Audit             | Append-only log for logins, profile views, booking changes, overrides, refunds, scans, exports, role changes        |
| Privacy rights    | Access/correction/deletion workflows, consent withdrawal handling                                                   |
| Retention         | Defined schedules per data type; automated deletion/anonymisation BullMQ jobs                                       |
| Incident response | Documented breach triage, containment, escalation, notification process                                             |
| Backups           | Encrypted, tested restore process, restricted access                                                                |
| Vendor management | DPAs for hosting, payment, email/SMS, analytics, support tools                                                      |

**Medical information decision:** removed from standard registration; requested only for a defined high-risk service (e.g. authorised night access) with documented purpose, access roles, retention, and emergency procedure.

### 7.1 Identity Rate Limits

Rate limits are enforced with Redis-backed counters. Error responses must avoid account enumeration.

| Endpoint group         | Limiting key          | Baseline                                   |
| ---------------------- | --------------------- | ------------------------------------------ |
| Login                  | IP + normalized email | 5 failed attempts per 15 minutes           |
| Registration           | IP                    | 10 attempts per hour                       |
| Verification resend    | IP + normalized email | 3 attempts per hour                        |
| Password reset request | IP + normalized email | 3 attempts per hour                        |
| Refresh token          | session/IP            | Conservative burst limit to detect probing |
| Anonymous API routes   | IP                    | General baseline limit per route class     |

---

## 8. Deployment

- **Frontends** (`web`, `customer-pwa`, `reception-app`, `admin-portal`): Vercel (or equivalent managed platform).
- **API + BullMQ worker**: managed container platform (e.g. Fly.io, Render, or a Contabo/VPS + Docker setup consistent with prior DAIH tooling patterns), region selected for reliable Nigeria connectivity.
- **PostgreSQL**: managed instance with point-in-time recovery.
- **Redis**: managed instance.
- **Object storage**: encrypted S3-compatible bucket, signed URLs only.
- **Secrets**: cloud secret manager — never in source control or `.env` committed files.
- **IaC**: introduced post-MVP stabilization (Terraform, per proposal §7.3).

---

## 9. Observability — Datadog + Sentry

This is the primary deviation from the original proposal's "structured logs, error monitoring, uptime checks" line item, made concrete for this stack:

### 9.1 Sentry (error tracking)

- Initialized in Express via `@sentry/node` in `config/sentry.ts`, wired as the **first** middleware (request handler) and **last** middleware (error handler) in `app.ts`.
- Initialized in each Next.js app via `@sentry/nextjs` (client + server + edge configs).
- Release tagging tied to CI/CD deploy SHA; source maps uploaded on build for readable stack traces.
- Captures: unhandled exceptions, promise rejections, webhook processing failures, BullMQ job failures (`worker.ts` wraps job processors in try/catch → `Sentry.captureException`).
- Alert routing: critical errors (payment/webhook/booking-transaction failures) routed to a dedicated Slack/email channel with higher priority than general frontend errors.

### 9.2 Datadog (APM, logs, metrics, uptime)

- `dd-trace` initialized at the very top of `server.ts` and `worker.ts` (before any other imports) for automatic Express/PostgreSQL/Redis/HTTP instrumentation.
- Custom spans/metrics for business-critical paths: booking hold creation, webhook processing latency, QR validation latency, RADIUS credential issuance (Phase 2).
- Structured JSON logging (`lib/logger.ts`, e.g. pino) with `dd.trace_id`/`dd.span_id` injected for log-trace correlation in the Datadog UI.
- **Synthetic/uptime checks** on: public site, customer PWA login, booking API health endpoint, Paystack webhook endpoint reachability.
- **Dashboards**: booking conversion funnel, payment success/failure rate, webhook idempotency violations (should be zero), QR scan-to-check-in latency, resource occupancy — directly mirroring the proposal's §12 Product Success Measures so KPIs are observable, not just reportable.
- **Alerts**: webhook failure rate threshold, booking-hold-expiry job backlog, API p95 latency, error rate spikes — routed alongside Sentry alerts.

### 9.3 Why both

Sentry owns **exception-level debugging** (stack traces, breadcrumbs, release regressions). Datadog owns **system-level health** (latency, throughput, infra, business metrics, uptime). Together they satisfy the proposal's monitoring requirement without needing a bespoke logging pipeline.

---

## 10. Testing Strategy

- **Unit:** pricing, entitlement/subscription balance logic, cancellation/refund calculations, time-window calculations, RBAC policy checks.
- **API integration (Supertest):** booking transactions, webhook idempotency, refunds, QR token validity, report reconciliation.
- **Identity integration (Supertest):** registration, consent capture, email verification, login, refresh rotation, refresh reuse detection, logout, password reset, seeded Super Admin creation, and RBAC allow/deny paths.
- **Concurrency:** simultaneous booking attempts on the same resource/time — assert single winner, verify exclusion constraint fires correctly.
- **E2E (Playwright):** registration, sandbox payment, dashboard, QR scan, staff override journeys — across customer-pwa, reception-app, admin-portal.
- **Permission tests:** confirm reception/security/finance/management cannot read restricted fields.
- **Network integration (Phase 2):** credential creation, Session-Timeout enforcement, checkout disconnect.
- **Accessibility:** keyboard nav, labels, contrast, mobile responsiveness across all Next.js apps.
- **Resilience:** backup/restore drill, incident-response tabletop, DR rehearsal before launch.

**Definition of Done:** acceptance criteria demonstrated to Product Owner; automated tests pass with no open critical/high defects; RBAC + audit + privacy verified; Datadog/Sentry instrumentation confirmed live in staging; docs updated; feature included in regression suite.

---

## 11. Open Technical Decisions (require DAIH sign-off before build — see proposal §14)

- Router/controller model in use and RADIUS/captive-portal/API/disconnect support.
- Government ID / medical data legal requirement per service type.
- Paystack merchant account + settlement/reconciliation ownership.
- Existing customer data migration source, quality, and consent status.
- Named operational roles, approval limits, and override hierarchy.
