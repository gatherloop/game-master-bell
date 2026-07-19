# @game-master-bell/api

Self-hosted call API for [Game Master Bell](https://github.com/gatherloop/game-master-bell),
per [PRD-v3](../../docs/PRD-v3.md). Validates bell calls from the bell web
app and fans them out as Web Push notifications to game master devices, with
no Google/Firebase dependency.

Moved here from the standalone `game-master-bell-api` repo (PRD-v3 phase 2)
as an unchanged workspace package. As of PRD-v3 phase 3, table codes are
validated against `tables.json` imported directly from `packages/shared` at
build time — see [PRD-v3 §3.2](../../docs/PRD-v3.md#32-call-api-appsapi-moved-into-this-repo)
for the plan to add FCM sending (phase 4) so `/call` fans out to both Web
Push and FCM devices during the receiver migration.

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

## Endpoints

| Endpoint                | Auth           | Purpose                                                                                                                                                                                                                                                        |
| ------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /healthz`          | None           | Liveness check                                                                                                                                                                                                                                                 |
| `GET /vapid-key`        | None           | Returns `{ publicKey }`, the API's VAPID public key. 500 if not configured.                                                                                                                                                                                    |
| `POST /call`            | None           | Validate `{ tableCode }` against synced table data, then fan out a Web Push notification to every stored subscription. 400 malformed, 404 unknown/inactive, 200 on a valid call (push sends run concurrently; a dead device doesn't delay or fail the others). |
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

The API refuses to start if `STAFF_PASSCODE`/`VAPID_PUBLIC_KEY`/
`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` are unset.

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
