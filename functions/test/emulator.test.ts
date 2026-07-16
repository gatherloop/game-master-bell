import { describe, expect, it } from "vitest";

// Run against a live `firebase emulators:start --only functions` (see the
// `test:emulator` script), which starts the *real* deployed `call` function
// over HTTP. It intentionally never exercises the messaging-send path (that
// needs real Google credentials) — it proves the parts that only the
// emulator can: HTTP routing and body parsing on the actual deployed
// handler. The `--project` flag on the emulator script must match PROJECT_ID
// below so the function URL resolves.
const PROJECT_ID = "demo-game-master-bell";
const REGION = "us-central1";
const BASE_URL = `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}/call`;

describe("call function (Firebase emulator)", () => {
  it("returns 404 for an unknown table code", async () => {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableCode: "9-99" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns 400 for a body missing tableCode", async () => {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 for syntactically invalid JSON", async () => {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });

    expect(res.status).toBe(400);
  });

  it("returns 405 for non-POST methods", async () => {
    const res = await fetch(BASE_URL, { method: "GET" });

    expect(res.status).toBe(405);
  });

  // Note: the Functions emulator forces permissive CORS (all origins) for
  // local development regardless of the `cors` option passed to onRequest —
  // see functionsEmulator.js's FIREBASE_DEBUG_FEATURES.enableCors. So this
  // only proves the CORS middleware is wired up, not that FR-F4's origin
  // allowlist is enforced; that only takes effect in a real deployment.
  it("answers CORS preflight requests", async () => {
    const res = await fetch(BASE_URL, {
      method: "OPTIONS",
      headers: {
        Origin: "https://gatherloop.github.io",
        "Access-Control-Request-Method": "POST",
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBeTruthy();
  });
});
