# Runbook — Firebase Setup, Decommission & Operations

Sections 2–4 below are carried over from the API's standalone-repo history
(PRD-v2 phase A5, the final step of that repo's API track) — the content
(the *old* v1 Firebase decommission, `/healthz` monitoring, passcode
rotation) is unchanged by the [PRD-v3](../../../docs/PRD-v3.md) move into
this monorepo; only the file's location and cross-links moved. By that
point the v1 Firebase Cloud Function and native Android receiver had
already been removed from the bell app, and the production call path had
been running on this API since PRD-v2 phase B2. Nothing referenced the v1
Firebase project, so it was safe to tear down (§2).

Section 1 is new for PRD-v3 phase 4: v3 brings Firebase back, in a
narrower role — FCM only, no Cloud Functions, no billing account (see
[PRD-v3 §2 "Firebase project"](../../../docs/PRD-v3.md#firebase-project))
— to send data-only push messages to the native Android receiver
(`apps/receiver-android`, landing in a later phase). §1 covers creating
that fresh project and the service-account credential this API's
`src/fcm/` module needs.

See [DEPLOY.md](DEPLOY.md) for the initial VPS setup and
[README.md](../README.md) for endpoints and configuration.

---

## 1. Creating the Firebase project + service account

Needed once, before `FCM_SERVICE_ACCOUNT_PATH` can be filled in (see
[`.env.example`](../.env.example) and
[DEPLOY.md](DEPLOY.md#1-get-the-code-onto-the-vps)). This is a *new*
project — the v1 Firebase project was deleted in PRD-v2 phase A5 (§2 below)
and is not reused.

1. **Pick the owning Google account.** Use a shared cafe/team account, not
   a personal one — losing access to a personal account that owns the
   project was a real problem when decommissioning v1. (Open question #3
   in [PRD-v3 §8](../../../docs/PRD-v3.md#8-open-questions); resolve this
   before continuing if the team hasn't already.)
2. **Create the project.** [Firebase console](https://console.firebase.google.com/)
   → **Add project** → name it (e.g. `gatherloop-bell`) → you can decline
   Google Analytics (not used). Firebase creates the project on the free
   **Spark plan** by default — do **not** upgrade to Blaze; nothing in v3
   needs it (no Cloud Functions this time, only FCM sends via the Admin
   SDK, which the Spark plan covers).
3. **No extra FCM setup needed.** Cloud Messaging is enabled automatically
   for every project; there's no separate "enable FCM" step. Topic
   subscription (`game-masters`) happens client-side from the Android app
   in a later phase — nothing to configure here.
4. **Generate the service-account key.** Console → **Project settings**
   (gear icon) → **Service accounts** tab → **Generate new private key** →
   confirm → a JSON file downloads. This is the credential
   `src/fcm/credentials.ts` loads (`project_id`, `client_email`,
   `private_key` fields) — treat it like any other private key (it's the
   FCM-equivalent of the VAPID private key it sits alongside in `.env`).
5. **Place the file.**
   - **Local dev:** save it as `apps/api/fcm-service-account.json` (already
     covered by `.gitignore`'s `*fcm-service-account*.json` pattern — never
     commit it) and leave `FCM_SERVICE_ACCOUNT_PATH` at its `.env.example`
     default.
   - **VPS (native deploy):** the `deploy-api.yml` workflow writes it from
     the `FCM_SERVICE_ACCOUNT_JSON` repo secret on every deploy — see
     [DEPLOY_NATIVE.md](DEPLOY_NATIVE.md#repo-secrets). Paste the *entire*
     JSON file contents (not a path) as that secret's value.
   - **VPS (Docker deploy):** place the file at `apps/api/fcm-service-account.json`
     next to `docker-compose.yml`, which bind-mounts it in — see
     [DEPLOY.md](DEPLOY.md#1-get-the-code-onto-the-vps).
6. **Verify.** With `FCM_SERVICE_ACCOUNT_PATH` set, run
   `pnpm --filter @game-master-bell/api fcm:send-test` from the repo root.
   It sends one data-only test message to the `game-masters` topic (or
   `FCM_TOPIC` if overridden) and prints the message id on success. Since
   no device is subscribed to the topic yet (that lands with the Android
   app in a later phase), there's nothing to *receive* it — the send
   succeeding without a thrown error, with a message id printed, is this
   phase's demoable outcome. **Cloud Messaging → Reporting** in the
   Firebase console can confirm it too, though delivery stats can lag a
   few minutes.
7. **Also start the API and confirm it boots.** `FCM_SERVICE_ACCOUNT_PATH`
   is now required at startup (FR-A9) — `pnpm --filter @game-master-bell/api dev`
   (or the deployed process) should come up normally; if the file is
   missing or malformed the process exits immediately with a clear error
   naming the problem field.

---

## 2. Old (v1) Firebase project decommission (historical)

This project was already deleted by the time this section was written
(PRD-v2 phase A5), well before v3 created the new project in §1 above.
Kept for the record.

**Precondition:** confirm phase B3 is merged and deployed (the bell app's
`VITE_CALL_API_URL` points at this API, not a Cloud Function URL) and that
this API has been serving production calls without issue for at least a few
days. Once that's true, nothing reads from or writes to the Firebase project
— it's a pure cost/liability with no product value.

1. **Confirm no live traffic.** In the Firebase console, open
   **Functions** and check the invocation graph for the old `notify`/`call`
   function over the last 7 days — it should be flat at zero. If it isn't,
   stop: something is still pointed at the old path (check the bell app's
   deployed env var and any stale browser tabs/caches before proceeding).
2. **Export anything worth keeping.** v1 kept no durable data of its own
   (no call history, per PRD §6) beyond the FCM topic subscription managed
   by the Android app, so there's nothing to export. If your project
   accumulated Cloud Function logs you want for the record, download them
   (**Functions → Logs → Export**) before deleting.
3. **Delete the Cloud Function.** Console → **Functions** → select the
   `notify`/`call` function → **Delete**. This stops billing for invocations
   immediately.
4. **Remove the Firebase Cloud Messaging setup.** Console → **Project
   settings → Cloud Messaging** — no action needed to "delete" FCM itself,
   but note the server key/sender ID are dead once the project is deleted in
   the next step.
5. **Delete the Firebase project.** Console → **Project settings → General**
   → scroll to **Delete project** → follow the confirmation flow (requires
   typing the project ID). This is the point of no return — Firebase gives
   a ~30 day grace window before the project ID is released, but the project
   itself stops serving traffic and stops billing immediately.
6. **Close the Blaze billing account** (if this project was its only user).
   [Google Cloud Console → Billing](https://console.cloud.google.com/billing)
   → select the billing account → **Account management** → **Close billing
   account**. Confirm no other projects are attached to it first (**Billing
   → My projects**) — closing it disables billing for everything linked, so
   double-check before confirming.
7. **Revoke lingering access.** Console → **Project settings → Users and
   permissions** (or Cloud IAM, if the project isn't fully deleted yet) —
   remove any service accounts, CI credentials, or personal accounts that
   only existed for this project. Rotate/delete any `google-services.json`
   or service account JSON keys that were floating around in CI secrets or
   local machines for the old Android app / Cloud Function deploy.
8. **Verify.** Firebase console → project list no longer shows this project
   (or shows it as pending deletion); Cloud Billing shows no active charges
   from it going forward. This is the demoable outcome for phase A5's
   Firebase side: **Firebase console empty.**

---

## 3. Uptime monitoring for `GET /healthz`

`GET /healthz` returns `{"status":"ok"}` with a 200 when the process is up
(see [README.md](../README.md#endpoints)). NFR-2 asks for this wired to
"simple uptime monitoring" — pick one of the two options below depending on
whether you'd rather lean on a free external service or keep monitoring
entirely self-hosted alongside the API.

### Option A: external uptime monitor (recommended — zero infra to run)

Any HTTP uptime checker works since `/healthz` is a plain unauthenticated
GET. [UptimeRobot](https://uptimerobot.com) and
[healthchecks.io](https://healthchecks.io)-style "push" monitors are both
free at this scale; UptimeRobot's approach (it polls you) needs no changes
on the VPS:

1. Create a new **HTTP(s)** monitor pointed at
   `https://bell-api.gatherloop.id/healthz`.
2. Interval: 5 minutes is plenty for a single-VPS internal tool (NFR-1's ~5s
   latency budget is about call delivery, not about how fast we notice an
   outage).
3. Alert condition: non-2xx response, or a request timeout (10s is a
   reasonable threshold — the endpoint does no I/O, so a healthy process
   responds in milliseconds).
4. Point the alert contact at whatever the team already watches (email,
   Slack webhook, etc.) — the specific channel is a team choice, not part of
   this spec.

### Option B: self-hosted cron check (no third-party dependency)

If avoiding another external account is a priority, a small cron job on the
same VPS (or a second one) covers it:

```bash
# /etc/cron.d/bell-api-healthcheck — runs every 5 minutes
*/5 * * * * root curl -fsS --max-time 10 https://bell-api.gatherloop.id/healthz \
  || curl -fsS -X POST https://ntfy.sh/<your-private-topic> -d "bell-api healthz check failed"
```

`curl -f` treats non-2xx as a failure, so both a downed process and a proxy
misconfiguration trip the alert. Swap the `ntfy.sh` line for whatever
notification channel the team uses (a webhook, `mail`, etc.) — the shape is
"on failure, push a message somewhere a human will see it."

### Verifying the alert path

Before calling monitoring "live," force one failure end to end: stop the
container (`docker compose stop`) on a maintenance window, confirm the
alert fires within one check interval, then start it back up
(`docker compose start`) and confirm the alert clears. This is the
demoable outcome for phase A5's monitoring side: **monitoring live** — not
just configured, but proven to notify on a real failure.

---

## 4. Staff passcode rotation

`STAFF_PASSCODE` gates `POST`/`DELETE /subscriptions` only (per FR-A5) — it
is **not** checked when sending calls or pushes, so rotating it never
disrupts devices that are already subscribed. Existing rows in the
subscriptions database keep receiving pushes through a rotation with zero
downtime. The passcode only matters the next time a device needs to
subscribe or unsubscribe (a new staff phone, a reinstalled receiver PWA, or
an explicit unsubscribe).

Rotate it periodically (e.g. when staff turnover happens, or on a routine
schedule the team sets) as follows:

1. Generate a new passcode:
   ```bash
   openssl rand -hex 16
   ```
2. Update `STAFF_PASSCODE` in the VPS's `.env` file to the new value.
3. Restart the API container to pick it up:
   ```bash
   docker compose up -d
   ```
   (Compose only recreates the container if the config changed; `--force-recreate`
   guarantees it if you want to be explicit.)
4. Confirm the old passcode is rejected and the new one works:
   ```bash
   curl -i https://bell-api.gatherloop.id/subscriptions \
     -X POST -H "Content-Type: application/json" \
     -d '{"subscription":{"endpoint":"https://example/test","keys":{"p256dh":"x","auth":"y"}},"passcode":"<old passcode>"}'
   # HTTP/1.1 401 Unauthorized
   ```
5. Distribute the new passcode to staff through whatever out-of-band channel
   the team already trusts (it's a shared secret, not per-device — same
   assumption as v1's install ceremony, per PRD §3.2). Devices already
   subscribed don't need to do anything; only someone (re)subscribing or
   unsubscribing from now on needs the new value.

No code or schema change is needed for rotation — the passcode is a single
env var compared at request time (`src/subscriptions/auth.ts`), never
persisted.
