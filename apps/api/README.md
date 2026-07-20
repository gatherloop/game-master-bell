# @game-master-bell/api

Self-hosted call API for [Game Master Bell](https://github.com/gatherloop/game-master-bell),
per [PRD-v3](../../docs/PRD-v3.md). Validates bell calls from the bell web
app and fans them out as FCM notifications to game master devices running
the native Android receiver.

Moved here from the standalone `game-master-bell-api` repo (PRD-v3 phase 2)
as an unchanged workspace package. As of PRD-v3 phase 3, table codes are
validated against `tables.json` imported directly from `packages/shared` at
build time. As of PRD-v3 phase 4, an FCM sender module (`src/fcm/`) can send
a data-only, high-priority topic message via `firebase-admin`. Phases 5–8
added FCM to `/call` alongside Web Push, resurrected the native Android
receiver, and shipped it to staff phones with a custom bell sound. As of
PRD-v3 phase 9, every staff phone runs the native app, so the Web Push path
(the `subscriptions` store, `GET /vapid-key`, the staff passcode) is
removed — `POST /call` sends FCM only, and the API keeps **no persistent
state at all**.

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
| `fcm:send-test`        | Send one test FCM call message to `FCM_TOPIC` (manual smoke test, not part of `/call`) |

## Endpoints

| Endpoint       | Auth | Purpose                                                                                                                                                                    |
| -------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /healthz` | None | Liveness check                                                                                                                                                              |
| `POST /call`   | None | Validate `{ tableCode }` against compiled-in table data, then send a data-only, high-priority FCM message to the `game-masters` topic. 400 malformed, 404 unknown/inactive, 200 on a valid call. |

## Configuration

See [`.env.example`](.env.example). Table data has no runtime config at
all — `tables.json` is imported straight from `@game-master-bell/shared`
at build time (`src/app.ts`), so a table edit reaches production by
triggering this package's deploy workflow (`paths:` filter on
`packages/shared/**`), not by restarting the process.

`FCM_SERVICE_ACCOUNT_PATH` (path to a Firebase service-account JSON) and
`FCM_TOPIC` (defaults to `game-masters`) configure the FCM sender module
added in PRD-v3 phase 4 (`src/fcm/`) — see
[docs/RUNBOOK.md](docs/RUNBOOK.md#creating-the-firebase-project--service-account)
for how to create the Firebase project and service account.

The API refuses to start if `FCM_SERVICE_ACCOUNT_PATH` is unset, or if the
FCM service-account file is missing/malformed (FR-A9).

As of PRD-v3 phase 9, the API keeps no persistent state — the `subscriptions`
SQLite store, `STAFF_PASSCODE`, and the `VAPID_*` key pair are gone along
with the Web Push path. FCM topic fan-out needs no server-side receiver
registration (§3.2 "Who can receive calls?").

## Deploying

See [docs/DEPLOY.md](docs/DEPLOY.md) for running the API on the VPS via
Docker Compose behind a TLS-terminating reverse proxy, or
[docs/DEPLOY_NATIVE.md](docs/DEPLOY_NATIVE.md) for running it directly
under systemd on a lightweight VPS where Docker isn't worth the overhead.
`.github/workflows/deploy-api.yml` (repo root) automates the native path on
every push to `main` that touches `apps/api/**` or `packages/shared/**`.

## Operations

See [docs/RUNBOOK.md](docs/RUNBOOK.md) for creating the Firebase project +
service account, the (historical) v1 Firebase project decommission
checklist, and wiring up uptime monitoring for `GET /healthz`.
