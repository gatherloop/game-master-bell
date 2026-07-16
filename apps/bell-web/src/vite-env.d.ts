/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL of the deployed call API's `/call` endpoint, e.g. "https://bell-api.gatherloop.id/call". */
  readonly VITE_CALL_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
