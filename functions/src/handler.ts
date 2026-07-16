import type { Request, Response } from "express";
import type { Message } from "firebase-admin/messaging";
import { CallRequestSchema, findTableByCode } from "@game-master-bell/shared";
import { buildCallMessage } from "./message.js";

export interface MessagingClient {
  send(message: Message): Promise<string>;
}

export interface CallLogger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

export interface CallHandlerDeps {
  messaging: MessagingClient;
  logger: CallLogger;
}

export function createCallHandler({ messaging, logger }: CallHandlerDeps) {
  return async function handleCall(req: Request, res: Response): Promise<void> {
    if (req.method !== "POST") {
      res.set("Allow", "POST");
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const parsed = CallRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn("call.invalid_body", { issues: parsed.error.issues });
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const table = findTableByCode(parsed.data.tableCode);
    if (!table) {
      logger.warn("call.unknown_table", { tableCode: parsed.data.tableCode });
      res.status(404).json({ error: "Unknown table" });
      return;
    }

    try {
      const messageId = await messaging.send(buildCallMessage(table));
      logger.info("call.sent", {
        tableCode: table.code,
        floor: table.floor,
        number: table.number,
        messageId,
      });
      res.status(200).json({ ok: true });
    } catch (error) {
      logger.error("call.send_failed", {
        tableCode: table.code,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Failed to send notification" });
    }
  };
}
