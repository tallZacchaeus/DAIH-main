# DAIH Workspace Platform — File & Folder Structure

**Stack:** Node.js/Express (API) · Next.js (Public site, Customer PWA, Reception App, Admin Portal) · PostgreSQL · Redis/BullMQ · Datadog + Sentry (observability)
**Architecture:** Modular monolith, monorepo, pnpm workspaces
**Companion docs:** `DAIH_Technical_Design_Document.md`, `DAIH_Milestone_Plan.md`

---

## 1. Monorepo Layout (Top Level)

```
daih-platform/
├── apps/
│   ├── web/              # Public marketing site (migrated from daih-vert.vercel.app)
│   ├── customer-pwa/     # Customer-facing PWA (register, book, pay, QR, dashboard)
│   ├── reception-app/    # Reception/Security scanner + check-in/out app
│   ├── admin-portal/     # Operations/Finance/Super Admin dashboards
│   └── api/              # Node.js/Express backend (modular monolith)
├── packages/
│   ├── api-client/        # Typed fetch client generated from OpenAPI spec, shared by all frontends
│   ├── ui/                 # Shared component library (design system, Tailwind config)
│   ├── config/              # Shared eslint/tsconfig/prettier/tailwind base configs
│   └── types/                # Shared TypeScript types/DTOs/enums (booking states, roles, etc.)
├── infra/
│   ├── docker/            # Dockerfiles + docker-compose for local dev (Postgres, Redis, MinIO)
│   ├── ci/                # GitHub Actions workflow definitions
│   └── terraform/         # (Post-MVP) infrastructure-as-code
├── docs/
│   ├── DAIH_Technical_Design_Document.md
│   ├── DAIH_Milestone_Plan.md
│   ├── DAIH_File_Structure.md
│   ├── adr/                # Architecture Decision Records
│   └── openapi/
│       └── daih-api.yaml
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-staging.yml
│       └── deploy-production.yml
├── .env.example
├── pnpm-workspace.yaml
├── package.json
├── turbo.json               # (optional) Turborepo pipeline for build caching
└── README.md
```

---

## 2. Backend — `apps/api/` (Node.js + Express, Modular Monolith)

Each business capability from the proposal's "Application Layer" becomes a self-contained **module** with its own routes, controller, service, repository, and validation schema. This preserves clean internal boundaries so any module (e.g. Notifications, Reporting) can be extracted into its own service later without a rewrite.

```
apps/api/
├── src/
│   ├── modules/
│   │   ├── identity/                 # Auth, registration, verification, Client ID, RBAC
│   │   │   ├── identity.routes.ts
│   │   │   ├── identity.controller.ts
│   │   │   ├── identity.service.ts
│   │   │   ├── identity.repository.ts
│   │   │   ├── identity.schema.ts     # Zod/Joi validation
│   │   │   ├── identity.types.ts
│   │   │   ├── client-id.service.ts   # Sequential Client ID generation
│   │   │   ├── password.service.ts    # Hashing and password reset helpers
│   │   │   ├── session.service.ts     # Access token, refresh cookie, rotation, revocation
│   │   │   ├── token.repository.ts    # Hashed verification/reset token persistence
│   │   │   ├── staff-user.service.ts  # Super Admin-only staff/admin creation
│   │   │   └── identity.test.ts
│   │   │
│   │   ├── events/                    # Transactional outbox + event dispatch
│   │   │   ├── outbox.repository.ts
│   │   │   ├── outbox.service.ts
│   │   │   ├── event-dispatcher.ts
│   │   │   ├── event.types.ts
│   │   │   └── handlers/
│   │   │       ├── identity-email.handler.ts
│   │   │       ├── identity-audit.handler.ts
│   │   │       └── observability.handler.ts
│   │   │
│   │   ├── catalogue/                 # Services, plans, resources, capacity, pricing
│   │   │   ├── catalogue.routes.ts
│   │   │   ├── catalogue.controller.ts
│   │   │   ├── catalogue.service.ts
│   │   │   ├── catalogue.repository.ts
│   │   │   └── catalogue.schema.ts
│   │   │
│   │   ├── booking/                    # Availability, holds, state machine, overlap prevention
│   │   │   ├── booking.routes.ts
│   │   │   ├── booking.controller.ts
│   │   │   ├── booking.service.ts
│   │   │   ├── booking.repository.ts
│   │   │   ├── booking.state-machine.ts
│   │   │   ├── booking.schema.ts
│   │   │   └── booking.test.ts
│   │   │
│   │   ├── subscriptions/              # Plan balances, usage ledger, pause/extend/renew
│   │   │   ├── subscriptions.routes.ts
│   │   │   ├── subscriptions.controller.ts
│   │   │   ├── subscriptions.service.ts
│   │   │   └── subscriptions.repository.ts
│   │   │
│   │   ├── payments/                    # Paystack checkout, webhook verification, ledger
│   │   │   ├── payments.routes.ts
│   │   │   ├── payments.controller.ts
│   │   │   ├── payments.service.ts
│   │   │   ├── payments.repository.ts
│   │   │   ├── paystack.client.ts
│   │   │   ├── webhook.verifier.ts       # HMAC signature validation middleware
│   │   │   └── payments.test.ts
│   │   │
│   │   ├── access/                       # Signed QR tokens, reception validation, revocation
│   │   │   ├── access.routes.ts
│   │   │   ├── access.controller.ts
│   │   │   ├── access.service.ts
│   │   │   ├── qr-token.util.ts            # Signed opaque token generation/verification
│   │   │   └── access.repository.ts
│   │   │
│   │   ├── network/                        # Phase 2: RADIUS/captive-portal integration
│   │   │   ├── network.routes.ts
│   │   │   ├── network.controller.ts
│   │   │   ├── network.service.ts
│   │   │   └── radius.client.ts
│   │   │
│   │   ├── notifications/                   # Email/SMS queue, templates, retries
│   │   │   ├── notifications.routes.ts
│   │   │   ├── notifications.controller.ts
│   │   │   ├── notifications.service.ts
│   │   │   ├── notifications.queue.ts         # BullMQ producer
│   │   │   ├── templates/
│   │   │   │   ├── booking-confirmed.email.ts
│   │   │   │   ├── booking-reminder.email.ts
│   │   │   │   └── expiry-notice.sms.ts
│   │   │   └── providers/
│   │   │       ├── email.provider.ts
│   │   │       └── sms.provider.ts
│   │   │
│   │   ├── reporting/                        # Revenue, utilisation, exports (CSV/Excel/PDF)
│   │   │   ├── reporting.routes.ts
│   │   │   ├── reporting.controller.ts
│   │   │   ├── reporting.service.ts
│   │   │   └── exporters/
│   │   │       ├── csv.exporter.ts
│   │   │       ├── excel.exporter.ts
│   │   │       └── pdf.exporter.ts
│   │   │
│   │   └── audit/                              # Append-only audit event log
│   │       ├── audit.routes.ts
│   │       ├── audit.controller.ts
│   │       ├── audit.service.ts
│   │       └── audit.repository.ts
│   │
│   ├── jobs/                                     # BullMQ workers (separate process entrypoint)
│   │   ├── worker.ts                              # Worker bootstrap
│   │   ├── outbox-dispatch.job.ts                  # Dispatches durable domain events
│   │   ├── hold-expiry.job.ts
│   │   ├── countdown-alert.job.ts
│   │   ├── notification-dispatch.job.ts
│   │   ├── report-generation.job.ts
│   │   └── data-retention.job.ts                    # Scheduled deletion/anonymisation
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts                          # JWT/session verification
│   │   ├── rbac.middleware.ts                            # Role-based route guards
│   │   ├── error-handler.middleware.ts
│   │   ├── request-logger.middleware.ts                    # Datadog trace correlation
│   │   ├── rate-limit.middleware.ts
│   │   └── validate.middleware.ts                            # Schema validation wrapper
│   │
│   ├── db/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── client.ts                                            # Prisma client singleton
│   │   └── raw-sql/
│   │       └── booking-exclusion-constraint.sql                   # PostgreSQL range exclusion constraint
│   │
│   ├── config/
│   │   ├── env.ts                                                     # Validated env loader
│   │   ├── redis.ts
│   │   ├── cookies.ts                                                   # Auth cookie policy
│   │   ├── email.ts                                                     # Resend primary, ZeptoMail fallback
│   │   ├── datadog.ts                                                   # dd-trace init
│   │   ├── sentry.ts                                                      # Sentry init
│   │   └── swagger.ts                                                       # OpenAPI/Swagger setup
│   │
│   ├── lib/
│   │   ├── logger.ts
│   │   ├── errors.ts                                                          # Custom error classes
│   │   └── crypto.ts                                                            # Encryption helpers (ID docs, tokens)
│   ├── scripts/
│   │   └── seed-super-admin.ts                                                   # Creates first Super Administrator from env vars
│   │
│   ├── app.ts                                                                      # Express app assembly
│   └── server.ts                                                                     # Entrypoint (listen)
│
├── tests/
│   ├── integration/
│   └── e2e/
├── Dockerfile
├── .env.example
├── tsconfig.json
└── package.json
```

---

## 3. Frontend Apps (Next.js, shared component system)

Each app shares `packages/ui` and `packages/api-client`, but ships independently with role-scoped routes.

```
apps/customer-pwa/
├── app/
│   ├── (auth)/
│   │   ├── register/
│   │   ├── verify/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── bookings/
│   │   ├── subscriptions/
│   │   ├── qr/
│   │   ├── receipts/
│   │   └── profile/
│   ├── book/
│   │   └── [resourceId]/
│   ├── manifest.json                # PWA manifest
│   └── layout.tsx
├── components/
├── lib/
│   └── api.ts                        # Wraps packages/api-client
├── public/
│   └── service-worker.js
└── next.config.js

apps/reception-app/
├── app/
│   ├── scan/
│   ├── checkin/
│   ├── checkout/
│   └── exceptions/
└── ...

apps/admin-portal/
├── app/
│   ├── operations/          # Resources, bookings, schedules, overrides
│   ├── finance/              # Transactions, refunds, reconciliation
│   ├── customers/
│   ├── reports/
│   └── settings/               # Roles, RBAC config, super-admin
└── ...

apps/web/
├── app/
│   ├── plans/
│   ├── facilities/
│   ├── contact/
│   └── page.tsx                   # Home
└── ...                              # SEO-focused, pulls catalogue data from api-client
```

---

## 4. Shared Packages

```
packages/api-client/
├── src/
│   ├── generated/            # Auto-generated from OpenAPI spec (openapi-typescript)
│   ├── hooks/                # React Query hooks: useBooking(), useCatalogue(), etc.
│   └── index.ts
└── package.json

packages/ui/
├── src/
│   ├── components/            # Button, Card, Table, QRDisplay, StatusBadge, etc.
│   ├── theme/                  # Tailwind tokens, brand colors
│   └── index.ts
└── package.json

packages/types/
├── src/
│   ├── booking.types.ts          # BookingState enum, DTOs
│   ├── roles.types.ts
│   ├── payment.types.ts
│   └── index.ts
└── package.json
```

---

## 5. Notes on Structure Decisions

- **Module-per-domain in `apps/api/src/modules`** mirrors the proposal's Application Layer diagram (Identity, Catalogue, Booking, Subscriptions, Payments, Access, Notifications, Reporting, Audit) so each can later be pulled into its own service without restructuring.
- **`jobs/worker.ts` runs as a separate process** from the Express API (same codebase, different entrypoint) — this matches the proposal's Redis/BullMQ requirement for holds, countdowns, and notification retries without blocking API request threads.
- **`db/raw-sql/`** exists specifically for the PostgreSQL exclusion constraint that Prisma cannot express natively — critical for the no-double-booking guarantee.
- **Observability hooks live in `config/datadog.ts` and `config/sentry.ts`**, initialized at the top of `server.ts` and `worker.ts` so both the API and background jobs are traced/monitored (see Technical Design Document §9).
- **`packages/api-client`** is the single source of truth consumed by `web`, `customer-pwa`, `reception-app`, and `admin-portal` — this directly implements the proposal's "one shared catalogue and pricing database" principle at the frontend layer.
