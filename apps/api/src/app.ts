import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { findTableByCode, type Table } from "@game-master-bell/shared";
import { CallRequestSchema } from "./call/schema.js";
import type { FcmSender } from "./fcm/service.js";

export interface TablesLookup {
  findByCode(code: string): Table | undefined;
}

export interface BuildAppOptions {
  tablesStore?: TablesLookup;
  fcmSender?: FcmSender;
  corsOrigins?: string[];
}

const defaultCorsOrigins = ["https://gatherloop.github.io"];

/** Table data is compiled in from `@game-master-bell/shared` (PRD-v3 phase 3) — no sync, no cache. */
const defaultTablesStore: TablesLookup = {
  findByCode: findTableByCode,
};

const noopFcmSender: FcmSender = {
  sendCall: async () => {},
};

export function buildApp({
  tablesStore = defaultTablesStore,
  fcmSender = noopFcmSender,
  corsOrigins = defaultCorsOrigins,
}: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: true });

  void app.register(cors, { origin: corsOrigins });

  app.get("/healthz", async () => {
    return { status: "ok" };
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
    // FR-A2v3: send outcome (message id or error) is logged by fcmSender itself (FR-A8).
    await fcmSender.sendCall(table);
    return reply.status(200).send({ ok: true });
  });

  return app;
}
