# FlowAccess Workspace

## Overview

Full-stack SaaS platform called "FlowAccess" — a managed access service for Google Flow (Google's AI video generation tool at labs.google/fx/tools/flow). Users subscribe to plans, receive credits, and use a Chrome extension that automatically injects Google account session cookies into the browser so they can use Google Flow without needing their own Google account.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk (`@clerk/express` on server, `@clerk/react` on frontend)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Architecture

### Artifacts
- **api-server** (`/api`) — Express backend serving all REST API routes
- **flow-access** (`/`) — React + Vite frontend (Task #2)
- **chrome-extension** (`artifacts/chrome-extension/`) — Chrome MV3 extension, packaged as `artifacts/flow-access/public/flowaccess-extension.zip`

### Database Tables (lib/db/src/schema/)
- **plans** — subscription plans (Starter/Pro/Unlimited, seeded on startup)
- **users** — user accounts linked to Clerk user IDs
- **sessions** — Google account sessions (cookie pools managed by admin)
- **usage_logs** — records of each cookie injection
- **api_tokens** — tokens for Chrome extension authentication

### API Routes (artifacts/api-server/src/routes/)
- **health.ts** — GET /api/healthz
- **plans.ts** — GET /api/plans (public)
- **users.ts** — GET /api/users/me, GET /api/users/usage (Clerk auth)
- **extension.ts** — GET /api/extension/token, GET /api/extension/me, POST /api/extension/inject (API token auth)
- **admin.ts** — All /api/admin/* routes (requires isAdmin=true in DB)

### Auth Middleware (artifacts/api-server/src/middlewares/auth.ts)
- `requireAuth` — verifies Clerk session cookie
- `requireAdmin` — verifies Clerk session + isAdmin=true in DB
- `requireApiToken` — verifies X-API-Token header for extension endpoints
- `getOrCreateUser` — finds or creates user, handles manual_ prefix upgrade

### Chrome Extension (artifacts/chrome-extension/)
- **manifest.json** — MV3 manifest with required permissions
- **background.js** — service worker with cookie injection + infinite-reload prevention via `justReloaded` Set
- **content.js** — Google account detection on labs.google
- **site_bridge.js** — reads localStorage.__flowaccess_token__ on FlowAccess website
- **popup.html/js** — extension popup UI
- **auto_signout.js** — prevents accidental Google sign-out

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned)
- `CLERK_SECRET_KEY` — Clerk backend secret key (auto-provisioned)
- `CLERK_PUBLISHABLE_KEY` — Clerk publishable key (auto-provisioned)
- `VITE_CLERK_PUBLISHABLE_KEY` — Same publishable key for frontend (auto-provisioned)
- `PORT` — Server port (Replit assigns automatically)
