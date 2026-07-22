/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL of the deployed call API's `/call` endpoint, e.g. "https://bell-api.gatherloop.id/call". */
  readonly VITE_CALL_API_URL: string;
  /** Cafe latitude (decimal degrees) for the client-side geofence; blank disables the check. See src/lib/geofence.ts. */
  readonly VITE_CAFE_LATITUDE?: string;
  /** Cafe longitude (decimal degrees) for the client-side geofence; blank disables the check. */
  readonly VITE_CAFE_LONGITUDE?: string;
  /** Allowed geofence radius in metres (default 150 when unset). */
  readonly VITE_CAFE_RADIUS_METERS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
