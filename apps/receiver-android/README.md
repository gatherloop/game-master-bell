# receiver-android

Android app that game masters keep open on their phone. Subscribes to the
`game-masters` FCM topic and shows a high-priority notification with the
table/floor whenever a customer taps the bell (see `docs/PRD.md` §5.3).

## Firebase setup

`app/google-services.json` in this repo is a **placeholder** pointing at the
`demo-game-master-bell` project id (same demo id the notify function's
emulator setup uses) — it's enough for the project to compile, but a device
using it cannot receive real pushes.

To receive real notifications:

1. Add an Android app to the Firebase project used by `functions/` (package
   name `com.gatherloop.gamemasterbell.receiver`).
2. Download the generated `google-services.json` from the Firebase console.
3. Replace `app/google-services.json` with it locally (do not commit real
   project credentials over the placeholder).

The FCM topic name (`game-masters`) must stay in sync with
`functions/src/message.ts`'s `GAME_MASTERS_TOPIC`.
