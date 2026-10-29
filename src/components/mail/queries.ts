"use client";

import {
  skipToken,
  useInfiniteQuery,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";

import { apiFetch, errorMessage } from "@/lib/api/client";
import { applyActionToLabels, INVERSE_ACTION } from "@/lib/mail";
import {
  ZFollowUpSuggestionsSchema,
  ZReplyDraftSchema,
  ZQuickRepliesSchema,
  ZThreadSummarySchema,
  type QuickReplies,
  type ReplyDraft,
  type ReplyLength,
  type Tone,
} from "@/schemas/ai";
import {
  ZEmailThreadSchema,
  ZMailboxCountsSchema,
  ZSentMessageSchema,
  ZThreadActionResultSchema,
  ZThreadListPageSchema,
  type EmailThread,
  type Mailbox,
  type ComposeRequest,
  type ReplyRequest,
  type ThreadAction,
  type ThreadListPage,
} from "@/schemas/email";

export const mailKeys = {
  lists: () => ["mail", "list"] as const,
  list: (mailbox: Mailbox, q: string) => ["mail", "list", mailbox, q] as const,
  thread: (id: string) => ["mail", "thread", id] as const,
  counts: () => ["mail", "counts"] as const,
};

const aiKeys = {
  summary: (threadId: string) => ["ai", "summary", threadId] as const,
  followUps: (threadId: string) => ["ai", "follow-ups", threadId] as const,
  quickReplies: (threadId: string) => ["ai", "quick-replies", threadId] as const,
  draft: (threadId: string) => ["ai", "draft", threadId] as const,
};

// ---- Reads ------------------------------------------------------------------

export function useThreadList(mailbox: Mailbox, q: string) {
  return useInfiniteQuery({
    queryKey: mailKeys.list(mailbox, q),
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ mailbox });
      if (q) params.set("q", q);
      if (pageParam) params.set("pageToken", pageParam);
      return apiFetch(`/api/gmail/threads?${params}`, ZThreadListPageSchema, { signal });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextPageToken,
    // Keep results on screen while a new search loads, but never show one
    // mailbox's threads under another's heading.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === mailbox ? previous : undefined,
  });
}

export function useThread(threadId: string | null) {
  return useQuery({
    queryKey: mailKeys.thread(threadId ?? ""),
    queryFn: threadId
      ? ({ signal }) => apiFetch(`/api/gmail/threads/${threadId}`, ZEmailThreadSchema, { signal })
      : skipToken,
  });
}

export function useMailboxCounts() {
  return useQuery({
    queryKey: mailKeys.counts(),
    queryFn: ({ signal }) => apiFetch("/api/gmail/mailboxes", ZMailboxCountsSchema, { signal }),
    refetchInterval: 120_000,
  });
}

// ---- Label actions (optimistic) ---------------------------------------------

function withLabels<T extends { labelIds: string[] }>(item: T, labelIds: string[]) {
  return {
    ...item,
    labelIds,
    isStarred: labelIds.includes("STARRED"),
    isUnread: labelIds.includes("UNREAD"),
  };
}

/** Rewrites one thread's labels in every cached list and in its detail. */
function patchLabels(client: QueryClient, threadId: string, next: (labels: string[]) => string[]) {
  client.setQueriesData<InfiniteData<ThreadListPage>>({ queryKey: mailKeys.lists() }, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            threads: page.threads.map((t) => (t.id === threadId ? withLabels(t, next(t.labelIds)) : t)),
          })),
        }
      : data,
  );
  client.setQueryData<EmailThread>(mailKeys.thread(threadId), (thread) => {
    if (!thread) return thread;
    const updated = withLabels(thread, next(thread.labelIds));
    return updated.isUnread
      ? updated
      : { ...updated, messages: updated.messages.map((m) => ({ ...m, isUnread: false })) };
  });
}

type ThreadActionVariables = { threadId: string; action: ThreadAction; subject: string };

/**
 * Applies the label change to the cache immediately and sends it to Gmail.
 *
 * Several actions on one thread can overlap (star, then archive), so:
 * - a failure undoes only its own change (the inverse action), never a
 *   snapshot that would also wipe later changes;
 * - Gmail's labels are adopted only from the last action in flight for that
 *   thread, since an earlier response predates the later changes.
 */
export function useThreadAction() {
  const client = useQueryClient();
  const inFlight = useRef(new Map<string, number>());

  const settle = (threadId: string) => {
    const left = (inFlight.current.get(threadId) ?? 1) - 1;
    if (left > 0) inFlight.current.set(threadId, left);
    else inFlight.current.delete(threadId);
    return left;
  };

  return useMutation({
    mutationFn: ({ threadId, action }: ThreadActionVariables) =>
      apiFetch(`/api/gmail/threads/${threadId}/actions`, ZThreadActionResultSchema, {
        method: "POST",
        body: { action },
      }),
    onMutate: async ({ threadId, action }) => {
      inFlight.current.set(threadId, (inFlight.current.get(threadId) ?? 0) + 1);
      await client.cancelQueries({ queryKey: mailKeys.lists() });
      await client.cancelQueries({ queryKey: mailKeys.thread(threadId) });
      patchLabels(client, threadId, (labels) => applyActionToLabels(labels, action));
    },
    onError: (error, { threadId, action, subject }) => {
      patchLabels(client, threadId, (labels) => applyActionToLabels(labels, INVERSE_ACTION[action]));
      // Toast here, not per call: per-call callbacks only fire for the latest mutate().
      toast.error(errorMessage(error), { description: subject });
      settle(threadId);
    },
    onSuccess: ({ id, labelIds }) => {
      if (settle(id) === 0) patchLabels(client, id, () => labelIds);
    },
    onSettled: (_data, _error, { threadId }) => {
      void client.invalidateQueries({ queryKey: mailKeys.counts() });
      if (!inFlight.current.has(threadId)) {
        void client.invalidateQueries({ queryKey: mailKeys.thread(threadId) });
      }
    },
  });
}

export function useSendReply() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, ...reply }: ReplyRequest & { threadId: string }) =>
      apiFetch(`/api/gmail/threads/${threadId}/reply`, ZSentMessageSchema, {
        method: "POST",
        body: reply,
      }),
    onSuccess: (_sent, { threadId }) => {
      client.invalidateQueries({ queryKey: mailKeys.thread(threadId) });
      client.invalidateQueries({ queryKey: mailKeys.lists() });
    },
  });
}

export function useSendMessage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (message: ComposeRequest) =>
      apiFetch("/api/gmail/messages", ZSentMessageSchema, { method: "POST", body: message }),
    onSuccess: () => client.invalidateQueries({ queryKey: mailKeys.lists() }),
  });
}

// ---- Assistant ----------------------------------------------------------------

/**
 * Reply chips for an open thread. Fetched automatically, but only when the
 * latest message is from someone else (the only time a reply makes sense),
 * once per thread, without retries: each call costs tokens.
 */
export function useQuickReplies(threadId: string | null, enabled: boolean): AsyncResult<QuickReplies> {
  const query = useQuery({
    queryKey: aiKeys.quickReplies(threadId ?? ""),
    queryFn: ({ signal }) =>
      apiFetch("/api/ai/quick-replies", ZQuickRepliesSchema, {
        method: "POST",
        body: { threadId },
        signal,
      }),
    enabled: enabled && threadId !== null,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: false,
  });
  return { data: query.data, pending: query.isFetching, error: query.error };
}

export type AsyncResult<T> = { data: T | undefined; pending: boolean; error: unknown };

/**
 * Assistant results, cached per thread so switching threads and coming
 * back keeps them. Summary and follow-ups only run when asked: each call
 * costs tokens.
 */
export function useAssistant(threadId: string | null) {
  const client = useQueryClient();
  const id = threadId ?? "";

  const summary = useQuery({
    queryKey: aiKeys.summary(id),
    queryFn: ({ signal }) =>
      apiFetch("/api/ai/summarize", ZThreadSummarySchema, { method: "POST", body: { threadId: id }, signal }),
    enabled: false,
    staleTime: Infinity,
    retry: false,
  });

  const followUps = useQuery({
    queryKey: aiKeys.followUps(id),
    queryFn: ({ signal }) =>
      apiFetch("/api/ai/follow-ups", ZFollowUpSuggestionsSchema, {
        method: "POST",
        body: { threadId: id, now: new Date().toISOString() },
        signal,
      }),
    enabled: false,
    staleTime: Infinity,
    retry: false,
  });

  const draftData = useQuery<ReplyDraft>({
    queryKey: aiKeys.draft(id),
    queryFn: skipToken,
    staleTime: Infinity,
  });
  const draftMutation = useMutation({
    mutationKey: aiKeys.draft(id),
    mutationFn: (options: { tone: Tone; length: ReplyLength; instructions: string }) =>
      apiFetch("/api/ai/draft", ZReplyDraftSchema, {
        method: "POST",
        body: {
          threadId: id,
          tone: options.tone,
          length: options.length,
          instructions: options.instructions.trim() || undefined,
        },
      }),
    onSuccess: (draft) => client.setQueryData(aiKeys.draft(id), draft),
  });
  // Read status by key, so a draft started on another thread doesn't show here.
  const draftStatus = useMutationState({
    filters: { mutationKey: aiKeys.draft(id) },
    select: (mutation) => ({ status: mutation.state.status, error: mutation.state.error }),
  }).at(-1);

  return {
    summary: {
      data: summary.data,
      pending: summary.isFetching,
      error: summary.error,
      run: () => void summary.refetch(),
    },
    followUps: {
      data: followUps.data,
      pending: followUps.isFetching,
      error: followUps.error,
      run: () => void followUps.refetch(),
    },
    draft: {
      data: draftData.data,
      pending: draftStatus?.status === "pending",
      error: draftStatus?.status === "error" ? draftStatus.error : null,
      run: draftMutation.mutate,
    },
  };
}
