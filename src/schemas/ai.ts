import { z } from "zod";

import { ZGmailIdSchema, ZIsoDateTimeSchema } from "@/schemas/common";

/*
 * Two kinds of schema live here:
 *
 * - *Request* schemas validate what the UI sends to our API routes.
 * - *Output* schemas are handed to OpenAI as structured-output formats, then
 *   used again to parse the response. Structured outputs require every field
 *   to be present, so output schemas use `.nullable()` and never `.optional()`.
 */

export const ZToneSchema = z.enum(["formal", "friendly", "concise", "assertive", "apologetic"]);
export const ZReplyLengthSchema = z.enum(["short", "medium", "long"]);
export const ZSentimentSchema = z.enum(["positive", "neutral", "urgent", "negative"]);

// ---- Thread analysis (summary + tone/context) ------------------------------

export const ZActionItemSchema = z.object({
  task: z.string(),
  owner: z.string().nullable().describe("Person responsible, if stated"),
  dueDate: z.string().nullable().describe("Due date as written in the thread, if any"),
});

export const ZThreadSummarySchema = z.object({
  tldr: z.string().describe("One or two sentences; what the reader must know"),
  keyPoints: z.array(z.string()).max(6),
  actionItems: z.array(ZActionItemSchema),
  openQuestions: z.array(z.string()).describe("Questions still waiting for an answer"),
  sentiment: ZSentimentSchema,
  detectedTone: ZToneSchema.describe("Tone the latest sender wrote in"),
  needsReply: z.boolean(),
});

export const ZSummarizeThreadRequestSchema = z.object({
  threadId: ZGmailIdSchema,
});

// ---- Reply drafting ---------------------------------------------------------

export const ZDraftReplyRequestSchema = z.object({
  threadId: ZGmailIdSchema,
  tone: ZToneSchema.default("friendly"),
  length: ZReplyLengthSchema.default("medium"),
  /** Optional steer from the user, e.g. "decline politely, offer next week". */
  instructions: z.string().trim().max(1_000).optional(),
});

export const ZReplyDraftSchema = z.object({
  subject: z.string(),
  body: z.string().describe("Plain-text body, no signature"),
  tone: ZToneSchema,
  /** Facts the model assumed but couldn't confirm from the thread. */
  assumptions: z.array(z.string()),
});

// ---- Follow-up suggestions --------------------------------------------------

export const ZFollowUpKindSchema = z.enum([
  "nudge",
  "confirm",
  "schedule",
  "share-update",
  "close-loop",
]);

export const ZFollowUpSuggestionSchema = z.object({
  kind: ZFollowUpKindSchema,
  title: z.string().describe("Short imperative label, e.g. 'Nudge Sam about the contract'"),
  rationale: z.string(),
  suggestedDelayDays: z.number().int().min(0).max(60).nullable(),
  draftBody: z.string().nullable(),
});

export const ZFollowUpSuggestionsSchema = z.object({
  suggestions: z.array(ZFollowUpSuggestionSchema).max(3),
});

export const ZSuggestFollowUpsRequestSchema = z.object({
  threadId: ZGmailIdSchema,
  /** Lets the model reason about elapsed time since the last message. */
  now: ZIsoDateTimeSchema.optional(),
});

export type Tone = z.infer<typeof ZToneSchema>;
export type ReplyLength = z.infer<typeof ZReplyLengthSchema>;
export type Sentiment = z.infer<typeof ZSentimentSchema>;
export type ActionItem = z.infer<typeof ZActionItemSchema>;
export type ThreadSummary = z.infer<typeof ZThreadSummarySchema>;
export type SummarizeThreadRequest = z.infer<typeof ZSummarizeThreadRequestSchema>;
export type DraftReplyRequest = z.infer<typeof ZDraftReplyRequestSchema>;
export type ReplyDraft = z.infer<typeof ZReplyDraftSchema>;
export type FollowUpKind = z.infer<typeof ZFollowUpKindSchema>;
export type FollowUpSuggestion = z.infer<typeof ZFollowUpSuggestionSchema>;
export type FollowUpSuggestions = z.infer<typeof ZFollowUpSuggestionsSchema>;
export type SuggestFollowUpsRequest = z.infer<typeof ZSuggestFollowUpsRequestSchema>;
