# Repository Map

`gatherloop/game-master-bell` is a single pnpm workspace holding three
deployables, one shared package, and the docs you're reading. See
[Getting Started](/engineering/getting-started) for how to run each piece
and [Architecture](/engineering/architecture) for how they talk to each
other.

```
game-master-bell/
├── apps/
│   ├── bell-web/              # Customer bell — React + PixiJS + Vite, GitHub Pages
│   │   ├── src/                   # App code (table lookup, bell scene, geofence)
│   │   ├── scripts/               # generate-table-pages.mjs (static per-table pages)
│   │   └── public/                # Icons, manifest
│   │
│   ├── api/                   # Call API — Fastify + TypeScript, cafe VPS
│   │   ├── src/                   # Routes (/healthz, /call), FCM sender
│   │   ├── scripts/               # send-test-fcm.ts
│   │   ├── deploy/                # systemd unit
│   │   └── docs/                  # DEPLOY.md, DEPLOY_NATIVE.md, RUNBOOK.md
│   │
│   ├── receiver-android/      # Staff receiver — Kotlin + Compose + FCM (not a pnpm package)
│   │   ├── app/src/                # Notification handling, Room recent-calls store, status screen
│   │   ├── gradle/libs.versions.toml  # Centrally pinned dependency versions
│   │   └── docs/RUNBOOK.md         # Keystore setup, cutting a release, staff install steps
│   │
│   └── docs/                  # This site — VitePress, GitHub Pages under /docs/
│       └── .vitepress/config.mts   # Sidebar, nav, Mermaid, local search
│
├── packages/
│   └── shared/                # tables.json + generated types + Zod schema
│       ├── src/tables.json        # Single source of truth: table code → floor/number/active
│       └── scripts/validate-tables.mjs
│
├── scripts/
│   └── generate-qr.ts         # Renders one QR PNG per active table + a print sheet
│
├── docs/                      # PRDs and the operational runbook (source of record)
│   ├── PRD.md                     # v1 — superseded, kept for history
│   ├── PRD-v2.md                  # v2 — superseded, kept for history
│   ├── PRD-v3.md                  # Current product/architecture spec
│   ├── PRD-docs-site.md           # The plan for this docs site
│   └── RUNBOOK.md                 # Deploy and operational instructions
│
├── .github/workflows/
│   ├── deploy-pages.yml       # Builds + deploys bell-web and docs as one Pages artifact
│   ├── deploy-api.yml         # Builds + deploys the call API to the VPS over SSH
│   ├── android-ci.yml         # Lint + assembleDebug on every push/PR touching receiver-android
│   └── android-release.yml    # Signed APK → GitHub Release, on a receiver-android-v* tag
│
├── pnpm-workspace.yaml        # Workspace globs: apps/*, packages/*
├── package.json                # Root scripts (build, lint, test, typecheck, generate-qr)
└── README.md
```

## What lives where

| Path | Owns | Talks to |
|---|---|---|
| `apps/bell-web` | The QR-per-table bell UI a customer taps | `apps/api` (`POST /call`), `packages/shared` (table data, build time) |
| `apps/api` | Validating a call and fanning it out via FCM | `packages/shared` (table data, build time), Firebase Cloud Messaging |
| `apps/receiver-android` | The staff-phone notification + recent-calls list | Firebase Cloud Messaging only (never calls the API directly) |
| `apps/docs` | This site | Nothing at runtime — it documents the other three |
| `packages/shared` | `tables.json`, the one source of truth for table data | Imported at build time by `bell-web` and `api`; no runtime coupling |
| `docs/` (repo root) | The internal PRDs and runbook this site paraphrases | — |

Note the two `docs/` directories are different things: repo-root `docs/`
holds the markdown PRDs and runbook (internal source of record); `apps/docs`
is the VitePress app that publishes *this* site.

## Why one monorepo

`apps/api` and `apps/receiver-android` both started as standalone repos
(`game-master-bell-api`, `game-master-bell-receiver`) and were folded in
here during PRD-v3. See
[Engineering Decisions](/engineering/engineering-decisions) for why that
consolidation happened.
