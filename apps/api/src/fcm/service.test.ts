import { describe, expect, it, vi } from "vitest";
import type { Table } from "@game-master-bell/shared";
import { buildCallMessage, FirebaseCloudMessagingSender, type FcmLogger } from "./service.js";

const table: Table = {
  code: "2-05",
  floor: 2,
  number: "05",
  displayName: "Meja 05",
  active: true,
};

function fakeLogger(): FcmLogger {
  return { info: vi.fn(), warn: vi.fn() };
}

describe("buildCallMessage", () => {
  it("matches the PRD §3.2 data-only, high-priority topic shape", () => {
    const message = buildCallMessage(table, "game-masters", "2026-07-16T00:00:00.000Z");

    expect(message).toEqual({
      topic: "game-masters",
      android: { priority: "high" },
      data: {
        tableCode: "2-05",
        floor: "2",
        number: "05",
        calledAt: "2026-07-16T00:00:00.000Z",
      },
    });
  });

  it("stringifies every data field (FCM data values must be strings)", () => {
    const message = buildCallMessage(table, "game-masters", "2026-07-16T00:00:00.000Z");

    for (const value of Object.values(message.data ?? {})) {
      expect(typeof value).toBe("string");
    }
  });
});

describe("FirebaseCloudMessagingSender", () => {
  it("sends a call message to the configured topic and logs the message id", async () => {
    const logger = fakeLogger();
    const send = vi.fn().mockResolvedValue("projects/x/messages/abc123");

    const sender = new FirebaseCloudMessagingSender({ topic: "game-masters", logger, send });
    await sender.sendCall(table);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: "game-masters",
        android: { priority: "high" },
        data: expect.objectContaining({ tableCode: "2-05" }),
      }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      {
        tableCode: "2-05",
        topic: "game-masters",
        outcome: "sent",
        messageId: "projects/x/messages/abc123",
      },
      "fcm.send_result",
    );
  });

  it("defaults to the game-masters topic when none is configured", async () => {
    const logger = fakeLogger();
    const send = vi.fn().mockResolvedValue("message-id");

    const sender = new FirebaseCloudMessagingSender({ logger, send });
    await sender.sendCall(table);

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ topic: "game-masters" }));
  });

  it("logs a failure without throwing (one broker's outage must not fail the caller)", async () => {
    const logger = fakeLogger();
    const send = vi.fn().mockRejectedValue(new Error("messaging/server-unavailable"));

    const sender = new FirebaseCloudMessagingSender({ topic: "game-masters", logger, send });
    await expect(sender.sendCall(table)).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      {
        tableCode: "2-05",
        topic: "game-masters",
        outcome: "failed",
        error: "messaging/server-unavailable",
      },
      "fcm.send_result",
    );
  });

  it("throws at construction time when neither send nor serviceAccountPath is given", () => {
    expect(() => new FirebaseCloudMessagingSender({ logger: fakeLogger() })).toThrow(
      /requires either `send` or `serviceAccountPath`/,
    );
  });
});
