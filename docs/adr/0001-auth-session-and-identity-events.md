# ADR 0001: Authentication, Session Management, and Identity Events

**Status:** Accepted
**Date:** 2026-08-20

## Context

Milestone 1.1 requires real identity foundations for the DAIH platform: customer registration, email verification, password reset, Client ID generation, policy consent capture, RBAC, rate limiting, and staging observability. The customer app is a PWA, so token handling must work after app reloads while limiting token exposure to browser JavaScript. The platform is also being built as an event-driven modular monolith.

## Decision

DAIH will use short-lived JWT access tokens and opaque refresh tokens:

- Access tokens live for 15 minutes by default and are kept in frontend memory only.
- Refresh tokens are stored only as `HttpOnly`, `Secure`, `SameSite=Lax` cookies.
- Refresh tokens are persisted server-side as hashes on `AuthSession` records.
- Refresh rotation is mandatory on every refresh request.
- Refresh-token reuse revokes the affected token family/session chain and emits a security event.
- Email verification marks the account verified, but users must log in after verification.
- Customer self-registration is public; staff/admin accounts are created only by Super Administrators.
- The first Super Administrator is created by a seed script using environment variables.
- Client IDs are sequential per year, for example `DAIH-2026-000001`, generated transactionally.
- Transactional email uses Resend as the primary provider and ZeptoMail as fallback.
- Identity rate limiting is Redis-backed and avoids account enumeration.

The event-driven boundary is implemented with a transactional outbox:

- Domain writes and outbox events are committed in the same PostgreSQL transaction.
- BullMQ worker jobs dispatch outbox events to email, audit, and observability handlers.
- Events never include raw passwords, raw verification/reset tokens, refresh tokens, or sensitive identity documents.

## Consequences

This gives the PWA durable login continuity without storing long-lived credentials in JavaScript-accessible storage. It keeps session revocation and refresh-token reuse detection under server control, which is important for staff/admin access and future MFA.

The transactional outbox adds a small amount of implementation work but avoids losing identity side effects such as verification emails or audit records when a request succeeds and an async handler fails.

Cross-subdomain deployments should use a shared parent domain cookie, e.g. `.daih.ng`, with the refresh cookie path restricted to `/api/v1/identity/refresh`. Local development may omit the cookie domain and disable `Secure`.
