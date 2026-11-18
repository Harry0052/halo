# Halo runbook

This is how to run the app that is in this repository. It is not a certification, and it is not a claim that Halo is ready for a public launch.

## What you need

- Node.js 22 or newer
- A writable directory for the SQLite file
- No API key

## Environment

Names only. Do not commit real values.

| Name | Purpose |
| --- | --- |
| `HALO_DB_PATH` | SQLite file. Default `data/halo.db`. |
| `HALO_INVITE_SECRET` | HMAC key for invite links. At least 16 characters. When unset, Halo uses a known local fallback and says so on Circle. Do not expose that server to the public internet. |
| `HALO_RP_ID` | WebAuthn relying party id. Default is the request hostname. Use a real hostname such as `localhost`. A numeric address cannot be a passkey id. |
| `HALO_ORIGIN` | WebAuthn origin, for example `http://localhost:3000`. Default is the request origin. |

`X-Forwarded-For` is used as a rate-limit key. A reverse proxy must overwrite that header. The app does not treat it as proof of identity.

## Start and migrate

Migrations run when the server opens the database, including `npm run dev` and `npm run start`. `npm run db:setup` does the same thing and prints the path.

```bash
npm install
npm run db:setup
npm run build
npm run start
```

Open `http://localhost:3000`.

There is no separate worker. Status polling is the browser asking the server. Expiry is applied on read and on answer, using the server clock.

## Backup

Copy `data/halo.db` (and the `-wal` and `-shm` files if they exist) while the server is stopped, or use SQLite's backup command. The file contains names, check purposes, passkey public keys, and report text. Treat the copy as personal data.

## Rollback

Schema changes are forward-only SQL files in `drizzle/migrations`. Rolling back the code without the database can fail if a new column is missing. To go back:

1. Stop the server.
2. Restore the SQLite file from the backup taken before the migration.
3. Check out the previous commit.
4. Start again.

Do not delete `schema_migrations` rows by hand unless you are also restoring the matching file.

## When something fails

The server writes a JSON line to stderr for unexpected failures. Those lines include a scope and a code. They do not include check purpose text, tokens, or raw IP addresses.

Useful tables, queried on the machine that holds the file:

- `security_events` for name changes, invites, checks, passkey registration, revokes, blocks, reports, and deletion
- `rate_buckets` for the current hourly windows
- `challenges` for status and expiry
- `device_credentials` for `revoked_at`

There is no paging vendor and no hosted log drain in this repo.

## Incident, local scope

1. Stop accepting traffic if the process is reachable by people it should not serve.
2. If a passkey is suspected, the person can revoke it on Requests. A lost browser session can be ended by deleting the data on Safety, which revokes passkeys and removes the session.
3. Restore the database from backup if rows were damaged.
4. Rotate `HALO_INVITE_SECRET` if invite links might have been forged. Old links stop verifying. Accepted circles stay.

## What this repo does not do

- It does not send email, SMS, or push.
- It does not take payments.
- It does not prove a person is physically safe.
- It does not claim a compliance certification.
- It has not been run as the pilot in `docs/PILOT.md`.
