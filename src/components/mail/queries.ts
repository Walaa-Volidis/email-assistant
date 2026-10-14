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

import { apiFetch } from "@/lib/api/client";
import { applyActionToLabels } from "@/lib/mail";
import {
  followUpSuggestionsSchema,
  replyDraftSchema,
  threadSummarySchema,
  type ReplyDraft,
  type ReplyLength,
  type Tone,
} from "@/schemas/ai";
import {
  emailThreadSchema,
  mailboxCountsSchema,
  sentMessageSchema,
  threadActionResultSchema,
  threadListPageSchema,
  type EmailThread,
  type Mailbox,
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
      return apiFetch(`/api/gmail/threads?${params}`, threadListPageSchema, { signal });
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
      ? ({ signal }) => apiFetch(`/api/gmail/threads/${threadId}`, emailThreadSchema, { signal })
      : skipToken,
  });
}

export function useMailboxCounts() {
  return useQuery({
    queryKey: mailKeys.counts(),
    queryFn: ({ signal }) => apiFetch("/api/gmail/mailboxes", mailboxCountsSchema, { signal }),
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

/**
 * Applies the label change to the cache immediately, sends it to Gmail,
 * then adopts Gmail's labels, or restores the snapshot if Gmail refuses.
 */
export function useThreadAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, action }: { threadId: string; action: ThreadAction }) =>
      apiFetch(`/api/gmail/threads/${threadId}/actions`, threadActionResultSchema, {
        method: "POST",
        body: { action },
      }),
    onMutate: async ({ threadId, action }) => {
      await client.cancelQueries({ queryKey: mailKeys.lists() });
      await client.cancelQueries({ queryKey: mailKeys.thread(threadId) });
      const snapshot = {
        lists: client.getQueriesData<InfiniteData<ThreadListPage>>({ queryKey: mailKeys.lists() }),
        thread: client.getQueryData<EmailThread>(mailKeys.thread(threadId)),
      };
      patchLabels(client, threadId, (labels) => applyActionToLabels(labels, action));
      return snapshot;
    },
    onError: (_error, { threadId }, snapshot) => {
      snapshot?.lists.forEach(([key, data]) => client.setQueryData(key, data));
      if (snapshot?.thread) client.setQueryData(mailKeys.thread(threadId), snapshot.thread);
    },
    onSuccess: ({ id, labelIds }) => patchLabels(client, id, () => labelIds),
    onSettled: () => client.invalidateQueries({ queryKey: mailKeys.counts() }),
  });
}

export function useSendReply() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, ...reply }: ReplyRequest & { threadId: string }) =>
      apiFetch(`/api/gmail/threads/${threadId}/reply`, sentMessageSchema, {
        method: "POST",
        body: reply,
      }),
    onSuccess: (_sent, { threadId }) => {
      client.invalidateQueries({ queryKey: mailKeys.thread(threadId) });
      client.invalidateQueries({ queryKey: mailKeys.lists() });
    },
  });
}

// ---- Assistant ----------------------------------------------------------------

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
      apiFetch("/api/ai/summarize", threadSummarySchema, { method: "POST", body: { threadId: id }, signal }),
    enabled: false,
    staleTime: Infinity,
    retry: false,
  });

  const followUps = useQuery({
    queryKey: aiKeys.followUps(id),
    queryFn: ({ signal }) =>
      apiFetch("/api/ai/follow-ups", followUpSuggestionsSchema, {
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
      apiFetch("/api/ai/draft", replyDraftSchema, {
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
