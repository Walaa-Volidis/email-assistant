"use client";

import { useCallback, useSyncExternalStore } from "react";

const LOCAL_EVENT = "relay:storage";

function read(key: string, fallback: boolean): boolean {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value === "1";
  } catch {
    // Storage can be blocked (private mode, disabled site data).
    return fallback;
  }
}

/**
 * A per-viewer boolean preference in localStorage. Falls back to
 * `fallback` on the server and whenever storage is unavailable.
 */
export function useStoredFlag(key: string, fallback: boolean): [boolean, (value: boolean) => void] {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener("storage", onChange);
    window.addEventListener(LOCAL_EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(LOCAL_EVENT, onChange);
    };
  }, []);

  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  );

  const set = useCallback(
    (next: boolean) => {
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {}
      // The `storage` event only fires in other tabs; notify this one too.
      window.dispatchEvent(new Event(LOCAL_EVENT));
    },
    [key],
  );

  return [value, set];
}
