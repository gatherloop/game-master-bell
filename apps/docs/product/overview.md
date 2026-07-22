# Product Overview

## The problem

At a board game cafe, customers regularly need a game master: someone to
explain the rules of an unfamiliar game, recommend something for their group,
or settle a rules dispute mid-game. On a busy floor, the only way to get one
has been to physically get up, look around, and go find a staff member — which
interrupts the game, and doesn't scale once the cafe is full.

## What Game Master Bell does

Game Master Bell turns a table into a call button. Each table has a printed
QR code; scanning it opens a small web page scoped to that exact table, with
one thing on it — a bell. Tap the bell, and every on-duty game master's phone
rings, immediately, with the table and floor.

**The flow, end to end:**

1. A customer sits down and scans the QR code sticker on their table.
2. The code opens the bell web app in their phone's browser, pre-scoped to
   that table (floor + table number) — no app install, no account, no login.
3. They tap the animated bell. The screen confirms:
   **"Game master akan segera datang membantumu"** ("A game master will be
   with you shortly").
4. Every staff phone running the receiver app rings immediately, with a
   distinctive sound and the table/floor shown in the notification.
5. A game master walks over and helps.

That's the whole interaction — no ordering, no accounts, no chat. It exists
to solve exactly one problem: get a human's attention, fast, without the
customer having to leave their seat or the game masters having to patrol.

## Why it's built this way

A few product choices shape everything else on this site:

- **Zero install for the customer.** The bell is a web page, not an app —
  scan and tap. Every phone with a camera and a browser already supports it.
- **The call has to be unmistakable for staff.** A generic notification chime
  gets tuned out on a busy floor next to chat pings and app promos, so the
  alert on the game master's side needed a sound nobody could mistake for
  anything else — see [Features](/product/features) and
  [Engineering Decisions](/engineering/engineering-decisions) for why that
  turned out to be the hardest part of the system.
- **Low stakes, low friction.** There's no login, no payment, and no
  customer data collected — physical presence in the cafe (to see the QR
  code, or an in-cafe device location) is the only gate, which keeps the
  product simple by design (see the geofence in
  [Features](/product/features)).

## Who this site is for

- **Curious users / cafe operators** — this page and [Features](/product/features)
  cover what the product is and does, in plain language.
- **New engineers** — see [Architecture](/engineering/architecture) and
  [Getting Started](/engineering/getting-started) for the stack and how to
  run it.
- **Recruiters / reviewers** — see
  [Engineering Decisions](/engineering/engineering-decisions) for the
  interesting trade-offs behind the product.
