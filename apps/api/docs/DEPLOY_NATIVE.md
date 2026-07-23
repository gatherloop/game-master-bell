# Native (non-Docker) VPS Deploy Guide

An alternative to [DEPLOY.md](DEPLOY.md) for VPS instances too small for
Docker's daemon overhead to be worth it for a single lightweight Node
service (e.g. 512MB RAM or less). The API runs directly under a
**system-level** systemd service instead of a container, sitting behind
the same TLS-terminating reverse proxy — the app always listens on
`127.0.0.1:3000` regardless of how it's run, so the proxy setup is
identical either way.

This deliberately uses a system unit (`/etc/systemd/system/`, managed with
plain `systemctl`) rather than a per-user unit (`systemctl --user`). An
earlier version of this guide used a user service, which requires
`loginctl enable-linger <user>` to survive after the SSH session that
started it disconnects. In production that turned out to be unreliable —
the API kept dying minutes after unrelated SSH sessions (including the
GitHub Actions deploy's own SCP/SSH connections) closed, each time
resurfacing only when some other session happened to log in and restart
the user's systemd manager. A system service has no such dependency: it's
supervised by PID 1 from boot, independent of who is or isn't logged in.

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
- The deploy user can run `sudo` (passwordlessly, for non-interactive CI
  use) to write `/etc/systemd/system/game-master-bell-api.service` and run
  `systemctl`. If the deploy user is already `root`, this is automatic.

## 1. Get the code and configure

The API lives at `apps/api` in the `game-master-bell` monorepo; clone the
whole repo (`pnpm install` needs to see every workspace package) and work
from the `apps/api` subdirectory:

```bash
git clone https://github.com/gatherloop/game-master-bell.git
cd game-master-bell/apps/api
cp .env.example .env
```

Fill in `.env` with the same production value described in
[DEPLOY.md step 1](DEPLOY.md#1-get-the-code-onto-the-vps):
`FCM_SERVICE_ACCOUNT_PATH` (place the JSON file alongside `.env` at
`apps/api/fcm-service-account.json` and leave the env var at its
`.env.example` default — see
[RUNBOOK.md](RUNBOOK.md#creating-the-firebase-project--service-account)).
Table data has no env var or on-disk state — it's compiled in from
`packages/shared` at build time; as of PRD-v3 phase 9 the API keeps no
persistent state at all.

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

## 3. Run as a systemd service

```bash
sudo cp deploy/game-master-bell-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now game-master-bell-api
```

`WorkingDirectory`/`EnvironmentFile` in the unit file point at
`/root/projects/game-master-bell/apps/api`; edit both if you cloned the
monorepo elsewhere.

Check it's up:

```bash
sudo systemctl status game-master-bell-api
curl http://127.0.0.1:3000/healthz
# {"status":"ok"}
journalctl -u game-master-bell-api -f   # tail logs
```

`Restart=always` in the unit keeps the process supervised across crashes
and reboots (NFR-2), same guarantee as `restart: always` in the Docker
compose file. Because this is a system unit (`WantedBy=multi-user.target`),
it also starts on boot with no linger/session dependency at all.

## 4. Reverse proxy with TLS, and verifying end to end

Identical to the Docker guide — see DEPLOY.md's
["Reverse proxy with TLS"](DEPLOY.md#3-reverse-proxy-with-tls) and
["Verify end to end"](DEPLOY.md#4-verify-end-to-end) sections. Swap
`docker compose logs -f` for `journalctl -u game-master-bell-api -f`
when checking for the `fcm.send_result` log line.

## Redeploying manually

Run from the repo root (`game-master-bell`):

```bash
git pull
pnpm install --frozen-lockfile
pnpm --filter @game-master-bell/api build
pnpm prune --prod
sudo systemctl restart game-master-bell-api
```

## Automated deploys via GitHub Actions

`.github/workflows/deploy-api.yml` (in the `game-master-bell` monorepo) has
two jobs. `build` runs on a GitHub-hosted runner: lint/typecheck/test/build,
then `pnpm --filter @game-master-bell/api deploy --prod --legacy` packages
`apps/api` as a self-contained, production-only directory (`dist/` plus a
fully resolved `node_modules`, no workspace symlinks back into the monorepo
store) and uploads it as a build artifact.

`deploy` (on `main` only) downloads that artifact and copies it to the VPS
over SCP, then SSHes in to `git fetch`/`reset --hard` the checkout (for
`apps/api/deploy/game-master-bell-api.service` and other tracked files),
extract the artifact over `apps/api/dist` and `apps/api/node_modules`,
(re)write `apps/api/.env`/`apps/api/fcm-service-account.json` from GitHub
secrets, and restart the service. **The VPS never runs `pnpm install` or
`tsc` itself** — on a 1GB-RAM box, running the workspace install and
TypeScript build in memory alongside the live API process was enough to
starve or kill it, which is why the build moved to CI. It also
(re)installs `apps/api/deploy/game-master-bell-api.service` into
`/etc/systemd/system/` (via `sudo`) and runs `daemon-reload` on every
deploy, so edits to the unit file in the repo take effect on the next push
to `main` without any manual step on the VPS.

The ["Redeploying manually"](#redeploying-manually) steps above are
unaffected — a manual redeploy still builds in place on the VPS, so prefer
triggering the GitHub Actions workflow (**Actions** tab → **Run workflow**)
over a manual redeploy when the box is under memory pressure.

### One-time VPS prep

1. Complete step 1 above once by hand (clone the **monorepo**) so there's a
   working checkout for the workflow to update — no need to build
   (step 2) first, since the workflow ships its own prebuilt artifact and
   (re)writes `apps/api/.env` itself on every deploy. The workflow installs
   the systemd unit and starts the service on its first run.
2. Make sure the deploy user can run `sudo systemctl`/`sudo cp` into
   `/etc/systemd/system/` without a password prompt (needed for the
   non-interactive SSH deploy step) — automatic if the deploy user is
   `root`, otherwise add a sudoers entry for those commands.
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
| `VPS_DEPLOY_PATH`   | Absolute path to the **monorepo** clone on the VPS, e.g. `/home/deploy/game-master-bell` (not the `apps/api` subdirectory — the deploy script `cd`s there to update the git checkout, then extracts the prebuilt build artifact into `apps/api/`) |
| `FCM_SERVICE_ACCOUNT_JSON` | The full contents of the Firebase service-account JSON file (paste the whole file, not a path) — see [RUNBOOK.md](RUNBOOK.md#creating-the-firebase-project--service-account) |

The workflow writes `FCM_SERVICE_ACCOUNT_JSON` to
`apps/api/fcm-service-account.json` on the VPS on every deploy and points
`FCM_SERVICE_ACCOUNT_PATH` at it. This is the only env var that needs to be
a secret; everything else keeps the default already baked into
`.env.example`. To override another default, add it as another secret and
an extra line in the `cat > apps/api/.env` heredoc in
`.github/workflows/deploy-api.yml`.

Once the secrets are set, push to `main` (or run the workflow manually
from the **Actions** tab) to trigger a deploy.

## Next steps

The monorepo-triggered deploy was verified end to end (`GET /healthz` on
the VPS responds, and a real `POST /call` rings a topic-subscribed device),
so this repo's `deploy-api.yml` is the VPS's only deploy source: the old
`game-master-bell-api` repo's `.github/workflows/deploy.yml` (its rollback
path) was removed in [PRD-v3 phase 10](../../../docs/PRD-v3.md#7-implementation-phases)
and that repo is now archived. See [RUNBOOK.md](RUNBOOK.md) for creating
the Firebase project + service account, the (historical) v1 Firebase
project decommission checklist, and wiring up uptime monitoring for
`GET /healthz`.
