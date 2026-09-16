# DAIH Milestone 1.1 — Foundation & Identity Implementation Plan

**Milestone:** 1.1 — Foundation & Identity
**Phase:** Phase 1 — Minimum Viable Product
**Target window:** Weeks 1–2
**Architecture:** Event-driven modular monolith with transactional outbox
**Companion docs:** `DAIH_Technical_Design_Document.md`, `DAIH_File_Structure.md`, `DAIH_Milestone_Plan.md`, `docs/adr/0001-auth-session-and-identity-events.md`

---

## 1. Objective

Milestone 1.1 establishes the platform foundation needed for all later MVP modules. By the end of this milestone, DAIH should have a working monorepo baseline, real persisted identity, secure authentication/session management, RBAC enforcement, first Super Administrator seeding, rate-limited auth endpoints, transactional identity events, and observability smoke checks.

The milestone closes only when a customer can register, verify email, log in after verification, receive a sequential Client ID, access protected customer routes, and be denied from routes outside their role. A seeded Super Administrator must be able to create staff/admin users. Sentry and Datadog must capture deliberate test events in staging.

---

## 2. Locked Decisions

- Customer app is a PWA.
- Access token is a short-lived JWT, default `15m`.
- Access token is returned in the response body and stored in frontend memory only.
- Refresh token is an opaque token stored only in an `HttpOnly` cookie.
- Refresh cookie is `Secure` and `SameSite=Lax` in production.
- Production refresh cookie domain should be the shared parent domain, e.g. `.daih.ng`.
- Refresh cookie path should be restricted to `/api/v1/identity/refresh`.
- Refresh tokens are stored server-side only as hashes.
- Refresh token rotation is mandatory.
- Refresh token reuse revokes the affected token family/session chain.
- Email verification does not log the user in automatically; the user must log in after verification.
- Transactional email uses Resend as primary provider and ZeptoMail as fallback.
- Client IDs are sequential per year, e.g. `DAIH-2026-000001`.
- Staff/admin accounts are created only by Super Administrators.
- First Super Administrator is created by a seed script using environment variables.
- Identity side effects use transactional outbox events dispatched by the worker.

---

## 3. Current Starting Point

Already present:

- Monorepo scaffold with `apps/api`, `apps/web`, `apps/customer-pwa`, `apps/reception-app`, `apps/admin-portal`.
- Shared packages: `packages/ui`, `packages/types`, `packages/api-client`, `packages/config`.
- Basic Express API and Next.js app skeletons.
- Prisma schema with `User`, `PolicyConsent`, roles, bookings, transactions, and audit logs.
- Basic RBAC role/permission map in `packages/types`.
- Basic auth and RBAC middleware.
- Local Docker Compose for Postgres, Redis, and MinIO.

Known gaps:

- Identity routes are currently demo/in-memory.
- Customer login/register pages simulate auth instead of calling the API.
- No real password hashing, verification tokens, reset tokens, persisted sessions, refresh rotation, or consent transaction yet.
- No transactional outbox module yet.
- No first Super Admin seed script yet.
- No Sentry/Datadog runtime wiring yet.
- No CI workflow yet.

---

## 4. Workstreams

### 4.1 Foundation Stabilisation

Deliverables:

- Fix workspace install/typecheck behavior.
- Add CI workflow for install, typecheck, build, and tests.
- Ensure all apps and shared packages build from the monorepo.
- Update root README to describe the monorepo and legacy static site relationship.
- Validate required environment variables at API startup.

Acceptance checks:

- `pnpm typecheck` succeeds.
- `pnpm build` succeeds or produces documented non-1.1 blockers.
- CI workflow runs the same baseline checks.

### 4.2 Database & Prisma Model Updates

Add or refine models for:

- `AuthSession`
- `VerificationToken`
- `PasswordResetToken`
- `ClientIdSequence`
- `OutboxEvent`

Expected controls:

- Tokens are stored as hashes, never raw values.
- Session records include expiry, revoked state, token family, IP address, user agent, and last-used timestamp.
- Client ID sequence increments transactionally.
- Outbox events are written in the same transaction as the identity state change.

Acceptance checks:

- Prisma migration applies cleanly.
- Schema supports register, verify, login, refresh, logout, reset password, and Super Admin staff creation.

### 4.3 Identity Module

Refactor identity from a demo route into layered module files:

- `identity.routes.ts`
- `identity.controller.ts`
- `identity.service.ts`
- `identity.repository.ts`
- `identity.schema.ts`
- `identity.types.ts`
- `client-id.service.ts`
- `password.service.ts`
- `session.service.ts`
- `token.repository.ts`
- `staff-user.service.ts`

Public customer flows:

- Register with name, email, phone, password, and policy consent.
- Verify email with a token link.
- Resend verification email.
- Login after email verification.
- Refresh access token with HttpOnly refresh cookie.
- Logout and revoke active session.
- Request password reset.
- Confirm password reset.
- Fetch current user profile.

Staff/admin flow:

- Seed the first Super Administrator from environment variables.
- Super Administrator creates staff/admin users.
- No public staff/admin self-registration.

Acceptance checks:

- Duplicate email registration is rejected.
- Registration captures consent and emits events.
- Unverified users cannot log in.
- Email verification requires login afterward.
- Login creates persisted session and refresh cookie.
- Refresh rotates refresh token.
- Refresh token reuse is detected and revokes the session family.
- Logout revokes the active session.
- Password reset revokes active sessions after success.
- Seed script creates exactly one initial Super Administrator or idempotently updates the configured account.

### 4.4 API Endpoints

Identity endpoints:

```text
POST /api/v1/identity/register
POST /api/v1/identity/login
POST /api/v1/identity/refresh
POST /api/v1/identity/logout
GET  /api/v1/identity/verify-email?token=...
POST /api/v1/identity/resend-verification
POST /api/v1/identity/password-reset/request
POST /api/v1/identity/password-reset/confirm
GET  /api/v1/identity/me
POST /api/v1/identity/admin/users
```

Debug/staging observability endpoints:

```text
GET /api/v1/debug/sentry-error
GET /api/v1/debug/datadog-span
```

Debug endpoints must be disabled in production or restricted to trusted staging/admin access.

### 4.5 Event-Driven Identity Outbox

Add an `events` module responsible for durable event creation and dispatch:

- `outbox.repository.ts`
- `outbox.service.ts`
- `event-dispatcher.ts`
- `event.types.ts`
- `handlers/identity-email.handler.ts`
- `handlers/identity-audit.handler.ts`
- `handlers/observability.handler.ts`

Identity events:

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

Event rules:

- No raw passwords.
- No raw verification/reset tokens.
- No raw refresh tokens.
- No sensitive identity document payloads.
- Events must be retryable and idempotent.

Acceptance checks:

- Identity service writes state and outbox records in one DB transaction.
- Worker dispatches pending identity events.
- Failed handlers are retried without duplicating completed side effects.

### 4.6 Email Providers

Implement provider abstraction:

- Primary: Resend.
- Fallback: ZeptoMail.
- Local/dev fallback: console or captured mock provider.

Templates needed for 1.1:

- Email verification.
- Password reset.
- Staff/admin account invitation or setup notice.

Acceptance checks:

- Verification email event produces a provider send attempt.
- Password reset email event produces a provider send attempt.
- If Resend fails, ZeptoMail fallback is attempted.
- Email failures are logged and retried by event/job handling.

### 4.7 Rate Limiting

Use Redis-backed rate limiting.

Baseline limits:

| Endpoint group         | Key                   | Baseline                         |
| ---------------------- | --------------------- | -------------------------------- |
| Login                  | IP + normalized email | 5 failed attempts per 15 minutes |
| Registration           | IP                    | 10 attempts per hour             |
| Verification resend    | IP + normalized email | 3 attempts per hour              |
| Password reset request | IP + normalized email | 3 attempts per hour              |
| Refresh                | session/IP            | Conservative burst limit         |
| Anonymous routes       | IP                    | Route-class baseline             |

Acceptance checks:

- Login brute-force limit triggers correctly.
- Password reset and verification resend do not reveal whether an email exists.
- Rate-limit responses are consistent and do not leak account existence.

### 4.8 RBAC & Route Protection

Use the shared `UserRole`, `Permission`, and `ROLE_PERMISSIONS` map as the source of truth.

Controls:

- `authenticate` verifies access token shape and session state.
- `requirePermission` and `requireRoles` guard privileged API routes.
- Frontends guard route groups by expected role.
- Staff/admin creation requires `users:manage`.
- Privileged sessions are MFA-ready even before MFA is implemented.

Acceptance checks:

- Unauthenticated requests receive `401`.
- Authenticated users without permission receive `403`.
- Customer cannot access admin-only route.
- Super Administrator can create staff/admin users.
- Staff/admin self-registration path does not exist.

### 4.9 Frontend Integration

Customer PWA:

- Register form calls API.
- Login form calls API.
- Verify email page handles verification result and sends user to login.
- Password reset request/confirm pages call API.
- App stores access token in memory.
- App calls refresh endpoint with `credentials: "include"` when opened or when access token expires.
- Protected dashboard checks auth state.

Admin portal:

- Login uses same auth API.
- Protected admin routes require staff/admin roles.
- Super Admin user creation screen can be added as a minimal 1.1 admin utility or deferred behind API-only verification if UI time is constrained.

API client:

- Support `credentials: "include"` for refresh/logout flows.
- Handle access-token refresh and retry for authenticated requests.

Acceptance checks:

- Customer can complete register -> verify -> login -> dashboard.
- Access token is not stored in localStorage.
- Refresh cookie is HttpOnly and scoped correctly.
- Admin-only route blocks customer session.

### 4.10 Observability

API:

- Initialize `dd-trace` before other imports in `server.ts` and `worker.ts`.
- Initialize Sentry in Express before request middleware and after routes as the error handler.
- Add structured logging with trace correlation.

Frontends:

- Initialize `@sentry/nextjs` in customer PWA and admin portal.
- Add a staging-only test error trigger.

Acceptance checks:

- Deliberate API exception appears in Sentry.
- Deliberate frontend exception appears in Sentry.
- Deliberate API request/span appears in Datadog.
- Worker error capture is verified for a test event/job.

---

## 5. Environment Variables

Required additions:

```text
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
REFRESH_COOKIE_NAME=daih_refresh
REFRESH_COOKIE_DOMAIN=.daih.ng
AUTH_TOKEN_HASH_SECRET=

SUPER_ADMIN_EMAIL=
SUPER_ADMIN_PASSWORD=
SUPER_ADMIN_FIRST_NAME=
SUPER_ADMIN_LAST_NAME=
SUPER_ADMIN_PHONE=

RESEND_API_KEY=
RESEND_FROM_EMAIL=
ZEPTOMAIL_API_KEY=
ZEPTOMAIL_FROM_EMAIL=
ZEPTOMAIL_API_URL=

RATE_LIMIT_REDIS_URL=
```

Existing variables such as `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`, `REDIS_URL`, `SENTRY_DSN`, and Datadog settings remain required.

---

## 6. Testing Plan

API integration tests:

- Register creates unverified user, policy consent, sequential Client ID, and outbox events.
- Register rejects duplicate email.
- Login fails for unverified user.
- Verify email consumes token and marks user verified.
- Login after verification returns access token and sets refresh cookie.
- Refresh rotates refresh token.
- Reusing old refresh token revokes the token family.
- Logout revokes session.
- Password reset request returns generic response.
- Password reset confirm changes password and revokes sessions.
- Super Admin seed script is idempotent.
- Super Admin can create staff/admin users.
- Customer cannot create staff/admin users.
- RBAC allow/deny paths behave as expected.
- Rate limits trigger on login and reset/verification resend.

Frontend smoke tests:

- Customer registration form posts to API.
- Verification result page redirects user to login.
- Login reaches dashboard.
- Protected route redirects anonymous user.
- Customer role is blocked from admin route.

Observability smoke tests:

- API test exception captured in Sentry.
- Frontend test exception captured in Sentry.
- API request/span visible in Datadog.
- Worker event/job failure captured.

---

## 7. Milestone 1.1 Exit Checklist

- [x] Workspace install/typecheck/build baseline is stable.
- [x] CI runs install, typecheck, build, and tests.
- [x] Prisma migration includes identity/session/token/outbox models.
- [x] First Super Administrator seed script exists and is idempotent.
- [x] Customer registration persists user, consent, sequential Client ID, and verification event.
- [x] Email verification requires user login afterward.
- [x] Login creates access token, refresh cookie, and persisted session.
- [x] Refresh token rotation and reuse detection are implemented.
- [x] Logout revokes the active session.
- [x] Password reset flow is implemented.
- [x] Staff/admin creation is Super Admin-only.
- [x] Identity events are persisted and dispatched through the outbox worker.
- [x] Resend primary and ZeptoMail fallback are wired behind an email provider interface.
- [x] Redis-backed rate limits protect identity endpoints.
- [x] RBAC middleware protects API routes and role-based frontend routes.
- [x] Customer PWA auth pages call the real API.
- [x] Admin portal has protected access for privileged roles.
- [x] Sentry and Datadog are initialized in API and frontends.
- [x] Deliberate staging test exceptions/spans are visible in Sentry and Datadog.

---

## 8. Open Items Before Coding

- Confirm the production/staging domain plan for cookie scope. Current assumption: `app.daih.ng`, `admin.daih.ng`, and `api.daih.ng` under `.daih.ng`.
- Confirm whether ZeptoMail should be used only as failover or also as provider selectable by environment.
- Confirm whether Super Admin-created staff users receive a temporary password or a setup-password email link. Recommended: setup-password email link.
- Confirm whether Client ID sequence should start at `000001` for the current year or continue from any existing customer list.
