import { z } from "zod";

import { ZEmailAddressSchema, ZGmailIdSchema, ZIsoDateTimeSchema } from "@/schemas/common";

/** Mailboxes surfaced in the sidebar. Map 1:1 to Gmail system labels. */
export const ZMailboxSchema = z.enum(["inbox", "starred", "sent", "drafts", "archive", "trash"]);

export const ZAttachmentSchema = z.object({
  id: z.string().min(1),
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
});

export const ZEmailMessageSchema = z.object({
  id: ZGmailIdSchema,
  threadId: ZGmailIdSchema,
  /** RFC 5322 Message-ID header; needed for In-Reply-To when replying. */
  rfcMessageId: z.string().nullable(),
  from: ZEmailAddressSchema,
  to: z.array(ZEmailAddressSchema),
  cc: z.array(ZEmailAddressSchema),
  subject: z.string(),
  snippet: z.string(),
  bodyText: z.string(),
  bodyHtml: z.string().nullable(),
  sentAt: ZIsoDateTimeSchema,
  labelIds: z.array(z.string()),
  isUnread: z.boolean(),
  attachments: z.array(ZAttachmentSchema),
});

/** Lightweight row for the thread list; no message bodies. */
export const ZThreadListItemSchema = z.object({
  id: ZGmailIdSchema,
  subject: z.string(),
  snippet: z.string(),
  participants: z.array(ZEmailAddressSchema).min(1),
  messageCount: z.number().int().positive(),
  lastMessageAt: ZIsoDateTimeSchema,
  isUnread: z.boolean(),
  isStarred: z.boolean(),
  hasAttachments: z.boolean(),
  labelIds: z.array(z.string()),
});

export const ZEmailThreadSchema = ZThreadListItemSchema.extend({
  messages: z.array(ZEmailMessageSchema).min(1),
});

export const ZThreadListQuerySchema = z.object({
  mailbox: ZMailboxSchema.default("inbox"),
  q: z.string().trim().max(500).optional(),
  pageToken: z.string().optional(),
  // Each row costs one Gmail metadata call, so pages stay small.
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const ZThreadListPageSchema = z.object({
  threads: z.array(ZThreadListItemSchema),
  nextPageToken: z.string().nullable(),
});

/** Outgoing reply, as validated before it is sent through Gmail. */
export const ZSendReplyInputSchema = z.object({
  threadId: ZGmailIdSchema,
  inReplyToMessageId: ZGmailIdSchema,
  to: z.array(ZEmailAddressSchema).min(1, "Add at least one recipient"),
  cc: z.array(ZEmailAddressSchema).default([]),
  subject: z.string().trim().min(1).max(998),
  body: z.string().trim().min(1, "Reply can't be empty").max(100_000),
});

/** Dynamic segment of every /api/gmail/threads/:threadId route. */
export const ZThreadParamsSchema = z.object({ threadId: ZGmailIdSchema });

/** Body of POST /api/gmail/threads/:id/reply; the thread id comes from the URL. */
export const ZReplyRequestSchema = ZSendReplyInputSchema.omit({ threadId: true });

export const ZSentMessageSchema = z.object({
  id: ZGmailIdSchema,
  threadId: ZGmailIdSchema,
});

/** Label changes the UI can make. Each has an inverse, used for undo. */
export const ZThreadActionSchema = z.enum([
  "star",
  "unstar",
  "archive",
  "unarchive",
  "trash",
  "untrash",
  "markRead",
  "markUnread",
]);

export const ZThreadActionRequestSchema = z.object({ action: ZThreadActionSchema });

export const ZThreadActionResultSchema = z.object({
  id: ZGmailIdSchema,
  labelIds: z.array(z.string()),
});

/** Sidebar badges: unread inbox threads and saved drafts. */
export const ZMailboxCountsSchema = z.object({
  inboxUnread: z.number().int().nonnegative(),
  drafts: z.number().int().nonnegative(),
});

export type Mailbox = z.infer<typeof ZMailboxSchema>;
export type ReplyRequest = z.infer<typeof ZReplyRequestSchema>;
export type SentMessage = z.infer<typeof ZSentMessageSchema>;
export type ThreadAction = z.infer<typeof ZThreadActionSchema>;
export type ThreadActionResult = z.infer<typeof ZThreadActionResultSchema>;
export type MailboxCounts = z.infer<typeof ZMailboxCountsSchema>;
export type Attachment = z.infer<typeof ZAttachmentSchema>;
export type EmailMessage = z.infer<typeof ZEmailMessageSchema>;
export type ThreadListItem = z.infer<typeof ZThreadListItemSchema>;
export type EmailThread = z.infer<typeof ZEmailThreadSchema>;
export type ThreadListQuery = z.infer<typeof ZThreadListQuerySchema>;
export type ThreadListPage = z.infer<typeof ZThreadListPageSchema>;
export type SendReplyInput = z.infer<typeof ZSendReplyInputSchema>;
