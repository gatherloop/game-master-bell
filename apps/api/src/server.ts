import pino from "pino";
import { buildApp } from "./app.js";
import { FirebaseCloudMessagingSender } from "./fcm/service.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";
const corsOrigins = process.env.CORS_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const bootstrapLogger = pino();

async function main() {
  const fcmServiceAccountPath = requireEnv("FCM_SERVICE_ACCOUNT_PATH");
  const fcmTopic = process.env.FCM_TOPIC ?? "game-masters";
  // FR-A9: refuse to start with missing/malformed FCM credentials.
  // Constructing the sender exercises firebase-admin's own credential
  // parsing, so a malformed private key fails at startup too, not just
  // missing JSON fields.
  const fcmSender = new FirebaseCloudMessagingSender({
    topic: fcmTopic,
    serviceAccountPath: fcmServiceAccountPath,
    logger: bootstrapLogger,
  });

  const app = buildApp({ fcmSender, corsOrigins });

  await app.listen({ port, host });
}

main().catch((error: unknown) => {
  bootstrapLogger.error(error);
  process.exit(1);
});
