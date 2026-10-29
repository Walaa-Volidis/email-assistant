"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

/** How long a sent message can still be cancelled. */
export const UNDO_SEND_MS = 5_000;

type PendingSend = {
  /** Unique per send; also the toast id. */
  key: string;
  description: string;
  send: () => void;
  undo: () => void;
};

/**
 * Holds each outgoing message for UNDO_SEND_MS before it goes to Gmail, with
 * an Undo toast. The delay is client-side, so leaving the page during it
 * would drop the message: the browser asks for confirmation first.
 */
export function useUndoSend() {
  const pending = useRef(new Map<string, number>());

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (pending.current.size > 0) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  return useCallback(({ key, description, send, undo }: PendingSend) => {
    const timer = window.setTimeout(() => {
      pending.current.delete(key);
      toast.dismiss(key);
      send();
    }, UNDO_SEND_MS);
    pending.current.set(key, timer);

    toast("Sending…", {
      id: key,
      description,
      duration: UNDO_SEND_MS,
      action: {
        label: "Undo",
        onClick: () => {
          window.clearTimeout(timer);
          pending.current.delete(key);
          undo();
        },
      },
    });
  }, []);
}
