import { describe, expect, it, vi } from "vitest";
import type { Table } from "@game-master-bell/shared";
import { buildApp, type TablesLookup } from "./app.js";
import type { FcmSender } from "./fcm/service.js";

const activeTable: Table = {
  code: "2-05",
  floor: 2,
  number: "05",
  displayName: "Meja 05",
  active: true,
};

function fakeTablesStore(tables: Table[] = [activeTable]): TablesLookup {
  return {
    findByCode: (code) => tables.find((table) => table.code === code && table.active),
  };
}

describe("CORS", () => {
  it("allows a configured origin", async () => {
    const app = buildApp({ corsOrigins: ["https://gatherloop.github.io"] });

    const response = await app.inject({
      method: "GET",
      url: "/healthz",
      headers: { origin: "https://gatherloop.github.io" },
    });

    expect(response.headers["access-control-allow-origin"]).toBe("https://gatherloop.github.io");
  });

  it("rejects an origin that is not configured", async () => {
    const app = buildApp({ corsOrigins: ["https://gatherloop.github.io"] });

    const response = await app.inject({
      method: "GET",
      url: "/healthz",
      headers: { origin: "https://evil.example" },
    });

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("allows the default gatherloop.github.io origin out of the box", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/healthz",
      headers: { origin: "https://gatherloop.github.io" },
    });

    expect(response.headers["access-control-allow-origin"]).toBe("https://gatherloop.github.io");
  });
});

describe("GET /healthz", () => {
  it("returns 200 with an ok status", async () => {
    const app = buildApp();

    const response = await app.inject({ method: "GET", url: "/healthz" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });
});

describe("POST /call", () => {
  it("returns 200 for a known, active table", async () => {
    const app = buildApp({ tablesStore: fakeTablesStore() });

    const response = await app.inject({
      method: "POST",
      url: "/call",
      payload: { tableCode: "2-05" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });

  it("fans the call out via the FCM sender for a known, active table", async () => {
    const fcmSender: FcmSender = { sendCall: vi.fn().mockResolvedValue(undefined) };
    const app = buildApp({ tablesStore: fakeTablesStore(), fcmSender });

    const response = await app.inject({
      method: "POST",
      url: "/call",
      payload: { tableCode: "2-05" },
    });

    expect(response.statusCode).toBe(200);
    expect(fcmSender.sendCall).toHaveBeenCalledWith(activeTable);
  });

  it("does not fan out to FCM for an unknown table code", async () => {
    const fcmSender: FcmSender = { sendCall: vi.fn().mockResolvedValue(undefined) };
    const app = buildApp({ tablesStore: fakeTablesStore(), fcmSender });

    await app.inject({ method: "POST", url: "/call", payload: { tableCode: "9-99" } });

    expect(fcmSender.sendCall).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown table code", async () => {
    const app = buildApp({ tablesStore: fakeTablesStore() });

    const response = await app.inject({
      method: "POST",
      url: "/call",
      payload: { tableCode: "9-99" },
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns 404 for an inactive table code", async () => {
    const inactiveTable: Table = { ...activeTable, code: "2-06", active: false };
    const app = buildApp({ tablesStore: fakeTablesStore([inactiveTable]) });

    const response = await app.inject({
      method: "POST",
      url: "/call",
      payload: { tableCode: "2-06" },
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns 400 for a missing tableCode", async () => {
    const app = buildApp({ tablesStore: fakeTablesStore() });

    const response = await app.inject({ method: "POST", url: "/call", payload: {} });

    expect(response.statusCode).toBe(400);
  });

  it("returns 400 for a malformed JSON body", async () => {
    const app = buildApp({ tablesStore: fakeTablesStore() });

    const response = await app.inject({
      method: "POST",
      url: "/call",
      headers: { "content-type": "application/json" },
      payload: "{not json",
    });

    expect(response.statusCode).toBe(400);
  });
});
