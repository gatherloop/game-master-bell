# Runbook — Deploys & Operations

Operational reference for shipping changes and running day-to-day tasks for
Game Master Bell. See `docs/PRD-v2.md` for the current architecture (`docs/PRD.md`
is the superseded v1 spec, kept for history).

As of PRD v2 phase B2, the production call path is the self-hosted **call
API** (`gatherloop/game-master-bell-api`, deployed to our VPS), not the
Firebase notify function. The Firebase path (`functions/`, this repo) is kept
idle as a rollback option until PRD v2 phase B3 removes it — see "Rollback"
below.

---

## Prerequisites

- Node.js 22 (`.nvmrc` pins the version) and pnpm 10 (`packageManager` in
  `package.json` — run via `corepack enable` or install pnpm directly).
- `pnpm install` at the repo root before running anything.
- Only needed for the idle Firebase rollback path: a Firebase project on the
  **Blaze plan** with the Firebase CLI logged in: `pnpm exec firebase login`.

---

## Deploying the Bell web app (`apps/bell-web`)

**Current state: manual deploy.** A GitHub Actions workflow that auto-deploys
`apps/bell-web` to GitHub Pages on merge to `main` is planned (PRD phase 3)
but hasn't been added to this repo yet — `.github/workflows/` is empty. Until
that lands, publish a build by hand:

1. Set `VITE_CALL_API_URL` to the deployed call API's `/call` endpoint (e.g.
   `https://bell-api.gatherloop.id/call`) for the production build (copy
   `apps/bell-web/.env.example` to `apps/bell-web/.env.local` and fill it in,
   or export it in the shell).
2. Build and generate the per-table static pages:
   ```sh
   pnpm --filter @game-master-bell/bell-web build
   ```
   This runs `vite build` followed by
   `scripts/generate-table-pages.mjs`, producing `apps/bell-web/dist/`
   with one `t/<code>/index.html` per active table plus `404.html`
   (see PRD §"GitHub Pages routing note").
3. Publish `apps/bell-web/dist/` to the `gh-pages` branch (or whatever branch
   the repo's GitHub Pages source is configured to serve), e.g. with
   [`gh-pages`](https://www.npmjs.com/package/gh-pages) or by pushing the
   built output directly to that branch. Confirm in the repo's **Settings →
   Pages** that the source matches.
4. Verify the deploy by opening `https://gatherloop.github.io/game-master-bell/t/<code>/`
   for a known-active table code, and confirm an unknown code shows the
   styled 404 page.

**Follow-up:** replacing this manual step with the GitHub Actions workflow
from PRD phase 3 is the natural next piece of work — track it as its own PR
rather than folding it into an unrelated change. When that workflow exists,
`VITE_CALL_API_URL` should be set as a repository/environment variable the
workflow passes into the build, per PRD v2 phase B2.

---

## Rollback: reverting to the Firebase notify function (`functions/`)

Until PRD v2 phase B3 deletes `functions/`, falling back to the v1 Firebase
path is a one-variable change (PRD v2 §7 "Rollback"): point
`VITE_CALL_API_URL` back at the deployed Cloud Function's URL and redeploy
Pages (step 1 of the previous section). Staff keep the Android app installed
as a fallback receiver until the new receiver PWA is verified on every staff
device.

To (re)deploy the Firebase notify function itself:

1. Select the target Firebase project (first time only):
   ```sh
   pnpm exec firebase use --add
   ```
2. Build and deploy:
   ```sh
   pnpm --filter @game-master-bell/functions build
   pnpm exec firebase deploy --only functions
   ```
3. Sanity-check with a real call:
   ```sh
   curl -i -X POST "<deployed-url>" \
     -H "Content-Type: application/json" \
     -d '{"tableCode":"2-05"}'
   ```
   Expect `200 OK`; an unknown code should 404 (FR-F1).
4. Check logs for the call (FR-F3):
   ```sh
   pnpm exec firebase functions:log
   ```
   or via the Cloud Console → Cloud Functions → Logs.

Before deploying, it's worth running the emulator-backed test suite locally:

```sh
pnpm --filter @game-master-bell/functions test:emulator
```

---

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

## Android app distribution (`apps/receiver-android`)

As of PRD v2 phase B2, the receiver PWA (`gatherloop/game-master-bell-receiver`)
is the primary receiver on staff devices; this Android app is kept installed
only as a fallback for the Firebase rollback path above until PRD v2 phase B3
removes it from this repo.

Staff devices are a handful, so v1 ships as a **sideloaded APK** rather than
a Play Store listing (PRD open question #4):

1. Configure `app/google-services.json` with the real Firebase project (see
   `apps/receiver-android/README.md`).
2. Build an APK:
   ```sh
   cd apps/receiver-android
   ./gradlew assembleDebug
   ```
   The `release` build type has no signing config yet, so `assembleRelease`
   produces an unsigned APK that Android won't install — sideloading uses
   the auto-signed debug build for now. Add a proper release signing config
   before distributing outside the cafe's own staff devices.
3. Distribute `app/build/outputs/apk/debug/app-debug.apk` to game master
   phones directly (AirDrop-equivalent, USB, or an internal file share) and
   install with "unknown sources" allowed for the install source.
4. On first launch, grant the notification permission prompt and confirm the
   status screen shows the device subscribed to the `game-masters` topic
   (FR-D1).

Revisit the Play Store internal track if staff turnover or device count make
manual sideloading painful.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Bell tap shows "Panggilan gagal, coba lagi" | `VITE_CALL_API_URL` misconfigured/unreachable, or CORS origin mismatch (FR-A4) — check the browser console and the call API's logs (or `firebase functions:log` if running against the Firebase rollback path). |
| Table page 404s for a real table | `tables.json` entry missing/inactive, or the web app wasn't rebuilt after a `tables.json` change (static pages are generated at build time, not runtime). |
| No push received on a game master phone | For the primary receiver PWA, see that repo's runbook (subscription state, passcode, VAPID key). For the Android fallback: device not subscribed to the `game-masters` topic, notification permission not granted, or `google-services.json` still the placeholder — see `apps/receiver-android/README.md`. |
| QR sticker leads to the 404 page | Table code was deactivated or renamed in `tables.json` without reprinting — regenerate with `pnpm generate-qr` and reprint that table's sticker. |
