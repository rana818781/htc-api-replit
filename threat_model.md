# Threat Model

## Project Overview

Veo Flow API is a pnpm monorepo with an Express 5 backend (`artifacts/api-server`), a React + Vite frontend (`artifacts/flow-access`), and two Chrome MV3 extensions (`artifacts/chrome-extension`, `artifacts/session-keeper`). Users authenticate with custom username/password credentials and JWT bearer tokens, then obtain extension API tokens used to retrieve and inject managed Google Flow session cookies. PostgreSQL stores user accounts, API tokens, usage logs, plans, and pooled Google session cookie data.

Production assumptions for this scan: only production-reachable paths matter; `NODE_ENV=production` in production; Replit handles TLS; `artifacts/mockup-sandbox` is dev-only and should be ignored unless production reachability is demonstrated.

## Assets

- **User accounts and role assignments** — usernames, password hashes, JWT-backed sessions, admin and reseller flags. Compromise enables account takeover and privileged access.
- **Extension API tokens** — long-lived bearer tokens used by the Chrome extension. Compromise allows account-level extension actions and access to managed session material.
- **Managed Google session cookies** — `sessions.cookieData` and `syncKey` values for donor Google Flow accounts. These are the highest-sensitivity assets because they grant access to pooled upstream Google accounts.
- **Subscription and usage data** — plans, credit balances, usage logs, reseller-created users, and admin-visible activity. Exposure affects billing integrity and user privacy.
- **Application secrets and bootstrap configuration** — `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and database credentials. Compromise affects all authentication and trust boundaries.

## Trust Boundaries

- **Browser / extension to API** — all frontend and extension requests cross into the Express API. The client and browser environment are untrusted; every sensitive action must be authenticated and authorized server-side.
- **API to PostgreSQL** — the API has direct access to accounts, API tokens, and pooled Google cookie material. Query safety and response scoping are critical.
- **Admin/reseller/user boundary** — admin routes manage all users and pooled sessions; reseller routes manage only delegated users; normal users should never reach those capabilities.
- **Public sync boundary** — `POST /api/sync/cookies` is intentionally public and relies entirely on possession of a `syncKey`; this path updates highly sensitive cookie material.
- **Production vs dev-only artifacts** — `artifacts/mockup-sandbox` is out of production scope unless separately exposed.

## Scan Anchors

- **Production entry points:** `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/*.ts`, `artifacts/flow-access/src/App.tsx`, `artifacts/chrome-extension/background.js`, `artifacts/session-keeper/background.js`
- **Highest-risk code areas:** `artifacts/api-server/src/middlewares/auth.ts`, `artifacts/api-server/src/routes/auth.ts`, `artifacts/api-server/src/routes/extension.ts`, `artifacts/api-server/src/routes/admin.ts`, `artifacts/api-server/src/routes/reseller.ts`, `artifacts/api-server/src/lib/seed.ts`
- **Public surfaces:** `/api/healthz`, `/api/plans`, `/api/auth/register`, `/api/auth/login`, `/api/sync/cookies`
- **Authenticated surfaces:** `/api/users/*`, `/api/extension/token`, `/api/extension/inject`, `/api/extension/me`, `/api/extension/charge`
- **Privileged surfaces:** `/api/admin/*`, `/api/reseller/*`
- **Usually ignore as dev-only:** `artifacts/mockup-sandbox/**`, generated assets under `attached_assets/**` unless referenced by production code

## Threat Categories

### Spoofing

The application relies on bearer tokens for both web and extension access. All protected API endpoints must require a valid JWT or a valid extension API token, and privileged routes must verify current role state in the database. Bootstrap logic must not grant admin privileges based only on a guessable username match.

### Tampering

Clients can submit registration data, reseller/admin changes, extension charge requests, and public cookie sync payloads. The server must validate input types and enforce server-side ownership, role, and billing rules so users cannot alter other users, plans, or pooled session state outside intended controls.

### Information Disclosure

The system stores and serves highly sensitive Google session cookies and long-lived extension API tokens. These values must never be exposed beyond the authenticated user or administrator who is authorized to use them, and token lifecycle controls must ensure compromised tokens cannot continue to retrieve cookie material after account recovery actions.

### Denial of Service

Public authentication and sync endpoints are internet-reachable and can be abused for brute force or resource exhaustion. Production-exposed login and other abuse-prone endpoints must have rate limiting or equivalent throttling, especially because admin and reseller accounts use the same login surface as normal users.

### Elevation of Privilege

Admin and reseller routes perform privileged account and session management. Server-side authorization must constrain reseller actions to delegated users only, and startup/bootstrap code must not create privilege-escalation paths where an unprivileged account can become admin through configuration-dependent behavior or token reuse.