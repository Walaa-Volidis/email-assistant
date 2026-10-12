"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useReducer } from "react";

import { gmailIdSchema } from "@/schemas/common";
import { mailboxSchema, type EmailThread, type Mailbox } from "@/schemas/email";

type Action =
  | { type: "toggleStar"; id: string }
  | { type: "archive"; id: string }
  | { type: "trash"; id: string }
  | { type: "markRead"; id: string };

function withLabels(thread: EmailThread, add: string[], remove: string[]): EmailThread {
  const labels = new Set(thread.labelIds);
  remove.forEach((label) => labels.delete(label));
  add.forEach((label) => labels.add(label));
  const labelIds = [...labels];
  return {
    ...thread,
    labelIds,
    isStarred: labels.has("STARRED"),
    isUnread: labels.has("UNREAD"),
  };
}

function reducer(threads: EmailThread[], action: Action): EmailThread[] {
  return threads.map((thread) => {
    if (thread.id !== action.id) return thread;
    switch (action.type) {
      case "toggleStar":
        return thread.isStarred
          ? withLabels(thread, [], ["STARRED"])
          : withLabels(thread, ["STARRED"], []);
      case "archive":
        return withLabels(thread, [], ["INBOX"]);
      case "trash":
        return withLabels(thread, ["TRASH"], ["INBOX"]);
      case "markRead":
        return {
          ...withLabels(thread, [], ["UNREAD"]),
          messages: thread.messages.map((m) => ({ ...m, isUnread: false })),
        };
    }
  });
}

/**
 * Local thread state. Label changes are applied instantly here; Step 5
 * mirrors them to Gmail and rolls back on failure.
 */
export function useThreads(initial: EmailThread[]) {
  const [threads, dispatch] = useReducer(reducer, initial);
  return { threads, dispatch };
}

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
