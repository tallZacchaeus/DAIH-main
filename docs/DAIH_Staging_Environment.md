# DAIH Staging Environment & Deployment Specification

**Milestone:** 1.1 � Foundation & Identity  
**Architecture:** Multi-App Monorepo with Shared Parent Domain Cookie Scope  
**Target Domain:** .daih.ng (Staging: *.staging.daih.ng or .daih.ng)

---

## 1. Staging Service URLs & Subdomains

| Service                       | Staging URL                   | Purpose                                                  | Tech Stack                              |
| :---------------------------- | :---------------------------- | :------------------------------------------------------- | :-------------------------------------- |
| **Public Marketing Website**  | https://staging.daih.ng       | Marketing site, plans, space directory, inquiries        | Next.js App Router (Port 3000)          |
| **Customer PWA**              | https://app.staging.daih.ng   | Customer registration, login, bookings, digital QR key   | Next.js App Router (Port 3001)          |
| **Admin & Operations Portal** | https://admin.staging.daih.ng | Operations desk, finance ledger, staff & user management | Next.js App Router (Port 3003)          |
| **Reception Scanner App**     | https://kiosk.staging.daih.ng | Self-service check-in kiosk & desk verification          | Next.js App Router (Port 3002)          |
| **Core API**                  | https://api.staging.daih.ng   | REST API, Auth, Outbox Dispatcher, RBAC                  | Node.js / Fastify / Express (Port 4000) |

---

## 2. Cookie Scope & Session Security

To support seamless single-sign-on (SSO) and secure session rotation between frontends (pp.staging.daih.ng, dmin.staging.daih.ng) and the API (pi.staging.daih.ng), authentication follows **ADR 0001**:

- **Access Token:** Short-lived JWT (15m expiry) stored exclusively in frontend memory (inMemoryToken in @daih/api-client).
- **Refresh Token Cookie:**
  - **Name:** daih_refresh
  - **HttpOnly:** rue (inaccessible to browser JavaScript)
  - **Secure:** rue (transmitted over HTTPS only in staging/production)
  - **SameSite:** Lax
  - **Domain:** .daih.ng (enables cross-subdomain API requests from pp and dmin to pi)
  - **Path:** /api/v1/identity/refresh (restricted to refresh endpoint)

---

## 3. Staging Environment Variables (.env.staging)

### API & Worker Service

`env

# Application

NODE_ENV=production
PORT=4000
API_BASE_URL=https://api.staging.daih.ng
APP_ENV=staging

# Database & Cache

DATABASE_URL=postgresql://daih_admin:StrongStagingPass2026!@postgres:5432/daih_staging?schema=public
REDIS_URL=redis://redis:6379/0

# JWT & Authentication

JWT_SECRET=staging_super_secret_jwt_key_256bit_minimum_daih_2026
JWT_REFRESH_SECRET=staging_super_secret_jwt_refresh_key_256bit_minimum_daih_2026
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
REFRESH_COOKIE_NAME=daih_refresh
REFRESH_COOKIE_DOMAIN=.daih.ng

# Super Admin Seed Account

SUPER_ADMIN_EMAIL=superadmin.staging@daih.ng
SUPER_ADMIN_PASSWORD=DAIH_SuperAdmin_2026_Secure!
SUPER_ADMIN_FIRST_NAME=DAIH
SUPER_ADMIN_LAST_NAME=SuperAdmin
SUPER_ADMIN_PHONE=+2348000000001

# Email Providers (Primary: Resend, Failover: ZeptoMail)

EMAIL_PROVIDER_PRIMARY=resend
EMAIL_PROVIDER_FALLBACK=zeptomail
RESEND_API_KEY=re_staging_test_key_123456789
RESEND_FROM_EMAIL=no-reply@notifications.daih.ng
ZEPTOMAIL_API_KEY=zeptomail_staging_test_token_123456789
ZEPTOMAIL_FROM_EMAIL=no-reply@notifications.daih.ng
ZEPTOMAIL_API_URL=https://api.zeptomail.com/v1.1/email

# Observability

SENTRY_DSN=https://staging_sentry_key@o000000.ingest.sentry.io/0000000
DD_TRACE_ENABLED=true
DD_ENV=staging
DD_SERVICE=daih-api-staging
DD_VERSION=1.0.0
`

### Customer PWA (pps/customer-pwa)

`env
NEXT_PUBLIC_API_URL=https://api.staging.daih.ng
NEXT_PUBLIC_APP_ENV=staging
NEXT_PUBLIC_SENTRY_DSN=https://staging_sentry_key@o000000.ingest.sentry.io/0000001
`

### Admin Portal (pps/admin-portal)

`env
NEXT_PUBLIC_API_URL=https://api.staging.daih.ng
NEXT_PUBLIC_APP_ENV=staging
NEXT_PUBLIC_SENTRY_DSN=https://staging_sentry_key@o000000.ingest.sentry.io/0000002
`

---

## 4. Observability Smoke Test Endpoints

| Endpoint / Page            | App              | Method     | Verification Target                                                            |
| :------------------------- | :--------------- | :--------- | :----------------------------------------------------------------------------- |
| /api/v1/debug/sentry-error | pps/api          | GET        | Generates a deliberate exception; captured in Sentry daih-api-staging project. |
| /api/v1/debug/datadog-span | pps/api          | GET        | Creates a custom Datadog APM span; visible in Datadog Tracing catalog.         |
| /debug-sentry              | pps/customer-pwa | Browser UI | Triggers client-side test error; captured in Sentry daih-customer-pwa project. |
| /debug-sentry              | pps/admin-portal | Browser UI | Triggers client-side test error; captured in Sentry daih-admin-portal project. |
