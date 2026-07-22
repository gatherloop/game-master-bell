/**
 * Client-side geofence for the bell (advisory, fail-open). The table URL is a
 * plain bookmarkable link, so a customer can reopen it from home and ring a
 * false call; this gate blocks a tap only when the browser reports a
 * *confident* location outside the cafe radius. A denied prompt, missing
 * Geolocation API, timeout, or fuzzy fix all fall through to "allowed", so a
 * real customer is never stuck.
 *
 * This deters casual off-site ringing without pretending to be tamper-proof —
 * the coordinates come from client JS and could be spoofed. That trade-off
 * matches the low-stakes threat model in docs/PRD-v3.md §3.2 (worst case is a
 * nuisance, not a security event).
 */

export interface CafeGeofence {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

/** Generous default: absorbs indoor / upper-floor GPS error (often 30–100m). */
const DEFAULT_RADIUS_METERS = 150;

function parseNumericEnv(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Reads the cafe geofence from build-time env (`vite build` bakes `VITE_*` in).
 * Returns null when latitude or longitude is unset, which disables the check
 * entirely — the bell rings as before — so the feature stays dormant until the
 * owner fills in real coordinates.
 */
export function getCafeGeofence(): CafeGeofence | null {
  const latitude = parseNumericEnv(import.meta.env.VITE_CAFE_LATITUDE);
  const longitude = parseNumericEnv(import.meta.env.VITE_CAFE_LONGITUDE);
  if (latitude === undefined || longitude === undefined) return null;

  const radius = parseNumericEnv(import.meta.env.VITE_CAFE_RADIUS_METERS);
  return {
    latitude,
    longitude,
    radiusMeters: radius !== undefined && radius > 0 ? radius : DEFAULT_RADIUS_METERS,
  };
}

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in metres between two lat/lng points (haversine). */
export function haversineMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface DeviceFix {
  latitude: number;
  longitude: number;
  /** Reported accuracy radius in metres (`GeolocationCoordinates.accuracy`). */
  accuracy: number;
}

/**
 * Decides whether a fix is *confidently* outside the fence. Fail-open on
 * uncertainty: only "outside" when even the nearest edge of the reported
 * accuracy circle clears the radius, so a fuzzy indoor fix (common on upper
 * floors) doesn't block a customer who is actually inside.
 */
export function isOutsideGeofence(fix: DeviceFix, fence: CafeGeofence): boolean {
  const distance = haversineMeters(fix, fence);
  return distance - fix.accuracy > fence.radiusMeters;
}

const GEOLOCATION_TIMEOUT_MS = 8000;

/**
 * Promise wrapper over `navigator.geolocation.getCurrentPosition`. Resolves
 * with a {@link DeviceFix} on success, or null when a location can't be
 * obtained (no API, permission denied, timeout, position error) — callers
 * treat null as fail-open.
 */
export function getDeviceFix(): Promise<DeviceFix | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 0 },
    );
  });
}

export type GeofenceResult = "allowed" | "outside";

/**
 * Runs the full geofence gate for one bell tap. Returns "outside" only on a
 * confident out-of-area fix; everything else (feature disabled, no fix
 * obtainable, or inside the radius) returns "allowed".
 */
export async function checkGeofence(): Promise<GeofenceResult> {
  const fence = getCafeGeofence();
  if (!fence) return "allowed";

  const fix = await getDeviceFix();
  if (!fix) return "allowed"; // fail-open: couldn't determine location

  return isOutsideGeofence(fix, fence) ? "outside" : "allowed";
}
