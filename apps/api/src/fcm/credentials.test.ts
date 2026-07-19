import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadServiceAccount } from "./credentials.js";

const dir = mkdtempSync(join(tmpdir(), "fcm-credentials-test-"));
let counter = 0;

function writeJson(content: unknown): string {
  const path = join(dir, `service-account-${counter++}.json`);
  writeFileSync(path, typeof content === "string" ? content : JSON.stringify(content));
  return path;
}

describe("loadServiceAccount", () => {
  it("returns the projectId/clientEmail/privateKey from a valid file", () => {
    const path = writeJson({
      project_id: "gatherloop-bell",
      client_email: "fcm-sender@gatherloop-bell.iam.gserviceaccount.com",
      private_key: "-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n",
      type: "service_account",
    });

    expect(loadServiceAccount(path)).toEqual({
      projectId: "gatherloop-bell",
      clientEmail: "fcm-sender@gatherloop-bell.iam.gserviceaccount.com",
      privateKey: "-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n",
    });
  });

  it("throws when the file does not exist", () => {
    expect(() => loadServiceAccount(join(dir, "does-not-exist.json"))).toThrow(
      /Failed to read FCM service account file/,
    );
  });

  it("throws when the file is not valid JSON", () => {
    const path = writeJson("not json");
    expect(() => loadServiceAccount(path)).toThrow(/is not valid JSON/);
  });

  it("throws when the JSON is not an object", () => {
    const path = writeJson(["nope"]);
    expect(() => loadServiceAccount(path)).toThrow(/must contain a JSON object/);
  });

  it.each(["project_id", "client_email", "private_key"])(
    "throws when %s is missing",
    (missingField) => {
      const full: Record<string, string> = {
        project_id: "gatherloop-bell",
        client_email: "fcm-sender@gatherloop-bell.iam.gserviceaccount.com",
        private_key: "fake-key",
      };
      delete full[missingField];
      const path = writeJson(full);

      expect(() => loadServiceAccount(path)).toThrow(/missing required fields/);
    },
  );
});
