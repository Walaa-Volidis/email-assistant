import { z } from "zod";

import { emailAddressSchema, gmailIdSchema, isoDateTimeSchema } from "@/schemas/common";

/** Mailboxes surfaced in the sidebar. Map 1:1 to Gmail system labels. */
export const mailboxSchema = z.enum(["inbox", "starred", "sent", "drafts", "archive", "trash"]);

export const attachmentSchema = z.object({
  id: z.string().min(1),
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
});

export const emailMessageSchema = z.object({
  id: gmailIdSchema,
  threadId: gmailIdSchema,
  /** RFC 5322 Message-ID header; needed for In-Reply-To when replying. */
  rfcMessageId: z.string().nullable(),
  from: emailAddressSchema,
  to: z.array(emailAddressSchema),
  cc: z.array(emailAddressSchema),
  subject: z.string(),
  snippet: z.string(),
  bodyText: z.string(),
  bodyHtml: z.string().nullable(),
  sentAt: isoDateTimeSchema,
  labelIds: z.array(z.string()),
  isUnread: z.boolean(),
  attachments: z.array(attachmentSchema),
});

/** Lightweight row for the thread list; no message bodies. */
export const threadListItemSchema = z.object({
  id: gmailIdSchema,
  subject: z.string(),
  snippet: z.string(),
  participants: z.array(emailAddressSchema).min(1),
  messageCount: z.number().int().positive(),
  lastMessageAt: isoDateTimeSchema,
  isUnread: z.boolean(),
  isStarred: z.boolean(),
  hasAttachments: z.boolean(),
  labelIds: z.array(z.string()),
});

export const emailThreadSchema = threadListItemSchema.extend({
  messages: z.array(emailMessageSchema).min(1),
});

export const threadListQuerySchema = z.object({
  mailbox: mailboxSchema.default("inbox"),
  q: z.string().trim().max(500).optional(),
  pageToken: z.string().optional(),
  // Each row costs one Gmail metadata call, so pages stay small.
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const threadListPageSchema = z.object({
  threads: z.array(threadListItemSchema),
  nextPageToken: z.string().nullable(),
});

/** Outgoing reply, as validated before it is sent through Gmail. */
export const sendReplyInputSchema = z.object({
  threadId: gmailIdSchema,
  inReplyToMessageId: gmailIdSchema,
  to: z.array(emailAddressSchema).min(1, "Add at least one recipient"),
  cc: z.array(emailAddressSchema).default([]),
  subject: z.string().trim().min(1).max(998),
  body: z.string().trim().min(1, "Reply can't be empty").max(100_000),
});

/** Body of POST /api/gmail/threads/:id/reply; the thread id comes from the URL. */
export const replyRequestSchema = sendReplyInputSchema.omit({ threadId: true });

export const sentMessageSchema = z.object({
  id: gmailIdSchema,
  threadId: gmailIdSchema,
});

/** Label changes the UI can make. Each has an inverse, used for undo. */
export const threadActionSchema = z.enum([
  "star",
  "unstar",
  "archive",
  "unarchive",
  "trash",
  "untrash",
  "markRead",
  "markUnread",
]);

export const threadActionRequestSchema = z.object({ action: threadActionSchema });

export const threadActionResultSchema = z.object({
  id: gmailIdSchema,
  labelIds: z.array(z.string()),
});

/** Sidebar badges: unread inbox threads and saved drafts. */
export const mailboxCountsSchema = z.object({
  inboxUnread: z.number().int().nonnegative(),
  drafts: z.number().int().nonnegative(),
});

export type Mailbox = z.infer<typeof mailboxSchema>;
export type ReplyRequest = z.infer<typeof replyRequestSchema>;
export type SentMessage = z.infer<typeof sentMessageSchema>;
export type ThreadAction = z.infer<typeof threadActionSchema>;
export type ThreadActionResult = z.infer<typeof threadActionResultSchema>;
export type MailboxCounts = z.infer<typeof mailboxCountsSchema>;
export type Attachment = z.infer<typeof attachmentSchema>;
export type EmailMessage = z.infer<typeof emailMessageSchema>;
export type ThreadListItem = z.infer<typeof threadListItemSchema>;
export type EmailThread = z.infer<typeof emailThreadSchema>;
export type ThreadListQuery = z.infer<typeof threadListQuerySchema>;
export type ThreadListPage = z.infer<typeof threadListPageSchema>;
export type SendReplyInput = z.infer<typeof sendReplyInputSchema>;
