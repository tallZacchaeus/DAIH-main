# DAIH Workspace Platform — Milestone & Delivery Plan

**Delivery mode:** Discovery → MVP → Pilot → Automation → Growth
**Working mode:** Solo/AI-coworker delivery (Claude as coworker) — milestones written as gated, verifiable checkpoints rather than a large-team sprint calendar
**Companion docs:** `DAIH_File_Structure.md`, `DAIH_Technical_Design_Document.md`

---

## 0. How to Read This Plan

Each milestone lists: **duration**, **entry condition**, **deliverables**, **exit criteria** (what must be true/demonstrable to move on), and **decisions required from the DAIH Product Owner** before that milestone can close. Milestones map directly to the proposal's phased roadmap (§5) and MVP module table (§5.2), re-sequenced for a lean AI-assisted build rather than a 7-person team.

---

## Phase 0 — Discovery & Design Validation

**Duration:** 2 weeks | **Entry condition:** DAIH Product Owner appointed

### Deliverables

- Confirmed physical inventory: unique code per desk/office/room/capacity pool
- Approved pricing, taxes, discounts, cancellation/refund/no-show rules, subscription logic
- Process maps: registration, reception, finance, security, internet-access
- Router/controller capability report (RADIUS/captive-portal/API/disconnect support)
- Mandatory vs. optional data fields defined; privacy/data-impact review completed
- Service blueprint, user journeys, wireframes, technical architecture (this TDD), delivery backlog, acceptance criteria
- `daih-platform` monorepo scaffolded per `DAIH_File_Structure.md`; CI pipeline skeleton in place

### Exit Criteria

- [ ] Product Owner has signed off pricing/policy/inventory sheet
- [ ] Network hardware report confirms feasible path for Phase 2 RADIUS integration (or documented fallback)
- [ ] Backlog for Phase 1 is prioritized and estimated
- [ ] Repo, CI, staging environment, Datadog + Sentry projects are provisioned

### Decisions Required Before Exit

Inventory count & assignment model · operating schedule · pricing/tax/discount rules · cancellation/refund/no-show policy · subscription usage-deduction model · ID/medical data requirements per service · router/controller in use · Paystack merchant account status · named operational roles.

---

## Phase 1 — Minimum Viable Product

**Duration:** 10–12 weeks | **Entry condition:** Phase 0 exit criteria met

Sub-milestones below are sequenced so each builds on a working, testable increment — no big-bang integration at the end.

### Milestone 1.1 — Foundation & Identity (Weeks 1–2)

**Deliverables**

- Monorepo apps wired: `api`, `web`, `customer-pwa`, `admin-portal` skeletons deployed to staging
- Design system (`packages/ui`) foundation; shared Tailwind config
- Identity module: sign-up, email verification, password reset, sequential Client ID generation, policy consent capture
- Auth/session controls: short-lived JWT access token, HttpOnly refresh cookie, persisted sessions, refresh rotation, refresh-token reuse detection, logout/session revocation
- Event-driven identity outbox: registration, consent, verification, login, session, password-reset, and staff-user events persisted and dispatched by the worker
- RBAC middleware + role permission map; staff/admin accounts created only by Super Administrators
- First Super Administrator seed script using environment variables
- Redis-backed rate limiting for login, registration, refresh, verification resend, and password-reset requests
- Transactional email provider abstraction with Resend primary and ZeptoMail fallback
- Datadog `dd-trace` + Sentry initialized in API and both frontends, confirmed capturing test events in staging

**Exit criteria:** A user can register with consent captured, receive a sequential Client ID, verify email, then log in after verification. Access-token and HttpOnly refresh-cookie sessions rotate correctly, logout revokes the active session, refresh-token reuse is detected, and role-based route access is enforced. The seeded Super Administrator can create staff/admin users. Rate limits are demonstrable on identity endpoints. A deliberate test exception appears in both Sentry and Datadog.

### Milestone 1.2 — Catalogue & Resource Model (Weeks 2–3)

**Deliverables**

- Catalogue module: services, plans, resources, capacity, schedules, blackout dates, effective-dated pricing
- Admin CRUD for resources/plans (Operations Admin role)
- Public website and customer PWA both read pricing from the single API — no hard-coded prices

**Exit criteria:** Changing a price or availability in the admin portal is reflected identically on the public site and customer PWA within one page refresh, with no separate content source.

### Milestone 1.3 — Booking Engine (Weeks 4–6)

**Deliverables**

- Availability search excluding confirmed bookings, active holds, admin blocks
- Booking state machine (`DRAFT → HELD → PENDING_PAYMENT → CONFIRMED → ...`)
- 10-minute HOLD via BullMQ delayed job with auto-release
- PostgreSQL exclusion constraint on booking time ranges
- Concurrency test suite (simultaneous booking attempts on same resource/slot)

**Exit criteria:** Automated concurrency tests prove zero double-bookings under simultaneous load. Admin override path logs to Audit.

### Milestone 1.4 — Payments (Weeks 7–8)

**Deliverables**

- Paystack hosted checkout integration
- Signed webhook verification middleware (HMAC), idempotent event processing
- Invoice/receipt generation, refund recording, reconciliation view (Finance Officer role)
- Customer dashboard: active booking, history, receipts

**Exit criteria:** A full paid booking completes end-to-end in staging using Paystack sandbox — booking activates **only** after server-side webhook confirmation, never the browser callback. Duplicate webhook delivery is proven idempotent (no double-charge, no double-confirm).

### Milestone 1.5 — QR & Reception (Weeks 9–10)

**Deliverables**

- Signed opaque QR token generation and verification
- Reception scanner app: identity check, check-in/out, exception handling
- Rejection logic: expired, cancelled, unpaid, already-consumed, out-of-window tokens
- Admin dashboard: daily activity, resource status, customer search, payment status, basic reports
- Notification module live: email confirmations, reminders, cancellation, check-in/out, expiry notices (queued + retried via BullMQ)

**Exit criteria:** Full operational workflow — book → pay → check in via QR scan → check out — completes in staging with all state transitions logged and auditable. Reception app correctly rejects at least 4 invalid-token scenarios in test.

### Milestone 1.6 — Hardening, Reporting & UAT (Weeks 11–12) ✅ [COMPLETED]

**Deliverables**

- [x] Reporting module: daily/weekly/monthly revenue, visits, utilisation; CSV/Excel/PDF export (branded with DAIH letterhead), reconciled against transactional records
- [x] Security pass: rate limiting, compulsory MFA for all staff roles (Email OTP + TOTP with QR & copy-paste setup key), AES-256-GCM encryption at rest, automated NDPA retention/anonymisation jobs
- [x] Accessibility pass across all four frontends
- [x] Load & concurrency test suite on booking contention + burst QR scan paths (`booking-load.k6.js` & `qr-scan-load.k6.js`)
- [x] Observability & telemetry endpoints live for: booking funnel, payment success rate, webhook idempotency, QR scan latency
- [x] Full regression suite green (MFA, Identity, Reports, Retention, Bookings, Payments, Access)

**Exit criteria:** UAT sign-off obtained; no open critical/high-severity defects; all MVP acceptance summaries from the module table below are individually demonstrated.

### MVP Module → Acceptance Summary (reference)

| Module                | Acceptance summary                                                  |
| --------------------- | ------------------------------------------------------------------- |
| Identity              | Unique account/Client ID; verified contact; consent evidence stored |
| Catalogue & inventory | Only active, available, correctly priced options shown              |
| Booking               | No overlapping confirmed bookings for same resource/time            |
| Payment               | Booking activates only after server-side payment confirmation       |
| QR & reception        | Expired/cancelled/unpaid tokens rejected                            |
| Customer dashboard    | Accurate status shown across devices                                |
| Admin dashboard       | Role permissions enforced; actions logged                           |
| Notifications         | Messages queued, retried, recorded                                  |
| Reporting             | Reports reconcile to transactional records                          |

---

## Pilot (Week 13)

**Entry condition:** UAT sign-off from Milestone 1.6

### Deliverables

- Staff-only simulation covering all service types + exception scenarios
- Pilot with small customer group, limited inventory, 5–10 business days
- Manual fallback register + payment-verification procedure maintained in parallel
- Daily review: booking conversion, failed payments, scan time, staff errors, support requests, feedback

### Exit Criteria

- [ ] Booking, payment, and access metrics meet agreed thresholds (defined during Phase 0)
- [ ] No unresolved critical incidents during pilot window
- [ ] Go/no-go decision documented by Product Owner

---

## Launch & Hypercare (Week 14)

### Deliverables

- Production deployment (frontends → Vercel; API/worker → managed container platform)
- Two weeks of hypercare: daily monitoring review (Datadog dashboards + Sentry issue triage), named support ownership
- Support runbook + escalation path documented

### Exit Criteria

- [ ] Production monitoring confirmed active (Datadog uptime checks green, Sentry alert routing verified)
- [ ] Support ownership formally handed over
- [ ] Transition to normal support cadence agreed with Product Owner

---

## Phase 2 — Operations Automation

**Duration:** 6–8 weeks | **Entry condition:** MVP launched + stable in hypercare

### Deliverables

- Full subscription engine: hourly/daily/weekly/flex/monthly/corporate/virtual-office/night plans
- Remaining-days/visits/hours logic with pause, extension, renewal rules
- Countdown alerts + automatic session completion
- RADIUS/captive-portal integration for booking-linked Wi-Fi credentials + expiry
- SMS notifications, advanced occupancy + repeat-customer analytics
- Incident, no-show, and policy-violation workflows

### Exit Criteria

- [ ] Network integration tests pass: credential creation, Session-Timeout enforcement, forced disconnect
- [ ] Subscription balance ledger reconciles against usage in staging over a simulated billing cycle

---

## Phase 3 — Growth & Ecosystem (Continuous)

**Entry condition:** Phase 2 stable, core operational data proven reliable

### Candidate Deliverables (prioritized by evidence, not built speculatively)

- Corporate accounts, team seats, consolidated billing, approval workflows
- Referrals, rewards, promo codes, customer feedback module
- Visitor pre-registration, smart locks/biometric integration (after separate security review)
- Native Android/iOS apps — **only** if usage data proves the PWA is insufficient
- Accounting integration, advanced profitability reporting

---

## Cross-Phase Risk Watchlist

| Risk                                  | Mitigation checkpoint                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| Unconfirmed inventory/pricing         | Blocks Phase 0 exit — no exceptions                                                        |
| Payment callback treated as truth     | Verified structurally in Milestone 1.4 (webhook-only activation)                           |
| Race conditions in booking            | Verified structurally in Milestone 1.3 (exclusion constraint + concurrency tests)          |
| Router can't support required control | Surfaced in Phase 0; Phase 2 entry gated on network report                                 |
| Excessive personal data collection    | Enforced in Milestone 1.1/1.6 (data minimisation, medical data removed from standard flow) |
| Scope expansion delaying MVP          | Any new request during Phase 1 goes to the Phase 2/3 backlog, not the current milestone    |
