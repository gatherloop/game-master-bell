import { initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { createCallHandler, type CallLogger } from "./handler.js";

initializeApp();

// GitHub Pages origin (production) plus localhost (Vite dev server) per FR-F4.
const ALLOWED_ORIGINS = [
  "https://gatherloop.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const callLogger: CallLogger = {
  info: (message, data) => logger.info(message, data),
  warn: (message, data) => logger.warn(message, data),
  error: (message, data) => logger.error(message, data),
};

export const call = onRequest(
  { cors: ALLOWED_ORIGINS },
  createCallHandler({
    messaging: { send: (message) => getMessaging().send(message) },
    logger: callLogger,
  }),
);
