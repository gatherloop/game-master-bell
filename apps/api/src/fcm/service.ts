import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging, type Message } from "firebase-admin/messaging";
import type { Table } from "@game-master-bell/shared";
import { loadServiceAccount } from "./credentials.js";

export const DEFAULT_FCM_TOPIC = "game-masters";

export interface FcmLogger {
  info(data: Record<string, unknown>, message: string): void;
  warn(data: Record<string, unknown>, message: string): void;
}

export interface FcmSender {
  /** Sends a call notification to every device subscribed to the topic (FR-A2v3). */
  sendCall(table: Table): Promise<void>;
}

export type FcmMessageSender = (message: Message) => Promise<string>;

export interface FirebaseCloudMessagingSenderOptions {
  /** Topic every receiver app subscribes to; defaults to `game-masters`. */
  topic?: string;
  logger: FcmLogger;
  /** Path to the Firebase service-account JSON. Required unless `send` is injected. */
  serviceAccountPath?: string;
  /** Injectable for tests; defaults to a real `firebase-admin` Messaging.send. */
  send?: FcmMessageSender;
}

/**
 * Builds the data-only, high-priority topic message (PRD §3.2). Data-only
 * (no `notification` block) guarantees `onMessageReceived` runs in every
 * app state, so the receiver always composes the notification itself on
 * the custom-sound channel; `android.priority: "high"` is required to
 * punch through Doze. All `data` values must be strings per the FCM API.
 */
export function buildCallMessage(table: Table, topic: string, calledAt: string): Message {
  return {
    topic,
    android: { priority: "high" },
    data: {
      tableCode: table.code,
      floor: String(table.floor),
      number: table.number,
      calledAt,
    },
  };
}

function defaultMessageSender(serviceAccountPath: string): FcmMessageSender {
  const serviceAccount = loadServiceAccount(serviceAccountPath);
  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: serviceAccount.projectId,
        clientEmail: serviceAccount.clientEmail,
        privateKey: serviceAccount.privateKey,
      }),
    });
  const messaging = getMessaging(app);
  return (message) => messaging.send(message);
}

/**
 * Sends a call notification to the `game-masters` FCM topic — a stateless
 * fan-out to every subscribed receiver device (PRD §2). One send failure is
 * logged (FR-A8) and does not throw, matching `WebPushSender`'s
 * fire-and-log stance so a `/call` fan-out that also sends Web Push isn't
 * taken down by one broker's outage (see phase 5).
 */
export class FirebaseCloudMessagingSender implements FcmSender {
  private readonly send: FcmMessageSender;
  private readonly topic: string;
  private readonly logger: FcmLogger;

  constructor({
    topic = DEFAULT_FCM_TOPIC,
    logger,
    serviceAccountPath,
    send,
  }: FirebaseCloudMessagingSenderOptions) {
    if (!send && !serviceAccountPath) {
      throw new Error(
        "FirebaseCloudMessagingSender requires either `send` or `serviceAccountPath`",
      );
    }
    this.topic = topic;
    this.logger = logger;
    this.send = send ?? defaultMessageSender(serviceAccountPath!);
  }

  async sendCall(table: Table): Promise<void> {
    const message = buildCallMessage(table, this.topic, new Date().toISOString());

    try {
      const messageId = await this.send(message);
      this.logger.info(
        { tableCode: table.code, topic: this.topic, outcome: "sent", messageId },
        "fcm.send_result",
      );
    } catch (error) {
      this.logger.warn(
        {
          tableCode: table.code,
          topic: this.topic,
          outcome: "failed",
          error: error instanceof Error ? error.message : String(error),
        },
        "fcm.send_result",
      );
    }
  }
}
