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

Open [http://localhost:3000](http://localhost:3000). Passkeys need `localhost` (or another real hostname). A numeric address such as `127.0.0.1` cannot be a passkey relying party.

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
- Invitation links are HMAC-signed. Only the hash is stored. A bad signature is rejected before any name is read.
- A check stores a SHA-256 of a random nonce. The short code is a separate matching code. The passkey ceremony is bound to that nonce hash, the decision, and the check id.
- Cache Components are off so one person’s checks are not placed in a shared cache.

```text
src/app            routes and pages
src/components     shell, checks, and design-system pieces
src/lib/db         schema, migrations, seed
src/lib/auth       sessions and display names
src/lib/trust      invite links and the trusted circle
src/lib/challenges expiring checks, codes, and status words
src/lib/credentials WebAuthn registration and verification
src/lib/safety     reports, blocks, and browser link codes
src/lib/account    export and deletion
```

## What is real, sandboxed, or disabled

| Capability | State |
| --- | --- |
| Save a name for this browser | Real. Session row in SQLite. |
| Status words Pending, Confirmed, Could not verify | Real. Pending is never shown as Confirmed. There is no checkmark for Confirmed. |
| Invite link, expiry, revoke, mutual accept | Real. Email delivery is disabled, so you copy the link. |
| Sample circle and sample check | Real seed rows, labeled Sample. They cannot be confirmed. |
| Local invite signing fallback | Sandbox. Circle says when `HALO_INVITE_SECRET` is unset. |
| Create a check, code, QR, expiry, cancel | Real. |
| Passkey registration and signed confirm or deny | Real WebAuthn. Use localhost. A denial is Could not verify. |
| Revoke a passkey, block a contact, save a report | Real. A report is stored here. Nobody is emailed. |
| In-app prompt switch and browser link code | Real. Push, email, and SMS stay disabled. The link code is stored only as a hash. |
| Confirmed-check count on Safety | Real rows for that person. Not a public chart. |
| Download data, delete data | Real for the current session. |
| Email, SMS, push, OAuth, phone lookup, payments | Disabled. Nothing is simulated. |
| Hosted Postgres | Not in this repo. Not verified in CI. |

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

GitHub Actions runs the same list on pushes to `main`. Playwright deletes and recreates `data/halo-e2e.db` for that run so one hour of checks does not trip the next run's rate limit.

Screenshots of the main screens are in `docs/screenshots`. Deployment and rollback notes are in `docs/RUNBOOK.md`. The unrun pilot plan is in `docs/PILOT.md`.

This repository does not claim a compliance certification or that the app is ready for a public launch.
