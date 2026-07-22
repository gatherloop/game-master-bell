# Features

## QR-per-table bell

Every table has its own QR code sticker encoding a stable table code (e.g.
`2-05` → floor 2, table 05). Scanning it opens the bell web app pre-scoped to
that table — the customer never types or selects anything. Table metadata
(display name, floor label) can be edited independently of the code, so
renaming or relabeling a table never means reprinting the sticker.

Tapping the bell plays a ring animation and puts the bell into a short
cooldown (with a visible countdown) to prevent accidental repeat taps. If the
call fails — no network, API unreachable — the app shows **"Panggilan gagal,
coba lagi"** ("Call failed, try again") and lets the customer retry
immediately.

## Custom-sound alert that survives a killed app

The single most important requirement on the receiving end: a bell call has
to sound unmistakably different from every other notification on a game
master's phone, and it has to fire whether their receiver app is open,
backgrounded, or fully killed.

That rules out a generic push notification — mobile browsers and most push
transports can't set a custom system sound, so a "call" would ring with the
same default chime as a chat message and get tuned out on a busy floor. The
receiver is instead a native Android app with its own notification channel
carrying a bundled bell sound (`res/raw/bell_call.ogg`, channel **"Panggilan
Meja"**), delivered by a high-priority, data-only FCM push that wakes the app
from a killed state to build the notification itself — so the sound plays no
matter what state the phone was in when the call came in. Repeated calls each
get a unique notification id, so a second call while the first is unread
stacks and re-alerts instead of silently replacing it.

See [Engineering Decisions](/engineering/engineering-decisions) for why this
needed a native app instead of a web push.

## Advisory in-cafe geofence

Table URLs are simple and shareable, which means a customer could in theory
bookmark or forward one and ring the bell from outside the cafe. When a cafe
location is configured, tapping the bell first checks the device's reported
location and blocks the call — showing **"Bel hanya bisa digunakan di dalam
kafe"** ("The bell can only be used inside the cafe") — only when the phone
is confidently outside the configured radius (distance minus the location's
own accuracy has to exceed the radius, so a fuzzy fix doesn't block a real
customer).

It's explicitly a deterrent, not a security boundary — client-reported
coordinates can be spoofed — so the check is **fail-open**: no cafe location
configured, no Geolocation support, a denied permission prompt, a timeout, or
an imprecise fix all let the call go through rather than block a legitimate
customer over a technicality. See
[Engineering Decisions](/engineering/engineering-decisions) for the reasoning
behind that trade-off.

## Per-device recent-calls list

The receiver app's status screen keeps a locally stored list of the calls
that device has received — table, floor, and time — so a game master can
glance back at what just came in without relying on notification-shade
history. It also surfaces whether notification permission is granted and
whether the device is subscribed to receive calls, so setup problems are
visible instead of silent.

## Indonesian UI

Both the customer-facing bell and the staff-facing receiver are written in
Indonesian throughout — status messages, confirmations, error states, and
the notification channel name all match the cafe's day-to-day language, since
that's who actually uses the product. This documentation site is in English
for an engineering/recruiting audience, but the product itself is not
translated or localized — it's built for one cafe, in one language.
