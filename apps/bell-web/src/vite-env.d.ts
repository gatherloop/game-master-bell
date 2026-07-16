/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the deployed notify Cloud Function, e.g. "https://us-central1-<project>.cloudfunctions.net/call". */
  readonly VITE_NOTIFY_FUNCTION_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
