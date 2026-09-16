# The Dare Adeboye Innovation Hub (DAIH) — Workspace Platform Monorepo

The **DAIH Workspace Platform** is a unified digital workspace management platform for The Dare Adeboye Innovation Hub in Redemption City, Ogun State.

This repository is structured as a **modular monorepo** managed with `pnpm` workspaces and `turborepo`.

---

## 1. Monorepo Structure

```text
daih-platform/
├── apps/
│   ├── web/              # Public marketing site (Next.js App Router)
│   ├── customer-pwa/     # Customer-facing PWA (Auth, Bookings, Payments, QR Check-in)
│   ├── reception-app/    # Reception & Security scanner app (QR Token verification)
│   ├── admin-portal/     # Operations, Finance & Super Admin portals
│   └── api/              # Modular Monolith Express API (PostgreSQL, Prisma, BullMQ, Redis)
├── packages/
│   ├── api-client/       # Typed HTTP client shared across frontends
│   ├── ui/               # Shared design system components & primitives
│   ├── config/           # Shared TypeScript & Tailwind configurations
│   └── types/            # Shared DTOs, Enums, Roles & RBAC definitions
├── infra/
│   └── docker/           # Docker Compose for PostgreSQL, Redis, MinIO
├── docs/                 # Architecture, TDD, Milestone Plans, and ADRs
└── .github/
    └── workflows/        # GitHub Actions CI/CD pipelines
```

---

## 2. Prerequisites

- **Node.js**: `v20.x` or higher
- **pnpm**: `v10.x` (`npm install -g pnpm`)
- **Docker**: For local PostgreSQL, Redis, and MinIO instances

---

## 3. Quickstart & Local Setup

### 1. Clone & Install Dependencies

```bash
git clone <repo-url>
cd DAIH-main
pnpm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 3. Start Local Infrastructure (Postgres, Redis, MinIO)

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

### 4. Initialize Database & Seed

```bash
pnpm --filter @daih/api prisma:generate
pnpm --filter @daih/api prisma:migrate
pnpm --filter @daih/api exec tsx src/scripts/seed-super-admin.ts
```

### 5. Run Development Servers

```bash
# Run all apps in parallel
pnpm dev

# Or run a specific application:
pnpm --filter @daih/api dev           # API (Port 4000)
pnpm --filter @daih/customer-pwa dev  # Customer PWA (Port 3001)
pnpm --filter @daih/web dev           # Public Site (Port 3000)
pnpm --filter @daih/admin-portal dev  # Admin Portal (Port 3003)
pnpm --filter @daih/reception-app dev # Reception App (Port 3002)
```

---

## 4. Common Scripts

- `pnpm build`: Build all packages and applications
- `pnpm dev`: Start development servers with hot-reload
- `pnpm typecheck`: Run TypeScript compiler checks across all workspaces
- `pnpm test`: Run automated unit and integration test suites

---

## 5. Security & RBAC Model

The platform enforces strict Role-Based Access Control (RBAC):

- **Roles:** `CUSTOMER`, `RECEPTION_OFFICER`, `SECURITY_OFFICER`, `OPERATIONS_ADMIN`, `FINANCE_OFFICER`, `MANAGEMENT_VIEWER`, `SUPER_ADMIN`.
- **Authentication:** Short-lived JWT access tokens (`15m`) + HttpOnly refresh cookies (`/api/v1/identity/refresh`) with refresh token rotation and reuse detection.
- **Client IDs:** Deterministic sequential format per year, e.g. `DAIH-2026-000001`.
