# @game-master-bell/api

Self-hosted call API for [Game Master Bell](https://github.com/gatherloop/game-master-bell),
per [PRD-v3](../../docs/PRD-v3.md). Validates bell calls from the bell web
app and fans them out as Web Push notifications to game master devices, with
no Google/Firebase dependency.

Moved here from the standalone `game-master-bell-api` repo (PRD-v3 phase 2)
as an unchanged workspace package. As of PRD-v3 phase 3, table codes are
validated against `tables.json` imported directly from `packages/shared` at
build time. As of PRD-v3 phase 4, an FCM sender module (`src/fcm/`) can send
a data-only, high-priority topic message via `firebase-admin`. As of PRD-v3
phase 5 (see [PRD-v3 §3.2](../../docs/PRD-v3.md#32-call-api-appsapi-moved-into-this-repo)),
`POST /call` fans out to **both** Web Push and FCM on every call — each
channel sends and logs independently, so one channel failing (e.g. FCM
misconfigured, or a dead Web Push subscription) never fails or blocks the
other. This dual fan-out is the bridge state for the receiver migration:
once every staff phone runs the native Android app, phase 9 removes the Web
Push path.

## Stack

Node.js 22 + TypeScript + [Fastify](https://fastify.dev/).

## Development

Run from the repo root — this is a pnpm workspace package:

```bash
pnpm install
pnpm --filter @game-master-bell/api dev   # start the dev server with reload (http://localhost:3000)
```

## Scripts

Run any of these with `pnpm --filter @game-master-bell/api <script>` from
the repo root (or `pnpm <script>` from within `apps/api`). Lint and format
are handled at the repo root (`pnpm lint`, `pnpm format`) since this package
shares the monorepo's ESLint/Prettier config.

| Script                 | Purpose                                    |
| ---------------------- | ------------------------------------------- |
| `dev`                  | Run the API with hot reload                |
| `build`                | Compile TypeScript to `dist/`              |
| `start`                | Run the compiled server (`dist/server.js`) |
| `typecheck`            | `tsc -b`                                   |
| `test`                 | Vitest                                     |
| `vapid:generate`       | Print a new VAPID key pair                 |
| `fcm:send-test`        | Send one test FCM call message to `FCM_TOPIC` (manual smoke test, not part of `/call`) |

## Endpoints

| Endpoint                | Auth           | Purpose                                                                                                                                                                                                                                                        |
| ------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /healthz`          | None           | Liveness check                                                                                                                                                                                                                                                 |
| `GET /vapid-key`        | None           | Returns `{ publicKey }`, the API's VAPID public key. 500 if not configured.                                                                                                                                                                                    |
| `POST /call`            | None           | Validate `{ tableCode }` against synced table data, then fan out a call notification over Web Push (every stored subscription) and FCM (the `game-masters` topic) concurrently. 400 malformed, 404 unknown/inactive, 200 on a valid call (sends run concurrently across and within both channels; a dead device or a down channel doesn't delay or fail the others). |
| `POST /subscriptions`   | Staff passcode | Upsert `{ subscription, passcode }` (a `PushSubscription`), keyed by endpoint — idempotent. 400 malformed, 401 bad passcode, 200 stored.                                                                                                                       |
| `DELETE /subscriptions` | Staff passcode | Remove `{ endpoint, passcode }`. Idempotent (200 even if the endpoint was never stored). 400 malformed, 401 bad passcode.                                                                                                                                      |

## Configuration

See [`.env.example`](.env.example). Table data has no runtime config at
all — `tables.json` is imported straight from `@game-master-bell/shared`
at build time (`src/app.ts`), so a table edit reaches production by
triggering this package's deploy workflow (`paths:` filter on
`packages/shared/**`), not by restarting the process. `SUBSCRIPTIONS_DB_PATH`,
`CORS_ORIGINS`, `STAFF_PASSCODE`, `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/
`VAPID_SUBJECT` are unchanged from the standalone repo.

`FCM_SERVICE_ACCOUNT_PATH` (path to a Firebase service-account JSON) and
`FCM_TOPIC` (defaults to `game-masters`) configure the FCM sender module
added in PRD-v3 phase 4 (`src/fcm/`) — see
[docs/RUNBOOK.md](docs/RUNBOOK.md#creating-the-firebase-project--service-account)
for how to create the Firebase project and service account.

The API refuses to start if `STAFF_PASSCODE`/`VAPID_PUBLIC_KEY`/
`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`/`FCM_SERVICE_ACCOUNT_PATH` are unset, or
if the FCM service-account file is missing/malformed (FR-A9).

## Deploying

See [docs/DEPLOY.md](docs/DEPLOY.md) for running the API on the VPS via
Docker Compose behind a TLS-terminating reverse proxy, or
[docs/DEPLOY_NATIVE.md](docs/DEPLOY_NATIVE.md) for running it directly
under systemd on a lightweight VPS where Docker isn't worth the overhead.
`.github/workflows/deploy-api.yml` (repo root) automates the native path on
every push to `main` that touches `apps/api/**` or `packages/shared/**`.

## Operations

See [docs/RUNBOOK.md](docs/RUNBOOK.md) for the Firebase project
decommission checklist (historical, kept for reference), wiring up uptime
monitoring for `GET /healthz`, and the staff passcode rotation procedure.
