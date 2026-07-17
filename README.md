# game-master-bell
App for calling game master while on coffee shop

See `docs/PRD-v3.md` for the current product/architecture spec — native
Android receiver with a custom bell sound, pushed via FCM from the
self-hosted call API (`docs/PRD-v2.md` and `docs/PRD.md` are the superseded
v2/v1 specs, kept for history) — and `docs/RUNBOOK.md` for deploy and
operational instructions (web app, call API, QR code printing).

Monorepo layout: `apps/bell-web` (customer bell, GitHub Pages),
`apps/api` (call API, deployed to our VPS — moved in from the standalone
`game-master-bell-api` repo per PRD-v3 phase 2), `packages/shared`
(`tables.json` + types, imported by both apps). `apps/receiver-android`
(native Android receiver) lands in a later PRD-v3 phase.
