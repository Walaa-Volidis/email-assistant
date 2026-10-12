"use client";

import { useEffect, useRef } from "react";

import { isTypingTarget } from "@/lib/keyboard";

export type Hotkey = {
  /**
   * `"j"`, `"?"`, `"Escape"`, `"mod+k"` (⌘ on macOS, Ctrl elsewhere),
   * `"mod+Enter"`, or a two-key sequence such as `"g i"`.
   */
  keys: string;
  handler: (event: KeyboardEvent) => void;
  /** Fire even while focus is in a text field. */
  allowInInput?: boolean;
};

const SEQUENCE_TIMEOUT_MS = 900;

function normalize(event: KeyboardEvent): string {
  const mod = event.metaKey || event.ctrlKey;
  const key = event.key.length === 1 && mod ? event.key.toLowerCase() : event.key;
  return mod ? `mod+${key}` : key;
}

/**
 * Global keyboard shortcuts. Bindings are read through a ref, so callers can
 * pass a fresh array every render without re-subscribing.
 */
export function useHotkeys(bindings: Hotkey[], enabled = true): void {
  const bindingsRef = useRef(bindings);
  useEffect(() => {
    bindingsRef.current = bindings;
  });

  useEffect(() => {
    if (!enabled) return;
    let pending: { key: string; at: number } | null = null;

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing) return;
      const typing = isTypingTarget(event.target);
      const pressed = normalize(event);

      if (pending && Date.now() - pending.at < SEQUENCE_TIMEOUT_MS && !typing) {
        const sequence = `${pending.key} ${pressed}`;
        pending = null;
        const match = bindingsRef.current.find((b) => b.keys === sequence);
        if (match) {
          event.preventDefault();
          match.handler(event);
          return;
        }
      }

      const match = bindingsRef.current.find(
        (b) => b.keys === pressed && (!typing || b.allowInInput),
      );
      if (match) {
        event.preventDefault();
        match.handler(event);
        return;
      }

      const startsSequence = bindingsRef.current.some((b) => b.keys.startsWith(`${pressed} `));
      pending = startsSequence && !typing ? { key: pressed, at: Date.now() } : null;
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
