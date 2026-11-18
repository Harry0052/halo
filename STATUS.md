# Halo status

Product name: **Halo**. The build brief used the working codename PROOF. That codename is not used in the app, the package, or the interface.

Current stage: **0 — plan accepted by the owner for this run.** Stages 1–6 are pre-approved. This file is updated at the end of each stage. The app is not claimed to be compliant or ready for a public launch.

## Repository at inspection

- Remote: `Harry0052/halo`, private.
- Branch: `main`, one commit (`Initial commit`) and a placeholder `README.md`.
- No application code, lockfile, workflow, or database.
- Sibling apps inspected for conventions: `Harry0052/ripple` and `Harry0052/tether`.

## Confirmed decisions

- Stack follows those siblings: Next.js App Router, TypeScript strict, Tailwind CSS, SQLite via `better-sqlite3` and Drizzle-shaped schema, SQL migrations in `drizzle/migrations`, Vitest, Playwright, GitHub Actions.
- PostgreSQL is not used. Halo has to run locally with no API key and no hosted database. SQLite is the stated reason for leaving the brief’s Postgres suggestion.
- No email, phone, OAuth, push, or payments. Those integrations are not configured, so they stay disabled.
- A person is a display name plus a session cookie on this server. The cookie stores a random token. The database stores only its SHA-256 hash.
- Trusted-circle invites are links. Email delivery is disabled, so the owner copies the link. The link is HMAC-signed. The database stores only a hash of the token.
- When `HALO_INVITE_SECRET` is unset, signing uses a documented local fallback and the Circle screen says so. That fallback is a sandbox, not a production secret.
- Passkeys (WebAuthn) are the real approval credential, added in Stage 4. Localhost is a secure context, so no vendor account is required. There is no phone-number identity and no biometric identity matching.
- Challenge nonces are random and only their SHA-256 hashes are stored. The short code is a separate matching code the two people can read aloud. It is not the authenticator secret.
- A confirmation means the enrolled contact used their passkey on that challenge before it expired. It does not mean the person is physically safe, and it does not make a payment legitimate. Halo never sends money.
- Sample rows, when they exist, are labeled Sample and cannot approve a real challenge.
- Work is committed and pushed on `main`. No pull requests.

## Product scope

Primary navigation, once the screens exist: Verify, Circle, Requests, Safety.

The first real end-to-end action, finished by Stage 4:

1. Two people each save a name on their own browser.
2. One creates an invite link. The other opens it and accepts. Until that acceptance, neither can ask the other to confirm a request.
3. The person who received a suspicious request writes a short purpose, picks the enrolled contact, and picks an expiry of 5, 15, or 30 minutes.
4. Halo shows Pending, a short code, and a QR link. It does not show Confirmed.
5. The contact opens Requests on their browser, checks the purpose and code, and confirms or denies with a passkey.
6. The requester sees Confirmed, or Could not verify, with the server timestamp in UTC.

Out of scope: payments, “this person is safe,” phone lookup, biometric matching, email or push delivery, and any result that was not written by the server.

## Integrations

| Integration | State |
| --- | --- |
| SQLite on this machine | Will be real |
| Session cookies | Will be real |
| Invite links | Will be real. Delivery is copy-the-link |
| WebAuthn passkeys | Will be real in Stage 4, including CI’s virtual authenticator |
| In-app polling of challenge status | Will be real |
| Email, SMS, push, OAuth, payments, phone identity | Missing and disabled |
| Hosted Postgres | Not in this repo |
| Invite HMAC without `HALO_INVITE_SECRET` | Sandbox, labeled in the UI |

## Mobile flow

Widths: 390px first, then 768px and 1440px.

1. **Verify** — name, then the request form once a contact is accepted. Empty, error, and saved states.
2. **Challenge** — Pending, code, QR, expiry, and the limitation sentence. Cancel while it is still pending.
3. **Requests** — the contact sees purpose, origin, and code. Confirm and deny both require a passkey. No passkey: the only action is to add one.
4. **Receipt** — Pending, Confirmed, or Could not verify, plus the UTC timestamp. Pending never uses the word Verified or the word Confirmed.
5. **Circle** — no contacts, invite waiting, accepted, blocked.
6. **Safety** — how this scam works, what Halo cannot do, revoke a passkey, block, report, notification preference, export, delete.

Failure and permission paths:

- Unaccepted, blocked, or unknown contact: no challenge is created. The message does not reveal whether some other account exists.
- Expired or already answered challenge: the server refuses another answer.
- Another person’s credential, or a revoked passkey: rejected.
- Deny: Could not verify, not Confirmed.
- A stranger opening the link: the same not-found message as a missing challenge.
- Polling failure: the saved state stays. The screen says the refresh failed and offers a retry. There is no bypass that marks it confirmed.
- Rate limit: a clear wait message, no silent success.

## Component map

- Shell: header, footer, skip link, desktop nav, bottom nav, 404, error boundary.
- UI: button, text field, textarea, badge, card, dialog, toast, empty state, skeleton.
- Product: name form, status word (Pending / Confirmed / Could not verify), invite panel, challenge form, code and QR, approver actions, receipt, circle list, safety actions.

## Domain model for Stage 2 only

Stage 2 does not create challenge or passkey tables.

- `users` — id, display name, kind (`member`, `demo`, `deleted`)
- `sessions` — user id, token hash, expiry
- `trust_invitations` — owner, token hash, expiry, accepted by, revoked
- `trust_edges` — requester, contact, status (`accepted`, `blocked`, `removed`)
- `security_events` — user, kind, safe metadata
- `rate_buckets` — fixed-window counters (table created with the foundation; limits tighten as each action appears)

Later stages add challenges, passkeys, responses, reports, and device-link codes. They are not created in Stage 1.

## Security boundary

- Every read and write checks the session user against the row.
- Missing and forbidden challenges return the same not-found response.
- No directory and no phone or email lookup.
- Invite tokens and session tokens are hashed at rest.
- Nonces are hashed. Purposes reject long card or account numbers.
- Passkey checks happen on the server. The browser cannot submit another user id.
- Confirm and deny both require a signature from a passkey that belongs to the contact and is not revoked.
- Short expiry on server time. One response. Replay rejected.
- Throttles by user and by IP. IP from `X-Forwarded-For` is only meaningful behind a proxy that overwrites that header.
- Audit rows omit purpose text, tokens, and raw IPs.
- Secrets stay in the environment. `.env.example` has names only.

## Technical risks

1. **WebAuthn in automation.** The passkey ceremony needs Chromium’s virtual authenticator in Playwright. If that ceremony is flaky, Stage 4 stays blocked until the real assertion verifies. There will be no test-only success flag in production.
2. **String-compared timestamps.** All stored instants are UTC ISO-8601 with milliseconds so SQLite text comparison matches time order. A differently shaped timestamp would break expiry.
3. **Local invite fallback.** A server left on the public internet without `HALO_INVITE_SECRET` would use a known signing key. The UI has to keep saying that.
4. **Guest sessions are per browser.** A second device is enrolled with a one-time device code, not with email recovery. Losing every device means losing the passkeys. Export does not reconstruct a passkey.
5. **SQLite on one machine.** This is the local and CI store. It is not a hosted, replicated database, and this repo does not claim that it is.

## Stage 1 checklist

- Scaffold the sibling toolchain and CI.
- Tokens, type, shell, focus, 404, error boundary, mobile and desktop.
- One screen: save the name contacts will see, persist it, restore it on refresh.
- Status-word legend labeled as words Halo uses, not as a verification result.
- No dead primary button. No challenge button until a trusted contact exists.
- Lint, typecheck, unit tests, production build, Playwright at 390 and 1440.

## Stage 0 report

```text
PRODUCT: Halo
STAGE: 0
STATUS: PASS
USER-FACING WORKING FLOWS: None yet. The repository had no product code. The first real action by the end of Stage 2 is two named people and an accepted trusted pair. Challenges wait until Stage 3. Passkey answers wait until Stage 4.
UI/UX: No screens yet. Flow above is the mobile sequence to build. Midnight #121725, teal #25CAB7, pale #EFF6F5. Words: Pending, Confirmed, Could not verify. No checkmark for Confirmed.
DATA + SECURITY: No tables created in this stage. Stage 2 model and the security boundary are recorded above. Email, push, phone identity, and payments are absent.
TESTS: not run — no project scripts exist yet.
REAL INTEGRATIONS: none yet | SANDBOX: local invite signing fallback, planned | DISABLED: email, SMS, push, OAuth, payments, phone lookup, hosted Postgres
FILES CHANGED: STATUS.md
OPEN BUGS/RISKS: The five risks above. No runtime bugs yet.
NEXT STAGE PROPOSAL: Stage 1 foundation and the name screen.
AWAITING APPROVAL: NO — the owner pre-approved every stage for this run.
```
