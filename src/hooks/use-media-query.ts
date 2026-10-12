"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribes to a media query. The server snapshot is `serverDefault`, so
 * SSR renders the desktop layout and small screens switch after hydration.
 */
export function useMediaQuery(query: string, serverDefault = true): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverDefault,
  );
}
