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
(`tables.json` + types, imported by both apps), and `apps/receiver-android`
(native Android receiver, Kotlin + Compose + FCM — resurrected from this
repo's own v1 history per PRD-v3 phase 6, with a custom bell sound per
phase 7 and signed APK releases per phase 8; see
[apps/receiver-android/docs/RUNBOOK.md](apps/receiver-android/docs/RUNBOOK.md)
for cutting a release and installing it on a staff phone).

**PRD-v3 is complete.** All ten phases have landed: every staff phone runs
the native receiver, the API's Web Push path was removed in phase 9, and
the standalone `gatherloop/game-master-bell-api` and
`gatherloop/game-master-bell-receiver` repos are archived (read-only,
history preserved) — this monorepo is the only active repo. See
[docs/RUNBOOK.md](docs/RUNBOOK.md#decommissioning-the-old-repos) for the
decommission notes.
