# receiver-android

Android app that game masters keep on their phone. Subscribes to the
`game-masters` FCM topic and shows a high-priority notification with the
table/floor whenever a customer taps the bell (see `docs/PRD-v3.md` §3.3).

Each received call is also persisted locally with Room and shown as a
recent-calls list on the status screen (FR-N5), so a game master can see
what was called while they were away from the phone.

## Firebase setup

`app/google-services.json` in this repo is a **placeholder** pointing at the
`demo-game-master-bell` project id — it's enough for the project to compile,
but a device using it cannot receive real pushes.

To receive real notifications:

1. Add an Android app to the Firebase project used by `apps/api`'s FCM
   sender (see `apps/api/docs/RUNBOOK.md` §1), package name
   `com.gatherloop.gamemasterbell.receiver`.
2. Download the generated `google-services.json` from the Firebase console.
3. Replace `app/google-services.json` with it locally (do not commit real
   project credentials over the placeholder).

The FCM topic name (`game-masters`) must stay in sync with
`apps/api/src/fcm`'s `FCM_TOPIC` default.

## Custom bell sound

`app/src/main/res/raw/bell_call.ogg` is the sound registered on the
`table_calls_v2` notification channel (§3.3, FR-N2) — the reason v3 exists
at all (browsers can't set a per-notification sound; a native notification
channel can).

- **Provenance:** an original recording, procedurally synthesized (additive
  synthesis of inharmonic partials with independent exponential decay —
  the standard technique for a bell-like timbre) rather than sourced from a
  third party. No external rights are attached.
- **License:** CC0 — public domain, cleared for redistribution (NFR-6).
- **Specs:** mono, 44.1kHz, ~2.6s, Ogg Vorbis.

Notification channels are immutable once created (a channel's sound can't
be changed after the fact — Android platform limitation). Replacing this
file alone does **not** change what installed devices hear; ship a sound
change as a new channel id (bump `table_calls_v2` → `table_calls_v3` in
`strings.xml`, add the new id to `RETIRED_CHANNEL_IDS` in
`fcm/CallNotificationChannel.kt`) so `deleteRetiredCallNotificationChannels`
cleans up the old one on next launch.

## Releasing

No Play Store (PRD-v3 §3.3) — releases are signed APKs published to GitHub
Releases and sideloaded onto staff phones. Pushing a `receiver-android-v*`
tag (e.g. `receiver-android-v1.0.0`) runs
`.github/workflows/android-release.yml`, which builds a signed
`assembleRelease` and attaches the APK to a matching GitHub Release. See
[docs/RUNBOOK.md](docs/RUNBOOK.md) for the one-time release-keystore setup,
the full release checklist, and the staff-phone install + battery/OEM
autostart checklist.
