# Links

## Live

- [**Bell app**](https://gatherloop.github.io/game-master-bell/) — the customer-facing app; open a table's QR to try it end to end (or the root URL to see the fallback).
- **This docs site** — `https://gatherloop.github.io/game-master-bell/docs/`

## Source

- [**Repository**](https://github.com/gatherloop/game-master-bell) — `gatherloop/game-master-bell`, the single monorepo for the bell app, call API, Android receiver, shared package, and this docs site.
- [`apps/api/src/app.ts`](https://github.com/gatherloop/game-master-bell/blob/main/apps/api/src/app.ts) — the call API's two routes.
- [`apps/receiver-android`](https://github.com/gatherloop/game-master-bell/tree/main/apps/receiver-android) — the native Android receiver.
- [`packages/shared/src/tables.json`](https://github.com/gatherloop/game-master-bell/blob/main/packages/shared/src/tables.json) — the table data both apps build against.

## PRDs and runbooks (internal source of record)

This site paraphrases these for an outside reader; they remain the
detailed, authoritative spec and operational reference — see
[Content ↔ source mapping in the docs PRD](https://github.com/gatherloop/game-master-bell/blob/main/docs/PRD-docs-site.md#2-audiences--information-architecture).

- [`docs/PRD-v3.md`](https://github.com/gatherloop/game-master-bell/blob/main/docs/PRD-v3.md) — current product/architecture spec (native receiver, self-hosted API, geofence).
- [`docs/PRD-v2.md`](https://github.com/gatherloop/game-master-bell/blob/main/docs/PRD-v2.md) — superseded v2 spec (self-hosted API, Web Push PWA), kept for history.
- [`docs/PRD.md`](https://github.com/gatherloop/game-master-bell/blob/main/docs/PRD.md) — superseded v1 spec, kept for history.
- [`docs/PRD-docs-site.md`](https://github.com/gatherloop/game-master-bell/blob/main/docs/PRD-docs-site.md) — the plan for this docs site.
- [`docs/RUNBOOK.md`](https://github.com/gatherloop/game-master-bell/blob/main/docs/RUNBOOK.md) — deploy and operational instructions for the whole repo.
- [`apps/api/docs/RUNBOOK.md`](https://github.com/gatherloop/game-master-bell/blob/main/apps/api/docs/RUNBOOK.md) — call API–specific ops (Firebase project setup, VPS deploy, troubleshooting).
- [`apps/receiver-android/docs/RUNBOOK.md`](https://github.com/gatherloop/game-master-bell/blob/main/apps/receiver-android/docs/RUNBOOK.md) — release keystore setup, cutting a signed APK, staff-phone install.

## On this site

- [Getting Started](/engineering/getting-started) — clone, install, run, build, test, deploy.
- [Repository Map](/reference/repository-map) — the monorepo layout.
- [Architecture](/engineering/architecture) — the call path and the three deployables.
