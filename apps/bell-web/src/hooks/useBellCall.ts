import { useCallback, useEffect, useRef, useState } from "react";
import { callGameMaster } from "../lib/callGameMaster";

/** Client-side cooldown after a successful call, per FR-W5. */
export const COOLDOWN_SECONDS = 60;

export type BellCallState =
  | { status: "idle" }
  | { status: "calling" }
  | { status: "cooldown"; secondsRemaining: number }
  | { status: "error" };

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
    callGameMaster(tableCode)
      .then(() => {
        if (!cancelled) startCooldown();
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
