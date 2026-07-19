# Native (non-Docker) VPS Deploy Guide

An alternative to [DEPLOY.md](DEPLOY.md) for VPS instances too small for
Docker's daemon overhead to be worth it for a single lightweight Node
service (e.g. 512MB RAM or less). The API runs directly under a systemd
user service instead of a container, sitting behind the same
TLS-terminating reverse proxy — the app always listens on
`127.0.0.1:3000` regardless of how it's run, so the proxy setup is
identical either way.

## Prerequisites

- Node.js 22.x on the VPS, e.g. via NodeSource:

  ```bash
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
  sudo corepack enable
  ```

- A domain/subdomain pointed at the VPS.
- A reverse proxy already running (Caddy or nginx) — see
  [DEPLOY.md's "Reverse proxy with TLS"](DEPLOY.md#3-reverse-proxy-with-tls)
  section; it's unchanged by this guide.
- `loginctl enable-linger <user>` for whichever user will run the service,
  so its systemd user manager (and the API) keeps running without an
  active SSH session, and starts again on reboot.

## 1. Get the code and configure

The API lives at `apps/api` in the `game-master-bell` monorepo; clone the
whole repo (`pnpm install` needs to see every workspace package) and work
from the `apps/api` subdirectory:

```bash
git clone https://github.com/gatherloop/game-master-bell.git
cd game-master-bell/apps/api
cp .env.example .env
mkdir -p data
```

Fill in `.env` with the same production values described in
[DEPLOY.md step 1](DEPLOY.md#1-get-the-code-onto-the-vps):
`STAFF_PASSCODE`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
`SUBSCRIPTIONS_DB_PATH` defaults to `./data/...`, relative to this
directory — the `mkdir -p data` above creates it. Table data has no env var
or on-disk state — it's compiled in from `packages/shared` at build time.

## 2. Build

Run these from the repo root (`game-master-bell`), not `apps/api` — pnpm
workspace commands resolve from the root:

```bash
pnpm install --frozen-lockfile
pnpm --filter @game-master-bell/api build
pnpm prune --prod
```

`pnpm prune --prod` drops `devDependencies` (TypeScript, etc.) across the
whole workspace once `apps/api/dist/` is built, keeping `node_modules` down
to what's needed at runtime. Nothing else in the workspace runs from this
VPS checkout, so pruning the whole tree (rather than just `apps/api`) is
safe.

## 3. Run as a systemd user service

```bash
mkdir -p ~/.config/systemd/user
cp deploy/game-master-bell-api.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now game-master-bell-api
```

`WorkingDirectory`/`EnvironmentFile` in the unit file point at
`/root/projects/game-master-bell/apps/api`; edit both if you cloned the
monorepo elsewhere.

Check it's up:

```bash
systemctl --user status game-master-bell-api
curl http://127.0.0.1:3000/healthz
# {"status":"ok"}
journalctl --user -u game-master-bell-api -f   # tail logs
```

`Restart=always` in the unit keeps the process supervised across crashes
and reboots (NFR-2), same guarantee as `restart: always` in the Docker
compose file.

## 4. Reverse proxy with TLS, and verifying end to end

Identical to the Docker guide — see DEPLOY.md's
["Reverse proxy with TLS"](DEPLOY.md#3-reverse-proxy-with-tls) and
["Verify end to end"](DEPLOY.md#4-verify-end-to-end) sections. Swap
`docker compose logs -f` for `journalctl --user -u game-master-bell-api -f`
when checking for the per-subscription `push.send_result`/`push.pruned`
log lines.

## Redeploying manually

Run from the repo root (`game-master-bell`):

```bash
git pull
pnpm install --frozen-lockfile
pnpm --filter @game-master-bell/api build
pnpm prune --prod
systemctl --user restart game-master-bell-api
```

## Automated deploys via GitHub Actions

`.github/workflows/deploy-api.yml` (in the `game-master-bell` monorepo)
runs lint/typecheck/test/build on every push that touches `apps/api/**`,
`packages/shared/**`, or `pnpm-lock.yaml`, then on `main` SSHes into the
VPS and runs the same redeploy steps as above, plus (re)writes the VPS's
`apps/api/.env` from GitHub secrets on every deploy — rotating a secret
and re-running the workflow is enough to roll it out. It also
(re)installs `apps/api/deploy/game-master-bell-api.service` into
`~/.config/systemd/user/` and runs `daemon-reload` on every deploy, so
edits to the unit file in the repo take effect on the next push to `main`
without any manual step on the VPS.

### One-time VPS prep

1. Complete steps 1–2 above once by hand (clone the **monorepo**, configure
   `apps/api/.env`) so there's a working checkout for the workflow to
   update. The workflow itself installs the systemd unit and starts the
   service on its first run.
2. Make sure lingering is enabled for the deploy user
   (`loginctl enable-linger <user>`) — without it, `systemctl --user`
   commands over a non-interactive SSH session have nothing to talk to.
3. Generate a dedicated SSH key pair for GitHub Actions and add the
   **public** key to that user's `~/.ssh/authorized_keys` on the VPS:

   ```bash
   ssh-keygen -t ed25519 -f deploy_key -C "github-actions" -N ""
   ```

4. Keep the **private** key (`deploy_key`) for the `VPS_SSH_KEY` secret
   below — never commit it.

### Repo secrets

Add these under the `game-master-bell` repo's **Settings → Secrets and
variables → Actions** (create a `production` environment first if you want
the extra approval gate that `environment: production` in the workflow
enables). If the API previously deployed from the standalone
`game-master-bell-api` repo, these are the same values — copy them over,
then update `VPS_DEPLOY_PATH` to the monorepo checkout path:

| Secret              | Value                                                                            |
| ------------------- | --------------------------------------------------------------------------------- |
| `VPS_HOST`          | VPS IP or hostname                                                               |
| `VPS_PORT`          | SSH port (usually `22`)                                                          |
| `VPS_USERNAME`      | The deploy user created above                                                    |
| `VPS_SSH_KEY`       | The **private** key from step 3 (paste the whole file contents)                  |
| `VPS_DEPLOY_PATH`   | Absolute path to the **monorepo** clone on the VPS, e.g. `/home/deploy/game-master-bell` (not the `apps/api` subdirectory — the deploy script `cd`s there and runs workspace-relative commands) |
| `STAFF_PASSCODE`    | Same value described in step 1                                                   |
| `VAPID_PUBLIC_KEY`  | Same value described in step 1                                                   |
| `VAPID_PRIVATE_KEY` | Same value described in step 1                                                   |
| `VAPID_SUBJECT`     | Same value described in step 1                                                   |

Only these four env vars need to be secrets; everything else keeps the
default already baked into `.env.example`. To override another default,
add it as another secret and an extra line in the `cat > apps/api/.env`
heredoc in `.github/workflows/deploy-api.yml`.

Once the secrets are set, push to `main` (or run the workflow manually
from the **Actions** tab) to trigger a deploy.

## Next steps

Once the monorepo-triggered deploy is verified end to end (`GET /healthz`
on the VPS still responds, and a real `POST /call` still fans out a push),
disable the old `game-master-bell-api` repo's `.github/workflows/deploy.yml`
(e.g. delete the file or its secrets) so the VPS has exactly one deploy
source, per [PRD-v3 phase 2](../../../docs/PRD-v3.md#7-implementation-phases).
Until then, the old repo's workflow is kept as a rollback path. See
[RUNBOOK.md](RUNBOOK.md) for the phase A5-era operational reference: the
Firebase project decommission checklist (already done, kept for history),
wiring up uptime monitoring for `GET /healthz`, and the staff passcode
rotation procedure.
