# DAIH Milestone 1.1 � Verification & Acceptance Runbook

**Milestone:** 1.1 � Foundation & Identity  
**Purpose:** Step-by-step verification procedures for proving Milestone 1.1 readiness on staging and local environments.

---

## 1. Automated Test Verification

Run the full API test suite covering password hashing, sequential Client ID generation, policy consent persistence, email verification gate, session refresh rotation/reuse detection, password reset, and RBAC authorization:

`ash
pnpm --filter @daih/api test
`

**Expected Outcome:**

- All 20 tests pass cleanly across email.test.ts, debug.test.ts, and identity.test.ts.

---

## 2. Monorepo Typecheck & Build Verification

Validate that all workspaces typecheck and compile without errors:

`ash

# 1. Typecheck all packages and apps

pnpm typecheck

# 2. Build production artifacts

pnpm build
`

---

## 3. End-to-End User Journeys (Smoke Tests)

### Scenario A: Customer Registration, Verification & Dashboard Access

1. Navigate to Customer PWA: https://app.staging.daih.ng/register
2. Enter Full Name, Phone, Email ( estuser@daih.ng), and Password. Confirm Policy Consent checkbox is checked.
3. Submit form.
   - **Verification:** User is redirected to /verify-email. An outbox event is created and transactional email is dispatched via Resend/ZeptoMail.
4. Open the verification link: https://app.staging.daih.ng/verify-email?token=<token>.
   - **Verification:** Screen displays Email Verified Successfully. User is directed to /login (auto-login is prohibited per ADR 0001).
5. Attempt login on /login with credentials.
   - **Verification:** User receives in-memory JWT, daih_refresh HttpOnly cookie is set, and user is redirected to /dashboard.
6. Reload the browser on /dashboard.
   - **Verification:** Session remains intact via transparent /api/v1/identity/refresh call.

---

### Scenario B: Super Admin Seeding & Staff Provisioning

1. Run initial Super Admin seed script:
   `ash
pnpm --filter @daih/api exec tsx src/scripts/seed-super-admin.ts
`
2. Navigate to Admin Console: https://admin.staging.daih.ng/login
3. Log in with SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD.
   - **Verification:** Access is granted to Admin Console.
4. Navigate to Staff Management: /staff
5. Create a new OPERATIONS_ADMIN user with name, email, and password.
   - **Verification:** Staff user is saved, assigned sequential Client ID, and staff welcome notification is queued.
6. Attempt to log into dmin.staging.daih.ng with a CUSTOMER account.
   - **Verification:** Login is rejected with Access Denied: Customer accounts cannot access the Staff & Admin Console.

---

### Scenario C: Observability & APM Smoke Checks

1. **API Sentry Exception:**
   - Trigger: GET https://api.staging.daih.ng/api/v1/debug/sentry-error
   - Verify in Sentry: Issue appears under daih-api with error message DAIH Staging Smoke Test Exception.
2. **API Datadog APM Span:**
   - Trigger: GET https://api.staging.daih.ng/api/v1/debug/datadog-span
   - Verify in Datadog APM: Trace appears under service daih-api-staging with custom span staging.smoke_test.datadog.
3. **Frontend Customer PWA Sentry Exception:**
   - Navigate to: https://app.staging.daih.ng/debug-sentry
   - Click **Trigger Test Sentry Exception**.
   - Verify in Sentry: Client-side event captured under daih-customer-pwa.
4. **Frontend Admin Portal Sentry Exception:**
   - Navigate to: https://admin.staging.daih.ng/debug-sentry
   - Click **Trigger Test Sentry Exception**.
   - Verify in Sentry: Client-side event captured under daih-admin-portal.

---

## 4. Milestone 1.1 Sign-Off Checklist

- [x] Foundation & CI stabilized.
- [x] Identity API fully implemented with Prisma, Argon2id, and sequential Client IDs.
- [x] RBAC enforcement active with @daih/types permissions map.
- [x] Customer PWA & Admin Portal wired to real API auth flows.
- [x] Sentry & Datadog configured across backend and Next.js frontends.
- [x] Automated test suite green (20/20 tests passing).
- [x] Staging architecture and verification runbook documented.
