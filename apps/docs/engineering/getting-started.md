# Getting Started

Copy-pasteable steps to clone the monorepo and run, build, and test every
app in it. See [Architecture](/engineering/architecture) for how the pieces
fit together and [Repository Map](/reference/repository-map) for where
everything lives.

## Prerequisites

- **Node.js 22** — pinned in [`.nvmrc`](https://github.com/gatherloop/game-master-bell/blob/main/.nvmrc); use `nvm use` or any Node version manager.
- **pnpm 10** — pinned via `packageManager` in `package.json`; enable it with `corepack enable` (bundled with Node 22) or install pnpm directly.
- **JDK 17 + Android SDK** — only needed for `apps/receiver-android`; Android Studio installs both.

## Clone and install

```sh
git clone https://github.com/gatherloop/game-master-bell.git
cd game-master-bell
pnpm install
```

This is a single pnpm workspace (`pnpm-workspace.yaml`: `apps/*` and
`packages/*`), so one install wires up every JS/TS package — `bell-web`,
`api`, `docs`, and `shared` — and their cross-package dependency
(`@game-master-bell/shared`) via a workspace link. `apps/receiver-android`
is a standard Gradle project and isn't part of this install; see
[Receiver Android app](#receiver-android-app-apps-receiver-android) below.

## Bell web app (`apps/bell-web`)

The customer-facing bell. Copy `apps/bell-web/.env.example` to `.env.local`
if you want to point at a non-default call API or try the geofence locally
— the committed `.env.development` already has a working local default.

```sh
pnpm --filter @game-master-bell/bell-web dev       # http://localhost:5173
pnpm --filter @game-master-bell/bell-web build      # → apps/bell-web/dist/
pnpm --filter @game-master-bell/bell-web preview    # serve the production build locally
```

`build` runs `packages/shared`'s build first (`prebuild`), then `vite
build`, then `scripts/generate-table-pages.mjs`, which emits one static
`t/{tableCode}/index.html` per active table from `tables.json` plus a
`404.html`.

## Call API (`apps/api`)

Copy `apps/api/.env.example` to `.env` and set `FCM_SERVICE_ACCOUNT_PATH`
to a Firebase service-account JSON if you want real FCM sends locally —
see [`apps/api/docs/RUNBOOK.md`](https://github.com/gatherloop/game-master-bell/blob/main/apps/api/docs/RUNBOOK.md)
for how to obtain one. Without it the API still starts and serves
`/healthz`, but `/call` requests fail.

```sh
pnpm --filter @game-master-bell/api dev     # tsx watch, http://localhost:3000
pnpm --filter @game-master-bell/api build   # → apps/api/dist/
pnpm --filter @game-master-bell/api test    # vitest run
```

## Docs site (`apps/docs`, this site)

```sh
pnpm --filter @game-master-bell/docs dev       # http://localhost:5173
pnpm --filter @game-master-bell/docs build     # → apps/docs/.vitepress/dist/
pnpm --filter @game-master-bell/docs preview   # serve the production build locally
```

## Receiver Android app (`apps/receiver-android`)

Not a pnpm workspace package — build it with Gradle from its own
directory. The committed `app/google-services.json` is a placeholder that's
enough to compile, but a device using it won't receive real pushes until
it's swapped for the real Firebase project's file (see
[`apps/receiver-android/README.md`](https://github.com/gatherloop/game-master-bell/blob/main/apps/receiver-android/README.md#firebase-setup)).

```sh
cd apps/receiver-android
./gradlew assembleDebug   # → app/build/outputs/apk/debug/app-debug.apk
./gradlew lint            # Android lint, same check CI runs
```

Install the debug APK and subscribe to the `game-masters` topic to see the
status screen and receive a test notification with the custom bell sound.

## Workspace-wide commands

Run from the repo root — they cover every JS/TS package (not
`receiver-android`):

| Command | What it does |
|---|---|
| `pnpm build` | Builds every package (`pnpm -r build`). |
| `pnpm test` | Runs tests in every package that has a `test` script (currently `apps/api`). |
| `pnpm lint` / `pnpm lint:fix` | ESLint across the whole repo. |
| `pnpm format` / `pnpm format:check` | Prettier across the whole repo. |
| `pnpm typecheck` | `tsc --build` across the TypeScript project graph. |
| `pnpm generate-qr` | Generates one QR PNG per active table plus a `print-sheet.html` into `qr-codes/` (gitignored) — see [Repository Map](/reference/repository-map). |

## Where deploys go

| App | Deploy target | Trigger |
|---|---|---|
| `bell-web` + `docs` | GitHub Pages, one unified artifact (`bell-web` at the root, `docs` under `/docs/`) | `.github/workflows/deploy-pages.yml`, on push to `main` touching either app, `packages/shared`, or the workflow itself |
| `api` | Plain Node process on the cafe's VPS over SSH (no Docker, no PaaS) | `.github/workflows/deploy-api.yml`, on push to `main` touching `apps/api` or `packages/shared` |
| `receiver-android` | Signed APK attached to a GitHub Release, sideloaded onto staff phones | `.github/workflows/android-release.yml`, on pushing a `receiver-android-v*` tag |

Full operational detail — secrets to configure, verifying a deploy,
cutting an Android release, troubleshooting — lives in
[`docs/RUNBOOK.md`](https://github.com/gatherloop/game-master-bell/blob/main/docs/RUNBOOK.md)
and, for the API and Android app specifically,
[`apps/api/docs/RUNBOOK.md`](https://github.com/gatherloop/game-master-bell/blob/main/apps/api/docs/RUNBOOK.md)
and [`apps/receiver-android/docs/RUNBOOK.md`](https://github.com/gatherloop/game-master-bell/blob/main/apps/receiver-android/docs/RUNBOOK.md).
