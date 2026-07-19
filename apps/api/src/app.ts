import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { findTableByCode, type Table } from "@game-master-bell/shared";
import { CallRequestSchema } from "./call/schema.js";
import type { FcmSender } from "./fcm/service.js";
import type { PushSender } from "./push/service.js";
import { isValidPasscode } from "./subscriptions/auth.js";
import { SubscribeRequestSchema, UnsubscribeRequestSchema } from "./subscriptions/schema.js";
import type { SubscriptionStore } from "./subscriptions/store.js";

export interface TablesLookup {
  findByCode(code: string): Table | undefined;
}

export interface BuildAppOptions {
  tablesStore?: TablesLookup;
  subscriptionStore?: SubscriptionStore;
  staffPasscode?: string;
  vapidPublicKey?: string;
  pushSender?: PushSender;
  fcmSender?: FcmSender;
  corsOrigins?: string[];
}

const defaultCorsOrigins = ["https://gatherloop.github.io"];

/** Table data is compiled in from `@game-master-bell/shared` (PRD-v3 phase 3) — no sync, no cache. */
const defaultTablesStore: TablesLookup = {
  findByCode: findTableByCode,
};

const emptySubscriptionStore: SubscriptionStore = {
  upsert: () => {},
  remove: () => {},
  all: () => [],
};

const noopPushSender: PushSender = {
  sendToAll: async () => {},
};

const noopFcmSender: FcmSender = {
  sendCall: async () => {},
};

export function buildApp({
  tablesStore = defaultTablesStore,
  subscriptionStore = emptySubscriptionStore,
  staffPasscode,
  vapidPublicKey,
  pushSender = noopPushSender,
  fcmSender = noopFcmSender,
  corsOrigins = defaultCorsOrigins,
}: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: true });

  void app.register(cors, { origin: corsOrigins });

  app.get("/healthz", async () => {
    return { status: "ok" };
  });

  app.get("/vapid-key", async (_request, reply) => {
    if (!vapidPublicKey) {
      app.log.error("vapid_key.not_configured");
      return reply.status(500).send({ error: "VAPID public key not configured" });
    }
    return { publicKey: vapidPublicKey };
  });

  app.post("/subscriptions", async (request, reply) => {
    const parsed = SubscribeRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      app.log.warn({ issues: parsed.error.issues }, "subscriptions.invalid_body");
      return reply.status(400).send({ error: "Invalid request body" });
    }

    if (!isValidPasscode(parsed.data.passcode, staffPasscode)) {
      app.log.warn("subscriptions.invalid_passcode");
      return reply.status(401).send({ error: "Invalid passcode" });
    }

    subscriptionStore.upsert(parsed.data.subscription);
    app.log.info({ endpoint: parsed.data.subscription.endpoint }, "subscriptions.upserted");
    return reply.status(200).send({ ok: true });
  });

  app.delete("/subscriptions", async (request, reply) => {
    const parsed = UnsubscribeRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      app.log.warn({ issues: parsed.error.issues }, "subscriptions.invalid_body");
      return reply.status(400).send({ error: "Invalid request body" });
    }

    if (!isValidPasscode(parsed.data.passcode, staffPasscode)) {
      app.log.warn("subscriptions.invalid_passcode");
      return reply.status(401).send({ error: "Invalid passcode" });
    }

    subscriptionStore.remove(parsed.data.endpoint);
    app.log.info({ endpoint: parsed.data.endpoint }, "subscriptions.removed");
    return reply.status(200).send({ ok: true });
  });

  app.post("/call", async (request, reply) => {
    const parsed = CallRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      app.log.warn({ issues: parsed.error.issues }, "call.invalid_body");
      return reply.status(400).send({ error: "Invalid request body" });
    }

    const table = tablesStore.findByCode(parsed.data.tableCode);
    if (!table) {
      app.log.warn({ tableCode: parsed.data.tableCode }, "call.unknown_table");
      return reply.status(404).send({ error: "Unknown table" });
    }

    app.log.info({ tableCode: table.code }, "call.received");
    // FR-A2v3: fan out over both channels; each sender already logs its own
    // outcome (FR-A8). Promise.allSettled ensures one channel's rejection
    // can never fail the other, even though both senders are designed to
    // catch and log internally rather than throw.
    await Promise.allSettled([pushSender.sendToAll(table), fcmSender.sendCall(table)]);
    return reply.status(200).send({ ok: true });
  });

  return app;
}
