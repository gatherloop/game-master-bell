# VPS Deploy Guide

The API runs as a single Docker container on the VPS, sitting behind a
reverse proxy that terminates TLS. This mirrors the target architecture in
[PRD-v3](https://github.com/gatherloop/game-master-bell/blob/main/docs/PRD-v3.md):
the GitHub Pages-hosted bell app calls this API over HTTPS, so the proxy —
not the Node process — holds the certificate.

**Not the automated path.** `.github/workflows/deploy-api.yml` deploys
natively via systemd (see [DEPLOY_NATIVE.md](DEPLOY_NATIVE.md)); this guide
is kept as an alternative for a VPS where Docker is preferred. Because the
API now lives at `apps/api` in the `game-master-bell` monorepo, the Docker
build context is the repo root (a pnpm workspace install needs every
workspace package's `package.json`, not just `apps/api`'s) — see
`apps/api/Dockerfile`'s comment and `apps/api/docker-compose.yml`'s
`build.context: ../..`.

## Prerequisites

- A VPS with Docker Engine and the Docker Compose plugin installed.
- A domain/subdomain pointed at the VPS (e.g. `bell-api.gatherloop.id`).
- A reverse proxy already running on the VPS (Caddy or nginx). Caddy is
  recommended for its automatic Let's Encrypt issuance/renewal.

## 1. Get the code onto the VPS

```bash
git clone https://github.com/gatherloop/game-master-bell.git
cd game-master-bell/apps/api
cp .env.example .env
```

Fill in `.env` with production values:

- `FCM_SERVICE_ACCOUNT_PATH` — path to the Firebase service-account JSON used
  to send FCM notifications; see [RUNBOOK.md](RUNBOOK.md#creating-the-firebase-project--service-account)
  for how to obtain it. Place the file at `apps/api/fcm-service-account.json`
  (matching `docker-compose.yml`'s bind mount) and leave the env var at its
  `.env.example` default. Required — the API refuses to start without it
  (FR-A9).

Table data has no on-disk state — it's compiled in from `packages/shared`
at build time. As of PRD-v3 phase 9 the API keeps no persistent state at
all, so no data volume is needed.

## 2. Run the API container

The container binds to `127.0.0.1:3000` only — it is never exposed directly
to the internet, the reverse proxy is the only public entry point. Run this
from `apps/api` (where `docker-compose.yml` lives) — Compose resolves its
`build.context: ../..` relative to that file, so the build still sees the
whole monorepo:

```bash
docker compose up -d --build
```

Confirm it's up locally on the VPS:

```bash
curl http://127.0.0.1:3000/healthz
# {"status":"ok"}
```

`restart: always` in `docker-compose.yml` keeps the process supervised
across crashes and VPS reboots (NFR-2).

## 3. Reverse proxy with TLS

### Option A: Caddy

Add a site block to `Caddyfile`:

```
bell-api.gatherloop.id {
    reverse_proxy 127.0.0.1:3000
}
```

Caddy obtains and renews the Let's Encrypt certificate automatically on
reload (`caddy reload`).

### Option B: nginx + certbot

```nginx
server {
    listen 443 ssl;
    server_name bell-api.gatherloop.id;

    ssl_certificate     /etc/letsencrypt/live/bell-api.gatherloop.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bell-api.gatherloop.id/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name bell-api.gatherloop.id;
    return 301 https://$host$request_uri;
}
```

Issue the certificate with `certbot --nginx -d bell-api.gatherloop.id`.

## 4. Verify end to end

```bash
curl https://bell-api.gatherloop.id/healthz
# {"status":"ok"}
```

This is the demoable outcome for phase A1.

`curl /call` rings every staff phone subscribed to the `game-masters` FCM
topic (via the native Android receiver, `apps/receiver-android`):

```bash
curl -i https://bell-api.gatherloop.id/call \
  -X POST -H "Content-Type: application/json" \
  -d '{"tableCode":"2-05"}'
# HTTP/1.1 200 OK  {"ok":true}
```

Check the container logs (`docker compose logs -f`) for the `fcm.send_result`
line logging the message id or error (FR-A8).

## Redeploying

```bash
git pull   # from the game-master-bell repo root
cd apps/api
docker compose up -d --build
```

## Lightweight VPS? Skip Docker

If the VPS is too small for Docker's daemon overhead to be worth it (e.g.
512MB RAM or less) run the API directly with Node + systemd instead — see
[docs/DEPLOY_NATIVE.md](DEPLOY_NATIVE.md). Same reverse proxy config
either way, since the app always listens on `127.0.0.1:3000`.
`.github/workflows/deploy-api.yml` automates the native path.

## Next steps

Once the API is deployed and verified end to end, see
[RUNBOOK.md](RUNBOOK.md) for creating the Firebase project + service
account, the (historical) v1 Firebase project decommission checklist, and
wiring up uptime monitoring for `GET /healthz`.
