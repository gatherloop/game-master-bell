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
