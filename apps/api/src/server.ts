import pino from "pino";
import { buildApp } from "./app.js";
import { FirebaseCloudMessagingSender } from "./fcm/service.js";
import { WebPushSender } from "./push/service.js";
import { SqliteSubscriptionStore } from "./subscriptions/store.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";
const subscriptionsDbPath = process.env.SUBSCRIPTIONS_DB_PATH ?? "./data/subscriptions.db";
const corsOrigins = process.env.CORS_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const bootstrapLogger = pino();

async function main() {
  const staffPasscode = requireEnv("STAFF_PASSCODE");
  const vapidPublicKey = requireEnv("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = requireEnv("VAPID_PRIVATE_KEY");
  const vapidSubject = requireEnv("VAPID_SUBJECT");

  const fcmServiceAccountPath = requireEnv("FCM_SERVICE_ACCOUNT_PATH");
  const fcmTopic = process.env.FCM_TOPIC ?? "game-masters";
  // FR-A9: refuse to start with missing/malformed FCM credentials, same
  // stance as the VAPID vars above. Constructing the sender exercises
  // firebase-admin's own credential parsing, so a malformed private key
  // fails at startup too, not just missing JSON fields.
  const fcmSender = new FirebaseCloudMessagingSender({
    topic: fcmTopic,
    serviceAccountPath: fcmServiceAccountPath,
    logger: bootstrapLogger,
  });

  const subscriptionStore = new SqliteSubscriptionStore(subscriptionsDbPath);

  const pushSender = new WebPushSender({
    vapid: { publicKey: vapidPublicKey, privateKey: vapidPrivateKey, subject: vapidSubject },
    subscriptionStore,
    logger: bootstrapLogger,
  });

  const app = buildApp({
    subscriptionStore,
    staffPasscode,
    vapidPublicKey,
    pushSender,
    fcmSender,
    corsOrigins,
  });

  await app.listen({ port, host });
}

main().catch((error: unknown) => {
  bootstrapLogger.error(error);
  process.exit(1);
});
