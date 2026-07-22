# Engineering Decisions

This project went through three architecture revisions (`docs/PRD.md`,
`PRD-v2.md`, `PRD-v3.md`) before landing where [Architecture](/engineering/architecture)
and [Tech Stack](/engineering/tech-stack) describe it today. The interesting
part isn't any single diagram — it's the trade-offs that got made and
un-made along the way. Five of them are worth walking through.

## Self-hosted API instead of Firebase infrastructure

v1 put the call endpoint in a Firebase Cloud Function. v2 tore that out in
favor of a small Node.js API on the cafe's own VPS — the biggest single
change in the project's history, and one that stuck.

The motivation wasn't "Firebase bad." It was narrower: a Cloud Function
meant a Blaze (pay-as-you-go) billing account, `firebase deploy` as a second
deploy tool alongside the VPS deploys already in place, and Google
credentials to manage for a runtime the team didn't own or control. Since
the cafe already runs a VPS for other things, hosting one more small
Fastify process there costs nothing new and removes a dependency instead of
adding one. `POST /call` becomes two routes and a `tables.json` lookup —
see [`apps/api/src/app.ts`](https://github.com/gatherloop/game-master-bell/blob/main/apps/api/src/app.ts).

This decision later got tested by its own consequence. v3 needed FCM back
for push delivery (next section), which sounds like walking back the
"no Firebase" call. It isn't, and the distinction is the point: v2's
objection was to Firebase as *infrastructure the team deploys to and
operates* — the Cloud Function runtime, the billing account, the
`firebase deploy` tooling. FCM as a *push transport*, called from the API
the team already owns, is a different thing entirely — it runs on the free
Spark plan with no billing account, and the "server" side of it is ten
lines of `firebase-admin` calling `.send()`. The call path is still
`bell → our API → push`; only the last hop's broker changed. Owning the
endpoint was the actual goal, and that never moved.

## A native Android receiver, just for one notification sound

The single feature that justified building and shipping a native Android
app, rather than a receiver PWA, is a custom notification sound. That
sounds like a disproportionate amount of engineering for one detail — until
you look at what it's replacing on a busy cafe floor: a default chime
indistinguishable from a chat message or an app promo, which staff
learn to tune out. That's the one failure mode the product can't tolerate.

v2 shipped a PWA receiver on standard Web Push, and it worked for
everything except this. The Notifications API's `sound` option is
unimplemented in every browser, a service worker can't play audio while
the app is closed, and per-site notification channels on Android Chrome
still don't expose a custom sound — there was no web-platform escape hatch
to wait for. An Android **notification channel**, by contrast, owns its
sound at the OS level and survives foreground, background, and killed app
states alike:

```kotlin
fun ensureCallNotificationChannel(context: Context) {
    val channel = NotificationChannel(
        context.getString(R.string.call_notification_channel_id),
        context.getString(R.string.call_notification_channel_name),
        NotificationManager.IMPORTANCE_HIGH,
    ).apply {
        enableVibration(true)
        setSound(bellCallSoundUri(context), /* ... */)
    }
    notificationManager(context)?.createNotificationChannel(channel)
}
```

*(trimmed — full source in
[`CallNotificationChannel.kt`](https://github.com/gatherloop/game-master-bell/blob/main/apps/receiver-android/app/src/main/java/com/gatherloop/gamemasterbell/receiver/fcm/CallNotificationChannel.kt).)*

Channels are immutable once created — changing the sound means shipping a
new channel id and deleting the old one on startup, which is why the file
also carries a small list of retired ids. The app itself wasn't written
from scratch: v1 had already built and shipped this exact receiver before
v2 replaced it with the PWA, so v3 resurrected it from the repo's git
history rather than rewriting it, and swapped only its push transport from
FCM-via-v1 back to FCM (below).

## Consolidating three repos back into one monorepo

v2 split the project into three repositories — bell app, API, receiver —
reasoning that independent lifecycles deserved independent CI, release
cadence, and access control. v3 undid that after one migration cycle
proved the split was pure overhead for a one-person, one-team project:

- **Every contract change became two coordinated PRs.** v2's own phase plan
  needed an explicit cross-repo dependency graph (this API PR before that
  bell-app PR); in one repo the same change is a single atomic commit.
- **The split invented a problem that then needed its own solution.**
  Because the API lived in a separate repo from `tables.json`, it had to
  fetch the file over HTTP from this repo's raw GitHub URL, cache it on
  disk, and refresh it hourly — a fetch/cache/timer/failure-handling module
  and three environment variables, all to work around a repo boundary.
  Back in one workspace, the API just imports `packages/shared` at build
  time and that entire module disappears. A table edit now reaches
  production by triggering one deploy, atomically, instead of "sometime in
  the next hour, if the fetch succeeds."
- **Access control never mattered in practice** — it was the same person
  working on every repo.

v1, notably, was already a monorepo — web app, function, and Android app
side by side — so the v3 layout isn't a novel idea, it's reverting to a
structure already proven earlier in the project's own history. The cost is
real but small: CI and deploy workflows need `paths:` filters so a
bell-web change doesn't rebuild the Android app or redeploy the API — a
few lines of YAML, paid once. See
[Repository Map](/reference/repository-map) for the layout that resulted.

## Stateless FCM topic fan-out, not a subscriptions table

v2's Web Push receiver needed server-side state: every staff phone's
`PushSubscription` is unique, so the API kept a SQLite table of
subscriptions and looped over it on every call — plus a staff passcode to
gate who could register one, since a PWA on a public URL has no install
ceremony to restrict who finds it.

FCM topics remove that entire layer. A device subscribes to the
`game-masters` topic client-side, on first launch, and the API just
addresses one message to the topic — it never learns which phones exist,
how many there are, or which one just left:

```ts
export function buildCallMessage(table: Table, topic: string, calledAt: string): Message {
  return {
    topic,
    android: { priority: "high" },
    data: { tableCode: table.code, floor: String(table.floor), number: table.number, calledAt },
  };
}
```

*(full source in
[`apps/api/src/fcm/service.ts`](https://github.com/gatherloop/game-master-bell/blob/main/apps/api/src/fcm/service.ts).)*
Adding or replacing a staff phone is now a client-side subscribe with
nothing to register on the server, and the message is deliberately
data-only rather than a `notification` payload — that's what forces
`onMessageReceived` to run in every app state, so the receiver always
builds the notification itself on the custom-sound channel instead of the
OS rendering a default one. The passcode retires along with the
subscriptions table it was gating; the APK's install ceremony (sideload,
not a public URL) restores the "who can receive calls" boundary without
it. This is also, in effect, a return to v1's shape — topic fan-out was
free and stateless there too, before v2's Web Push migration reintroduced
persistent state to solve a problem FCM topics don't have.

## A geofence that fails open

`FR-W10` blocks a bell tap with "Bel hanya bisa digunakan di dalam kafe"
when the device is confidently outside a configured radius around the
cafe — aimed at the case where someone rings a table from home off a
bookmarked or shared URL. The operative word is *confidently*: the check
only blocks when the great-circle distance minus the browser's own
reported accuracy still clears the radius, so a fuzzy indoor GPS fix (common
on upper floors, and typical for this cafe) never blocks a real customer.

```ts
export function isOutsideGeofence(fix: DeviceFix, fence: CafeGeofence): boolean {
  const distance = haversineMeters(fix, fence);
  return distance - fix.accuracy > fence.radiusMeters;
}
```

*(full source, including the fail-open default, in
[`apps/bell-web/src/lib/geofence.ts`](https://github.com/gatherloop/game-master-bell/blob/main/apps/bell-web/src/lib/geofence.ts).)*
Every other way the check can come out ambiguous — no cafe coordinates
configured, no Geolocation API in the browser, a denied permission prompt,
a timeout, or an imprecise fix — resolves to *allowed*, not *blocked*. That
asymmetry is deliberate: this is an advisory deterrent for a low-stakes
nuisance, not a security control (the coordinates are client-reported and
could be spoofed), so every failure mode is written to cost a customer
nothing rather than to close a gap. A geofence that occasionally lets
through a call from outside the cafe is an acceptable annoyance; one that
occasionally blocks a real customer standing at their table is not.

---

Taken together these five decisions share a pattern: each one is a
narrower, more specific choice than its label suggests ("no Firebase"
really meant "no Firebase infrastructure to operate"; "native app" really
meant "one notification channel"), and each was revisited at least once as
the project's real constraints — one small team, OEM-heavy Android
devices, a low-stakes threat model — became clearer than they were at the
start.
