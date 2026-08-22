import { useEffect, useRef } from "react";

export const LIVE_REFRESH_INTERVAL_MS = 10_000;

export function useLiveRefresh(
  refresh,
  { enabled = true, intervalMs = LIVE_REFRESH_INTERVAL_MS } = {}
) {
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return undefined;

    let inFlight = false;
    let cancelled = false;

    async function runRefresh() {
      if (cancelled || inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        await refreshRef.current?.();
      } finally {
        inFlight = false;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") runRefresh();
    }

    const timer = window.setInterval(runRefresh, Math.max(5_000, intervalMs));
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", runRefresh);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", runRefresh);
    };
  }, [enabled, intervalMs]);
}
