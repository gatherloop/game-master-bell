import { useCallback, useEffect, useRef, useState } from "react";
import { callGameMaster } from "../lib/callGameMaster";
import { checkGeofence } from "../lib/geofence";

/** Client-side cooldown after a successful call, per FR-W5. */
export const COOLDOWN_SECONDS = 60;

export type BellCallState =
  | { status: "idle" }
  | { status: "calling" }
  | { status: "cooldown"; secondsRemaining: number }
  | { status: "error" }
  | { status: "outside-area" };

/** Drives the bell tap → call API request → success/error/cooldown flow (FR-W4–W6). */
export function useBellCall(tableCode: string) {
  const [state, setState] = useState<BellCallState>({ status: "idle" });
  const intervalRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(intervalRef.current), []);

  const startCooldown = useCallback(() => {
    let remaining = COOLDOWN_SECONDS;
    setState({ status: "cooldown", secondsRemaining: remaining });
    intervalRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        window.clearInterval(intervalRef.current);
        setState({ status: "idle" });
      } else {
        setState({ status: "cooldown", secondsRemaining: remaining });
      }
    }, 1000);
  }, []);

  const call = useCallback(() => {
    setState((current) => {
      if (current.status === "calling" || current.status === "cooldown") {
        return current;
      }
      return { status: "calling" };
    });
  }, []);

  useEffect(() => {
    if (state.status !== "calling") return;

    let cancelled = false;
    // Gate on location first (FR-W10): a confident out-of-area fix blocks the
    // call; anything uncertain fails open and proceeds. See lib/geofence.ts.
    checkGeofence()
      .then((result) => {
        if (cancelled) return undefined;
        if (result === "outside") {
          setState({ status: "outside-area" });
          return undefined;
        }
        return callGameMaster(tableCode).then(() => {
          if (!cancelled) startCooldown();
        });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [state.status, tableCode, startCooldown]);

  return { state, call };
}
