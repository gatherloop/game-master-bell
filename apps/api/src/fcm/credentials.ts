import { readFileSync } from "node:fs";

export interface FcmServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Loads and validates the Firebase service-account JSON backing FCM sends.
 * Used both to build the real `firebase-admin` credential and as the
 * startup check required by FR-A9 — the API must refuse to start with a
 * missing or malformed service account, not fail on the first call.
 */
export function loadServiceAccount(path: string): FcmServiceAccount {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (error) {
    throw new Error(
      `Failed to read FCM service account file at "${path}": ${(error as Error).message}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `FCM service account file at "${path}" is not valid JSON: ${(error as Error).message}`,
    );
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`FCM service account file at "${path}" must contain a JSON object`);
  }

  const { project_id, client_email, private_key } = parsed as Record<string, unknown>;
  if (
    typeof project_id !== "string" ||
    !project_id ||
    typeof client_email !== "string" ||
    !client_email ||
    typeof private_key !== "string" ||
    !private_key
  ) {
    throw new Error(
      `FCM service account file at "${path}" is missing required fields ` +
        `(project_id, client_email, private_key)`,
    );
  }

  return { projectId: project_id, clientEmail: client_email, privateKey: private_key };
}
