import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createCallHandler, type CallLogger, type MessagingClient } from "./handler.js";

function buildApp(messaging: MessagingClient, logger: CallLogger) {
  const app = express();
  app.use(express.json());
  // firebase-functions v2 onRequest hands every method to the same handler,
  // so `all` mirrors production shape more closely than a `post`-only route.
  app.all("/call", createCallHandler({ messaging, logger }));
  return app;
}

function fakeLogger(): CallLogger {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe("POST /call", () => {
  it("sends an FCM topic message for a known, active table", async () => {
    const send = vi.fn().mockResolvedValue("projects/x/messages/1");
    const logger = fakeLogger();
    const app = buildApp({ send }, logger);

    const res = await request(app).post("/call").send({ tableCode: "2-05" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(send).toHaveBeenCalledTimes(1);
    const [message] = send.mock.calls[0] as [Record<string, unknown>];
    expect(message).toMatchObject({
      topic: "game-masters",
      notification: {
        title: "Panggilan Game Master",
        body: "Meja 05 · Lantai 2 memanggil game master",
      },
      data: { tableCode: "2-05", floor: "2", number: "05" },
    });
    expect(typeof (message["data"] as Record<string, string>)["calledAt"]).toBe("string");
    expect(logger.info).toHaveBeenCalledWith(
      "call.sent",
      expect.objectContaining({ tableCode: "2-05" }),
    );
  });

  it("returns 404 for an unknown table code", async () => {
    const send = vi.fn();
    const app = buildApp({ send }, fakeLogger());

    const res = await request(app).post("/call").send({ tableCode: "9-99" });

    expect(res.status).toBe(404);
    expect(send).not.toHaveBeenCalled();
  });

  it("returns 404 for an inactive table code", async () => {
    const send = vi.fn();
    const app = buildApp({ send }, fakeLogger());

    const res = await request(app).post("/call").send({ tableCode: "2-06" });

    expect(res.status).toBe(404);
    expect(send).not.toHaveBeenCalled();
  });

  it("returns 400 for a missing tableCode", async () => {
    const send = vi.fn();
    const app = buildApp({ send }, fakeLogger());

    const res = await request(app).post("/call").send({});

    expect(res.status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed JSON body", async () => {
    const send = vi.fn();
    const app = buildApp({ send }, fakeLogger());

    const res = await request(app)
      .post("/call")
      .set("Content-Type", "application/json")
      .send("{not json");

    expect(res.status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it("returns 405 for non-POST methods", async () => {
    const send = vi.fn();
    const app = buildApp({ send }, fakeLogger());

    const res = await request(app).get("/call");

    expect(res.status).toBe(405);
    expect(res.headers["allow"]).toBe("POST");
    expect(send).not.toHaveBeenCalled();
  });

  it("returns 500 and logs when the FCM send fails", async () => {
    const send = vi.fn().mockRejectedValue(new Error("boom"));
    const logger = fakeLogger();
    const app = buildApp({ send }, logger);

    const res = await request(app).post("/call").send({ tableCode: "2-05" });

    expect(res.status).toBe(500);
    expect(logger.error).toHaveBeenCalledWith(
      "call.send_failed",
      expect.objectContaining({ tableCode: "2-05" }),
    );
  });
});
