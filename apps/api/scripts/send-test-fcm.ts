import type { Table } from "@game-master-bell/shared";
import { FirebaseCloudMessagingSender } from "../src/fcm/service.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const serviceAccountPath = requireEnv("FCM_SERVICE_ACCOUNT_PATH");
const topic = process.env.FCM_TOPIC ?? "game-masters";

const testTable: Table = {
  code: "2-05",
  floor: 2,
  number: "05",
  displayName: "Meja 05 (test)",
  active: true,
};

const sender = new FirebaseCloudMessagingSender({
  topic,
  serviceAccountPath,
  logger: {
    info: (data, message) => console.log(message, data),
    warn: (data, message) => console.warn(message, data),
  },
});

console.log(`Sending a test call message to FCM topic "${topic}"...`);
await sender.sendCall(testTable);
console.log(
  "Sent. Check the Firebase console (Cloud Messaging → Reporting) or a device subscribed to the topic.",
);
