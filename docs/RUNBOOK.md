# Runbook — Deploys & Operations

Operational reference for shipping changes and running day-to-day tasks for
Game Master Bell. See `docs/PRD-v2.md` for the current architecture (`docs/PRD.md`
is the superseded v1 spec, kept for history).

As of PRD v2 phase B2, the production call path is the self-hosted **call
API** (`gatherloop/game-master-bell-api`, deployed to our VPS). As of phase
B3, the old Firebase notify function and native Android receiver have been
removed from this repo entirely — this repo is now bell-app-only. The
receiver PWA lives in `gatherloop/game-master-bell-receiver` and the call API
in `gatherloop/game-master-bell-api`; see those repos' runbooks for their
deploy/ops instructions.

---

## Prerequisites

- Node.js 22 (`.nvmrc` pins the version) and pnpm 10 (`packageManager` in
  `package.json` — run via `corepack enable` or install pnpm directly).
- `pnpm install` at the repo root before running anything.

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

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Bell tap shows "Panggilan gagal, coba lagi" | `VITE_CALL_API_URL` misconfigured/unreachable, or CORS origin mismatch (FR-A4) — check the browser console and the call API's logs (`gatherloop/game-master-bell-api`). |
| Table page 404s for a real table | `tables.json` entry missing/inactive, or the web app wasn't rebuilt after a `tables.json` change (static pages are generated at build time, not runtime). |
| No push received on a game master phone | See the receiver PWA's runbook (`gatherloop/game-master-bell-receiver`) for subscription state, passcode, and VAPID key troubleshooting. |
| QR sticker leads to the 404 page | Table code was deactivated or renamed in `tables.json` without reprinting — regenerate with `pnpm generate-qr` and reprint that table's sticker. |
