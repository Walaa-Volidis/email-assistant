import { type gmail_v1 } from "@googleapis/gmail";

import { parseAddressList } from "@/services/gmail/address";
import {
  decodeHtmlEntities,
  extractAttachments,
  extractBodies,
  getHeader,
  htmlToText,
} from "@/services/gmail/mime";
import {
  emailThreadSchema,
  threadListItemSchema,
  type EmailMessage,
  type EmailThread,
  type ThreadListItem,
} from "@/schemas/email";

const UNKNOWN_SENDER = { name: "Unknown sender", email: "unknown@invalid.example" };

/** Maps a raw Gmail message onto our domain shape; null if it can't be read. */
export function toEmailMessage(raw: gmail_v1.Schema$Message): EmailMessage | null {
  if (!raw.id || !raw.threadId) return null;
  const payload = raw.payload;
  const { text, html } = extractBodies(payload);
  const labelIds = raw.labelIds ?? [];
  const sentAt = raw.internalDate
    ? new Date(Number(raw.internalDate)).toISOString()
    : new Date(getHeader(payload, "Date") ?? 0).toISOString();

  return {
    id: raw.id,
    threadId: raw.threadId,
    rfcMessageId: getHeader(payload, "Message-ID"),
    from: parseAddressList(getHeader(payload, "From"))[0] ?? UNKNOWN_SENDER,
    to: parseAddressList(getHeader(payload, "To")),
    cc: parseAddressList(getHeader(payload, "Cc")),
    subject: getHeader(payload, "Subject") ?? "(no subject)",
    snippet: decodeHtmlEntities(raw.snippet ?? ""),
    bodyText: text ?? (html ? htmlToText(html) : ""),
    bodyHtml: html,
    sentAt,
    labelIds,
    isUnread: labelIds.includes("UNREAD"),
    attachments: extractAttachments(payload),
  };
}

/**
 * Builds a list row from `threads.get` in metadata format (headers only, no
 * bodies). Attachments aren't listed in that format; a multipart/mixed
 * top-level part is the standard signal that a message carries files.
 */
export function toThreadListItem(raw: gmail_v1.Schema$Thread): ThreadListItem | null {
  const rawMessages = raw.messages ?? [];
  const messages = rawMessages
    .map(toEmailMessage)
    .filter((m): m is EmailMessage => m !== null)
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt));

  const first = messages[0];
  const last = messages.at(-1);
  if (!raw.id || !first || !last) return null;

  const labelIds = [...new Set(messages.flatMap((m) => m.labelIds))];
  return threadListItemSchema.parse({
    id: raw.id,
    subject: first.subject,
    snippet: last.snippet,
    participants: [...new Map(messages.map((m) => [m.from.email, m.from])).values()],
    messageCount: messages.length,
    lastMessageAt: last.sentAt,
    isUnread: messages.some((m) => m.isUnread),
    isStarred: labelIds.includes("STARRED"),
    hasAttachments: rawMessages.some((m) => m.payload?.mimeType === "multipart/mixed"),
    labelIds,
  });
}

/** Builds a thread from Gmail's `threads.get` response and validates it. */
export function toEmailThread(raw: gmail_v1.Schema$Thread): EmailThread | null {
  const messages = (raw.messages ?? [])
    .map(toEmailMessage)
    .filter((m): m is EmailMessage => m !== null)
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt));

  const first = messages[0];
  const last = messages.at(-1);
  if (!raw.id || !first || !last) return null;

  const labelIds = [...new Set(messages.flatMap((m) => m.labelIds))];
  const participants = [...new Map(messages.map((m) => [m.from.email, m.from])).values()];

  // Parse rather than trust: Gmail data is external input.
  return emailThreadSchema.parse({
    id: raw.id,
    subject: first.subject,
    snippet: last.snippet,
    participants,
    messageCount: messages.length,
    lastMessageAt: last.sentAt,
    isUnread: messages.some((m) => m.isUnread),
    isStarred: labelIds.includes("STARRED"),
    hasAttachments: messages.some((m) => m.attachments.length > 0),
    labelIds,
    messages,
  });
}
