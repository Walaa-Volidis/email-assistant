"use client";

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { gmailIdSchema } from "@/schemas/common";
import { mailboxSchema, type Mailbox } from "@/schemas/email";

/**
 * Mailbox and open thread live in the URL (`?box=sent&t=18f2a01`), so a
 * refresh or shared link restores the view. `history.replaceState` keeps
 * j/k navigation instant and out of the back stack; Next syncs it into
 * useSearchParams.
 */
export function useMailRoute() {
  const params = useSearchParams();
  const mailbox: Mailbox = mailboxSchema.catch("inbox").parse(params.get("box") ?? undefined);
  const parsedId = gmailIdSchema.safeParse(params.get("t"));
  const threadId = parsedId.success ? parsedId.data : null;

  const navigate = useCallback((next: { box?: Mailbox; t?: string | null }) => {
    const url = new URL(window.location.href);
    if (next.box !== undefined) {
      if (next.box === "inbox") url.searchParams.delete("box");
      else url.searchParams.set("box", next.box);
    }
    if (next.t !== undefined) {
      if (next.t === null) url.searchParams.delete("t");
      else url.searchParams.set("t", next.t);
    }
    window.history.replaceState(null, "", url);
  }, []);

  return { mailbox, threadId, navigate };
}
