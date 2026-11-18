# Halo

Halo lets someone confirm that a high-stakes request came from an enrolled trusted contact. The contact answers from their own passkey. Halo does not prove the person is physically safe, and it does not send money.

The working codename in the original brief was PROOF. The product name is Halo.

## Quickstart

Node.js 22 or newer. No API key.

```bash
npm install
npm run db:setup
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

`npm run db:setup` creates `data/halo.db` and applies the SQL in `drizzle/migrations`. The database path is `HALO_DB_PATH` (see `.env.example`).

A production-style local process:

```bash
npm run db:setup
npm run build
npm run start
```

## Architecture

- Next.js App Router and React, TypeScript strict, Tailwind CSS.
- SQLite through `better-sqlite3` and Drizzle. This matches the owner’s sibling apps, Ripple and Tether, so Halo runs locally without a hosted database. PostgreSQL is not wired up.
- Server routes under `src/app/api` call services in `src/lib`. Pages read those services directly.
- Sessions are random tokens stored only as a SHA-256 hash. The cookie is `halo_session`, `httpOnly`, `SameSite=Lax`, and `Secure` only on HTTPS.
- Cache Components are off so one person’s checks are not placed in a shared cache.

```text
src/app            routes and pages
src/components     shell and design-system pieces
src/lib/db         schema, migrations, seed
src/lib/auth       sessions and display names
```

## What is real, sandboxed, or disabled

This section matches the stage that is currently on `main`. Later stages extend it. Do not read a row here as a promise that a later stage already shipped.

| Capability | State |
| --- | --- |
| Save a name for this browser | Real. Session row in SQLite. |
| Status words Pending, Confirmed, Could not verify | Real copy. The legend is not a verification result. |
| Trusted circle, challenges, passkeys | Not built yet. |
| Email, SMS, push, OAuth, phone lookup, payments | Disabled. Nothing is simulated. |
| Hosted Postgres | Not in this repo. |

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

GitHub Actions runs the same list on pushes to `main`.

Screenshots of the current screen are in `docs/screenshots`.

This repository does not claim a compliance certification or that the app is ready for a public launch.
