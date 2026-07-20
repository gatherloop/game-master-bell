# Runbook — Deploys & Operations

Operational reference for shipping changes and running day-to-day tasks for
Game Master Bell. See `docs/PRD-v3.md` for the current architecture
(`docs/PRD-v2.md` and `docs/PRD.md` are the superseded v2/v1 specs, kept for
history).

As of PRD-v3 phase 2, the production call path is the self-hosted **call
API** at `apps/api` in this repo, moved in from the standalone
`gatherloop/game-master-bell-api` repo (see [apps/api/README.md](../apps/api/README.md),
[apps/api/docs/DEPLOY.md](../apps/api/docs/DEPLOY.md)/[DEPLOY_NATIVE.md](../apps/api/docs/DEPLOY_NATIVE.md)
for deploy instructions, and [apps/api/docs/RUNBOOK.md](../apps/api/docs/RUNBOOK.md)
for API-specific ops). The old `game-master-bell-api` repo's deploy workflow
is kept active as a rollback path until the monorepo-triggered deploy is
verified on the VPS, per PRD-v3's migration plan.

The receiver PWA still lives in `gatherloop/game-master-bell-receiver` and
keeps receiving Web Push from its own repo/deploy until every staff phone
runs the native Android receiver; see that repo's runbook for its deploy/ops
instructions until the staff migration (PRD-v3 §7) completes.

As of PRD-v3 phase 6, the native Android receiver lives at
`apps/receiver-android` in this repo (see
[apps/receiver-android/README.md](../apps/receiver-android/README.md)),
restored from this repo's own v1 history; it's built and linted in CI
(`.github/workflows/android-ci.yml`, `./gradlew lint assembleDebug`) on
every push/PR touching `apps/receiver-android/**`. Phase 7 added the custom
bell sound (`table_calls_v2` notification channel). Phase 8 added a
signed-release workflow (`.github/workflows/android-release.yml`, triggered
by pushing a `receiver-android-v*` tag) that publishes an installable APK
to GitHub Releases, and the staff-phone install runbook — see
[apps/receiver-android/docs/RUNBOOK.md](../apps/receiver-android/docs/RUNBOOK.md)
for the keystore setup, cutting a release, sideload steps, and the
battery-optimization/OEM-autostart checklist. The app is not yet
distributed to staff phones — that's the still-pending staff migration
(PRD-v3 §7's unnumbered row), which phase 8 makes possible but doesn't
itself perform.

---

## Prerequisites

- Node.js 22 (`.nvmrc` pins the version) and pnpm 10 (`packageManager` in
  `package.json` — run via `corepack enable` or install pnpm directly).
- `pnpm install` at the repo root before running anything.

---

## Deploying the Bell web app (`apps/bell-web`)

**Current state: automated deploy via GitHub Actions.**
`.github/workflows/deploy-bell-web.yml` builds and publishes `apps/bell-web`
to GitHub Pages on every push to `main` that touches `apps/bell-web/`,
`packages/shared/`, `pnpm-lock.yaml`, or the workflow file itself (also
runnable manually via `workflow_dispatch`).

One-time setup (repo admin):

1. **Settings → Pages → Source**: set to **GitHub Actions**.
2. **Settings → Secrets and variables → Actions → New repository secret**:
   add `VITE_CALL_API_URL` set to the deployed call API's `/call` endpoint
   (e.g. `https://bell-api.gatherloop.id/call`). The workflow injects it as
   a build-time env var (`vite build` bakes `VITE_*` vars into the static
   bundle, so it must be supplied at build time, not runtime).

What the workflow does on each run:

1. Installs deps with pnpm (Node version pinned via `.nvmrc`).
2. Runs `pnpm --filter @game-master-bell/bell-web build` (builds
   `packages/shared` first via the `prebuild` script, then `vite build`,
   then `scripts/generate-table-pages.mjs`), producing `apps/bell-web/dist/`
   with one `t/<code>/index.html` per active table plus `404.html` (see PRD
   §"GitHub Pages routing note").
3. Uploads `apps/bell-web/dist/` as a Pages artifact and deploys it with
   `actions/deploy-pages`.

To deploy by hand instead (e.g. for a one-off out-of-band build), set
`VITE_CALL_API_URL` locally (copy `apps/bell-web/.env.example` to
`.env.local` and fill it in, or export it in the shell), run
`pnpm --filter @game-master-bell/bell-web build`, and publish the resulting
`apps/bell-web/dist/` however the repo's configured Pages source expects.

Verify a deploy by opening
`https://gatherloop.github.io/game-master-bell/t/<code>/` for a known-active
table code, and confirm an unknown code shows the styled 404 page.

---

## Editing table data (`packages/shared/src/tables.json`)

As of PRD-v3 phase 3, both `apps/bell-web` and `apps/api` import
`tables.json` directly from `packages/shared` at build time — there is no
runtime sync or cache on the API side anymore. A merged edit to
`packages/shared/src/tables.json` triggers **both** deploy workflows
(`deploy-bell-web.yml` and `deploy-api.yml` each filter on
`packages/shared/**`), so a table add/rename/(de)activate reaches
production in one PR, atomically, once both workflows finish — no waiting
on an hourly refresh.

## Generating and printing table QR codes

Each table's QR code just encodes the URL of its generated page
(`https://gatherloop.github.io/game-master-bell/t/<code>/`, per FR-W1).
Regenerate them any time `packages/shared/src/tables.json` changes (a table
is added, renamed, or (de)activated):

```sh
pnpm generate-qr
```

This writes one PNG per **active** table plus a `print-sheet.html` into
`qr-codes/` (gitignored — it's generated output, not source data). Open
`qr-codes/print-sheet.html` in a browser and print it, or print the
individual PNGs, then cut and stick them to the matching physical table.

To generate codes pointing at a non-production build (e.g. a local preview),
override the base URL:

```sh
QR_BASE_URL=http://localhost:4173 pnpm generate-qr
```

Because table codes are stable identifiers (PRD §2 edge cases), renaming a
table's `displayName` or `floor` in `tables.json` does **not** require
reprinting its QR sticker — only re-running `generate-qr` when a table's
`code` itself changes, or when a new table is added.

---

## Building the Android receiver app (`apps/receiver-android`)

A standard Gradle project (not a pnpm workspace package — it has no
`package.json`), living alongside the workspace as in v1. Requires JDK 17
and Android SDK/build tools (Android Studio installs both).

```sh
cd apps/receiver-android
./gradlew assembleDebug   # builds app/build/outputs/apk/debug/app-debug.apk
./gradlew lint            # Android lint, same check CI runs
```

`.github/workflows/android-ci.yml` runs both on every push/PR touching
`apps/receiver-android/**`. The committed `app/google-services.json` is a
placeholder (see [apps/receiver-android/README.md](../apps/receiver-android/README.md#firebase-setup))
— enough to build, but a device using it won't receive real pushes until
it's swapped for the real project's file.

As of phase 7 the app plays the custom bell sound on the `table_calls_v2`
channel (see [apps/receiver-android/README.md](../apps/receiver-android/README.md#custom-bell-sound)).
The debug APK above is enough for local testing (install it and subscribe
to the `game-masters` topic to see the status screen and receive a
bell-sound test notification), but staff phones should run a **signed
release** build instead — see
[apps/receiver-android/docs/RUNBOOK.md](../apps/receiver-android/docs/RUNBOOK.md)
for cutting one via `.github/workflows/android-release.yml` and installing
it.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Bell tap shows "Panggilan gagal, coba lagi" | `VITE_CALL_API_URL` misconfigured/unreachable, or CORS origin mismatch (FR-A4) — check the browser console and the call API's logs (`apps/api`, see [apps/api/docs/DEPLOY_NATIVE.md](../apps/api/docs/DEPLOY_NATIVE.md) for `journalctl` commands). |
| Table page 404s for a real table | `tables.json` entry missing/inactive, or the web app wasn't rebuilt after a `tables.json` change (static pages are generated at build time, not runtime). |
| No push received on a game master phone | Check the Android app's status screen for notification-permission/topic-subscription state (`apps/receiver-android`); for phones still on the old PWA, see its runbook (`gatherloop/game-master-bell-receiver`) for subscription state, passcode, and VAPID key troubleshooting. |
| QR sticker leads to the 404 page | Table code was deactivated or renamed in `tables.json` without reprinting — regenerate with `pnpm generate-qr` and reprint that table's sticker. |
