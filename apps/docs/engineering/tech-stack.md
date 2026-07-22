# Tech Stack

Four components, each with the smallest stack that does the job — no
framework is shared just for the sake of sharing it, but the JS/TS side sits
in one pnpm workspace so tooling (lint, format, typecheck, CI) is consistent
across it. See [Architecture](/engineering/architecture) for how the pieces
fit together, and [Engineering Decisions](/engineering/engineering-decisions)
for the reasoning behind the biggest choices.

## Bell web app (`apps/bell-web`)

| Concern | Choice | Rationale |
|---|---|---|
| Language / UI | **React 19 + TypeScript** | Required by the product brief; a small, well-known stack for a one-screen app. |
| Bell rendering | **PixiJS 8** | Canvas-based animation (idle sway, tap ring/shake) that plain CSS/DOM can't do smoothly. |
| Build tool | **Vite 8** | Fast dev server, first-class React/TS support, static output that GitHub Pages can serve directly. |
| Table data | **`@game-master-bell/shared`** (`tables.json` + Zod schema), imported at build time | Same source of truth the API validates against — see [Repository Map](/reference/repository-map). |
| Routing | Static per-table pages generated at build time from `tables.json` (`scripts/generate-table-pages.mjs`) | GitHub Pages only serves static files; per-table `t/{code}/index.html` avoids SPA-router 404 hacks. |
| Geolocation | Browser **Geolocation API** directly, no library | The advisory geofence needs one `getCurrentPosition` call and a haversine formula — not worth a dependency. |
| Hosting | **GitHub Pages**, unified artifact with this docs site | Free; see [Architecture → Deployment](/engineering/architecture#deployment). |

## Call API (`apps/api`)

| Concern | Choice | Rationale |
|---|---|---|
| Runtime | **Node.js 22 + TypeScript** | Same language and workspace as the rest of the monorepo. |
| HTTP framework | **Fastify 5** | Lightweight, fast, schema-friendly; the API is two routes (`GET /healthz`, `POST /call`). |
| Validation | **Zod 4** | Parses/validates the `POST /call` body and the shared `tables.json` schema with the same library. |
| Push | **firebase-admin 14** (Messaging only) | Official server SDK for FCM; one dependency, one `send()` call to the `game-masters` topic. Hand-rolling FCM's HTTP v1 auth was considered and rejected — see [Engineering Decisions](/engineering/engineering-decisions). |
| CORS | **`@fastify/cors`** | Restricts `POST /call` to the bell app's origin. |
| Logging | **pino** | Structured logs to stdout; enough observability at this scale with no database to inspect. |
| Testing | **Vitest 4** | Matches the Vite-based toolchain used elsewhere in the workspace. |
| Deploy | Plain Node process on the cafe's VPS over SSH (no Docker, no PaaS) | One small always-on service; see [Getting Started](/engineering/getting-started) for the deploy workflow. |

## Receiver Android app (`apps/receiver-android`)

| Concern | Choice | Rationale |
|---|---|---|
| Language / UI | **Kotlin + Jetpack Compose** | Modern Android default; the app is a status screen plus a notification handler, not a large UI surface. |
| Push | **Firebase Cloud Messaging** (topic subscription, `com.google.firebase:firebase-messaging-ktx`) | Reliable delivery in foreground, background, and killed states, with no server-side device registry — see [Architecture](/engineering/architecture). |
| Local storage | **Room** (`androidx.room`) | Backs the recent-calls list on the status screen; a real (if tiny) local schema beats hand-rolled SQLite or a flat file. |
| Build | **Android Gradle Plugin 8.7 + Kotlin 2.0**, versions pinned centrally in `gradle/libs.versions.toml` | Standard modern Android setup; the version catalog keeps every dependency version in one file. |
| Google services | **`google-services` Gradle plugin** | Wires `google-services.json` (safe to commit — identifiers, not secrets) into the FCM client. |
| Min SDK | **API 26** (Android 8.0) | Notification channels — which the custom bell sound depends on — require API 26+. |
| Distribution | Signed release APK, built in CI, published as a GitHub Release on tag; sideloaded onto staff phones | A handful of devices doesn't justify Play Store review overhead. |

## Docs site (`apps/docs`, this site)

| Concern | Choice | Rationale |
|---|---|---|
| Framework | **VitePress 1** | Markdown-first — the source content already lives in the PRDs as markdown; built-in sidebar, dark mode, and local search need almost no config. |
| Diagrams | **`vitepress-plugin-mermaid`** + `mermaid` | Renders the PRDs' Mermaid diagrams (like the [call-path sequence diagram](/engineering/architecture#the-call-path)) natively, no image export step. |
| Search | VitePress's built-in **local search provider** | Client-side only, no external search service to run or pay for (FR-D11). |
| Hosting | **GitHub Pages**, same artifact as `bell-web` under `/docs/` | A GitHub repo has exactly one Pages deployment; see [Architecture → Deployment](/engineering/architecture#deployment) for how the two builds are assembled together. |

## Shared package (`packages/shared`)

| Concern | Choice | Rationale |
|---|---|---|
| Content | `tables.json` (table code → floor/number/active flag) + generated TypeScript types | One file, imported directly by both `bell-web` and `api` at build time — no sync service, no runtime coupling between them. |
| Validation | **Zod** schema, checked by `scripts/validate-tables.mjs` at build time | A malformed `tables.json` fails the build instead of shipping a broken table list. |

## Workspace-wide tooling

| Concern | Choice | Rationale |
|---|---|---|
| Package manager | **pnpm 10**, single workspace (`pnpm-workspace.yaml`) | One `pnpm install`, one lockfile, `pnpm --filter` per app — apps stay independently buildable while sharing tooling. |
| Language | **TypeScript 5.7** everywhere except the Android app | Type safety shared across the bell app, API, and shared package; one `tsc --build` project graph. |
| Linting / formatting | **ESLint 9** (flat config, `typescript-eslint`) + **Prettier 3** | Consistent style enforced in CI across every TS package. |
| Scripting | **tsx** | Runs TypeScript scripts directly (QR generation, FCM test sends) without a separate build step. |
| CI | **GitHub Actions**, path-filtered per app | A docs-only edit doesn't rebuild the API; an API-only edit doesn't touch Pages — see [Architecture → Deployment](/engineering/architecture#deployment). |
