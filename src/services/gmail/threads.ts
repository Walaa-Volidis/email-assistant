import "server-only";

import { type gmail_v1 } from "@googleapis/gmail";

import { AppError, fromGoogleError } from "@/lib/api/errors";
import { type GmailContext } from "@/services/gmail/client";
import { buildNewMessageMime, buildReplyMime } from "@/services/gmail/compose";
import { getHeader } from "@/services/gmail/mime";
import { toEmailThread, toThreadListItem } from "@/services/gmail/normalize";
import {
  type ComposeRequest,
  type EmailThread,
  type Mailbox,
  type MailboxCounts,
  type ReplyRequest,
  type SentMessage,
  type ThreadAction,
  type ThreadActionResult,
  type ThreadListItem,
  type ThreadListPage,
  type ThreadListQuery,
} from "@/schemas/email";

async function google<T>(call: () => Promise<{ data: T }>): Promise<T> {
  try {
    return (await call()).data;
  } catch (error) {
    throw fromGoogleError(error);
  }
}

/** Runs `fn` over `items` with at most `limit` in flight; keeps input order. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** How each mailbox maps onto Gmail labels and search. */
const MAILBOX_FILTERS: Record<Mailbox, { labelIds?: string[]; q?: string; includeSpamTrash?: boolean }> = {
  inbox: { labelIds: ["INBOX"] },
  starred: { labelIds: ["STARRED"] },
  sent: { labelIds: ["SENT"] },
  drafts: { labelIds: ["DRAFT"] },
  // Gmail has no archive label: it's everything outside these.
  // -in:sent drops threads made only of the user's own messages.
  archive: { q: "-in:inbox -in:trash -in:spam -in:drafts -in:sent" },
  trash: { labelIds: ["TRASH"], includeSpamTrash: true },
};

const LIST_HEADERS = ["From", "To", "Cc", "Subject", "Date", "Message-ID"];

/**
 * One page of threads. threads.list returns ids only, so each row is filled
 * in with a metadata-only threads.get, a few at a time to stay inside
 * Gmail's per-user rate limit.
 */
export async function listThreads(
  { gmail }: GmailContext,
  { mailbox, q, pageToken, pageSize }: ThreadListQuery,
): Promise<ThreadListPage> {
  const filter = MAILBOX_FILTERS[mailbox];
  const query = [filter.q, q].filter(Boolean).join(" ") || undefined;

  const list = await google(() =>
    gmail.users.threads.list({
      userId: "me",
      labelIds: filter.labelIds,
      q: query,
      includeSpamTrash: filter.includeSpamTrash,
      maxResults: pageSize,
      pageToken,
    }),
  );

  const ids = (list.threads ?? []).flatMap((t) => (t.id ? [t.id] : []));
  const rows = await mapWithConcurrency(ids, 5, async (id) => {
    try {
      const raw = await google(() =>
        gmail.users.threads.get({ userId: "me", id, format: "metadata", metadataHeaders: LIST_HEADERS }),
      );
      return toThreadListItem(raw);
    } catch (error) {
      // A thread deleted between list and get shouldn't fail the whole page.
      if (error instanceof AppError && error.code === "NOT_FOUND") return null;
      throw error;
    }
  });

  return {
    threads: rows.filter((row): row is ThreadListItem => row !== null),
    nextPageToken: list.nextPageToken ?? null,
  };
}

export async function getThread({ gmail }: GmailContext, threadId: string): Promise<EmailThread> {
  const data = await google(() => gmail.users.threads.get({ userId: "me", id: threadId, format: "full" }));
  const thread = toEmailThread(data);
  if (!thread) throw new AppError("NOT_FOUND", "That thread has no readable messages.");
  return thread;
}

const LABEL_CHANGES: Record<
  Exclude<ThreadAction, "trash" | "untrash">,
  gmail_v1.Schema$ModifyThreadRequest
> = {
  star: { addLabelIds: ["STARRED"] },
  unstar: { removeLabelIds: ["STARRED"] },
  archive: { removeLabelIds: ["INBOX"] },
  unarchive: { addLabelIds: ["INBOX"] },
  markRead: { removeLabelIds: ["UNREAD"] },
  markUnread: { addLabelIds: ["UNREAD"] },
};

export async function applyThreadAction(
  { gmail }: GmailContext,
  threadId: string,
  action: ThreadAction,
): Promise<ThreadActionResult> {
  const data = await google<gmail_v1.Schema$Thread>(() => {
    if (action === "trash") return gmail.users.threads.trash({ userId: "me", id: threadId });
    if (action === "untrash") return gmail.users.threads.untrash({ userId: "me", id: threadId });
    return gmail.users.threads.modify({ userId: "me", id: threadId, requestBody: LABEL_CHANGES[action] });
  });
  const labelIds = [...new Set((data.messages ?? []).flatMap((m) => m.labelIds ?? []))];
  return { id: threadId, labelIds };
}

export async function getMailboxCounts({ gmail }: GmailContext): Promise<MailboxCounts> {
  const [inbox, drafts] = await Promise.all([
    google(() => gmail.users.labels.get({ userId: "me", id: "INBOX" })),
    google(() => gmail.users.labels.get({ userId: "me", id: "DRAFT" })),
  ]);
  return { inboxUnread: inbox.threadsUnread ?? 0, drafts: drafts.threadsTotal ?? 0 };
}

/** Sends a plain-text reply into an existing thread. */
export async function sendReply(
  { gmail }: GmailContext,
  threadId: string,
  { inReplyToMessageId, to, cc, subject, body }: ReplyRequest,
): Promise<SentMessage> {
  const original = await google(() =>
    gmail.users.messages.get({
      userId: "me",
      id: inReplyToMessageId,
      format: "metadata",
      metadataHeaders: ["Message-ID", "References"],
    }),
  );
  if (original.threadId !== threadId) {
    throw new AppError("BAD_REQUEST", "That message isn't part of this thread.");
  }

  const raw = buildReplyMime({
    to,
    cc,
    subject,
    body,
    inReplyTo: getHeader(original.payload, "Message-ID"),
    references: getHeader(original.payload, "References"),
  });

  const sent = await google(() =>
    gmail.users.messages.send({ userId: "me", requestBody: { raw, threadId } }),
  );
  if (!sent.id || !sent.threadId) throw new AppError("UPSTREAM_ERROR", "Gmail didn't confirm the message was sent.");
  return { id: sent.id, threadId: sent.threadId };
}

/** Sends a new plain-text message, which Gmail files as a new thread. */
export async function sendMessage({ gmail }: GmailContext, message: ComposeRequest): Promise<SentMessage> {
  const raw = buildNewMessageMime(message);
  const sent = await google(() => gmail.users.messages.send({ userId: "me", requestBody: { raw } }));
  if (!sent.id || !sent.threadId) throw new AppError("UPSTREAM_ERROR", "Gmail didn't confirm the message was sent.");
  return { id: sent.id, threadId: sent.threadId };
}
