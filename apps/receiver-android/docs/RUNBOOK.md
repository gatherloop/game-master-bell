# Runbook — Signed Releases & Staff Phone Rollout

Operational reference for PRD-v3 phase 8
([docs/PRD-v3.md §7](../../../docs/PRD-v3.md#7-implementation-phases)): cutting
a signed release APK and getting it running reliably on a staff phone. See
[README.md](../README.md) for the app itself and Firebase/sound setup.

This is **not** the staff migration (that's ops, not a PR — PRD-v3 §7's
unnumbered row) — it's the mechanism the migration uses: a tagged push
produces an installable APK, and this doc is the checklist for turning that
APK into a phone that reliably rings on the "Panggilan Meja" channel.

---

## 1. One-time setup: the release keystore

Android only accepts an update over an existing app if both are signed with
the **same key** (§3.3 note in the PRD), so this keystore is generated once
and then never regenerated — losing it means uninstall/reinstall (and
re-granting permissions/battery settings) on every staff phone. This is
[PRD-v3 open question #4](../../../docs/PRD-v3.md#8-open-questions).

1. **Generate the keystore** (run once, keep the output *and* the passwords):

   ```sh
   keytool -genkeypair -v \
     -keystore game-master-bell-receiver-release.jks \
     -alias game-master-bell-receiver \
     -keyalg RSA -keysize 2048 -validity 10000
   ```

   `keytool` prompts for a store password, a key password (can match the
   store password), and the certificate's distinguished-name fields (org
   name etc. — cosmetic, not security-relevant since this is a sideloaded
   app, not a Play Store listing).

2. **Back it up offline**, separately from CI — e.g. a password manager
   entry or an encrypted drive, held by whoever owns this decision for the
   team (not only "in GitHub secrets"). If the `.jks` file and its
   passwords are lost, there is no recovery path; the only option is a new
   keystore, which forces every staff phone through uninstall/reinstall.

3. **Add repo secrets** — `game-master-bell` repo → **Settings → Secrets
   and variables → Actions**:

   | Secret                      | Value                                                                 |
   | ---------------------------- | ---------------------------------------------------------------------- |
   | `ANDROID_KEYSTORE_BASE64`    | `base64 -i game-master-bell-receiver-release.jks \| pbcopy` (or `base64 -w0` on Linux) — the whole keystore file, base64-encoded |
   | `ANDROID_KEYSTORE_PASSWORD`  | The store password from step 1                                       |
   | `ANDROID_KEY_ALIAS`          | `game-master-bell-receiver` (or whatever alias you chose)             |
   | `ANDROID_KEY_PASSWORD`       | The key password from step 1                                         |

   `.github/workflows/android-release.yml` decodes `ANDROID_KEYSTORE_BASE64`
   back into a `.jks` file and writes `apps/receiver-android/keystore.properties`
   from the other three on every run, then deletes both once the build
   finishes (`if: always()` cleanup step) — neither is ever committed
   (`apps/receiver-android/.gitignore` covers `keystore.properties`,
   `*.jks`, `*.keystore`).

   For a **local** signed build instead (e.g. to test signing before
   trusting CI), write `apps/receiver-android/keystore.properties` by hand
   with the same four keys (`storeFile`, `storePassword`, `keyAlias`,
   `keyPassword` — `storeFile` as a path relative to
   `apps/receiver-android/`) and run `./gradlew :app:assembleRelease`; the
   file is gitignored so this is safe to leave on a dev machine.

---

## 2. Cutting a release

1. Pick a version name (semver-ish, e.g. `1.0.0`) and tag the commit on
   `main` that should ship:

   ```sh
   git tag receiver-android-v1.0.0
   git push origin receiver-android-v1.0.0
   ```

   The `receiver-android-` prefix scopes the tag to this app — this is a
   monorepo, so a bare `v1.0.0` would be ambiguous if bell-web or the API
   ever adopt tag-based releases too.

2. Pushing the tag triggers `.github/workflows/android-release.yml`, which:
   - builds `:app:assembleRelease` signed with the keystore from §1,
     setting `versionName` to the tag's suffix (`1.0.0`) and `versionCode`
     to the repo's total commit count at that point (monotonic across
     releases without hand-tracking a counter);
   - publishes a GitHub Release tagged `receiver-android-v1.0.0` with the
     APK attached as `game-master-bell-receiver-1.0.0.apk`.
3. Watch the run under the repo's **Actions** tab; the release APK is under
   **Releases** once green.

To rebuild an existing tag (e.g. the keystore secrets were wrong the first
time), re-run the workflow manually from **Actions → Android receiver
release → Run workflow**, entering the existing tag name — this re-uploads
to the same GitHub Release rather than requiring a new tag.

---

## 3. Installing on a staff phone (sideload)

No Play Store (PRD-v3 §3.3) — the APK is installed directly from the GitHub
Release. Needed once per phone, plus again for updates (§5).

1. On the phone, open the release page in a browser (the URL is
   `https://github.com/gatherloop/game-master-bell/releases/tag/receiver-android-v<version>`)
   and download the `.apk` asset.
2. Tapping the downloaded file to install prompts **"For your security,
   your phone is not allowed to install unknown apps from this source"** the
   first time — tap **Settings** on that prompt and enable **Allow from
   this source** for whichever app opened the file (usually Chrome or
   Files). This is a one-time, per-app permission (Android 8+'s
   "unknown sources" replacement).
3. Confirm the install. Android will additionally show the app's requested
   permissions (`POST_NOTIFICATIONS`, network) before completing.
4. Open **Game Master Bell**. On first launch it requests notification
   permission (Android 13+, FR-N1) — grant it, otherwise no call can ever
   show a notification. It also subscribes to the `game-masters` FCM topic
   automatically; no login or code entry.
5. The status screen (FR-N5) shows the notification-permission state and
   topic-subscription state — both should read as granted/subscribed
   before moving on to §4.

---

## 4. Battery optimization + OEM autostart checklist

High-priority FCM mostly survives Android's stock Doze mode, but staff
phones in this cafe are typical Indonesian-market devices — Xiaomi, Oppo,
Vivo, Realme — whose OEM battery managers are more aggressive than stock
Android and can still kill the app's background process well before Doze
would, silently dropping calls. Work through this checklist on every staff
phone at install time; it's cheaper than debugging "why didn't it ring"
later.

### All phones (stock Android setting, do this first)

**Settings → Apps → Game Master Bell → Battery** → set to **Unrestricted**
(exact wording varies: "Don't optimize", "No restrictions"). This exempts
the app from the standard Android battery optimizer that would otherwise
defer background work, including notification delivery, to save power.

### Xiaomi / Redmi / POCO (MIUI / HyperOS)

1. **Settings → Apps → Manage apps → Game Master Bell → Battery saver** →
   **No restrictions**.
2. **Settings → Apps → Manage apps → Game Master Bell → Autostart** → enable.
   MIUI disables autostart for new installs by default, which alone can
   prevent the app's FCM listener from being ready after a reboot.
3. **Security app → Boost speed / Autostart manager** — confirm Game Master
   Bell is listed as allowed (MIUI sometimes surfaces this list separately
   from the Settings path above).
4. Lock the app in the recents/multitasking view (swipe down or long-press
   the app card → the padlock icon) — prevents MIUI's task cleaner from
   killing it.

### Oppo / Realme (ColorOS / Realme UI)

1. **Settings → Battery → App Battery Management → Game Master Bell** →
   enable **Allow auto-launch**, and set background running/battery use to
   **Allow background activity** / **No restrictions**.
2. **Settings → Privacy Permissions → Startup Manager** (or **Phone
   Manager → Startup Manager**) → enable Game Master Bell.
3. Lock the app in recents the same way as Xiaomi above.

### Vivo (FuntouchOS / OriginOS)

1. **Settings → Battery → Background Power Consumption Management** →
   enable **allow** for Game Master Bell (sometimes named **High
   background power consumption**).
2. **i Manager → App Manager → Autostart** → enable Game Master Bell.
3. Lock the app in recents.

### Verifying the checklist worked

After going through the relevant OEM section:

1. Force-stop the app (**Settings → Apps → Game Master Bell → Force
   stop**) to simulate the state an idle phone reaches after enough time
   unused.
2. Leave the phone idle (screen off) for a few minutes.
3. Trigger a real call — tap the bell from `apps/bell-web` on a test table,
   or `curl` the API's `/call` endpoint directly (see
   [apps/api/README.md](../../api/README.md) for the request shape).
4. Confirm the phone rings with the bell sound within NFR-1's ~5s budget,
   with the app having been fully killed beforehand — this is the state
   OEM battery managers most aggressively interfere with, so it's the one
   worth actually testing rather than assuming from the settings alone.

If a call is still missed after this checklist, the phone's OEM likely has
an additional undocumented battery restriction (common on older MIUI/
ColorOS versions) — search "`<phone model>` background app kill fix" for
the specific device, since these vary by OEM software version in ways this
runbook can't fully enumerate.

---

## 5. Updating an already-installed phone

Sideloaded apps don't auto-update (§3.3 in the PRD). To roll out a new
version:

1. Cut a new release (§2) with a higher `versionName`/tag.
2. On each staff phone, download and install the new APK the same way as
   §3 steps 1–3 — Android installs it as an update **in place** as long as
   it's signed with the same keystore (§1), keeping notification
   permission, topic subscription, and the recent-calls history intact.
3. No need to redo §4's battery/autostart settings — those are OS-level
   settings tied to the app's package, not reset by an in-place update.

If a version is ever shipped with a **different** keystore (only possible
if §1's keystore/backup was lost), Android refuses the in-place update
("app not installed — conflicts with an existing package") and the phone
needs a manual uninstall of the old app before installing the new one,
losing local recent-calls history and requiring every step in §3–4 again.
