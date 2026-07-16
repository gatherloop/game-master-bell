import { findTableByCode, type Table } from "@game-master-bell/shared";

export type Route = { kind: "home" } | { kind: "table"; table: Table } | { kind: "not-found" };

/** Strips the Vite base path (e.g. "/game-master-bell/") off a pathname, keeping the leading slash. */
function stripBase(pathname: string, base: string): string {
  if (base !== "/" && pathname.startsWith(base)) {
    return `/${pathname.slice(base.length)}`;
  }
  return pathname;
}

export function resolveRoute(pathname: string, base: string): Route {
  const relative = stripBase(pathname, base);
  const segments = relative.split("/").filter(Boolean);

  if (segments.length === 0) {
    return { kind: "home" };
  }

  if (segments[0] === "t" && segments[1]) {
    const table = findTableByCode(decodeURIComponent(segments[1]));
    return table ? { kind: "table", table } : { kind: "not-found" };
  }

  return { kind: "not-found" };
}
