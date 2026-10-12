import { z } from "zod";

import { gmailIdSchema, isoDateTimeSchema } from "@/schemas/common";

/*
 * Two kinds of schema live here:
 *
 * - *Request* schemas validate what the UI sends to our API routes.
 * - *Output* schemas are handed to OpenAI as structured-output formats, then
 *   used again to parse the response. Structured outputs require every field
 *   to be present, so output schemas use `.nullable()` and never `.optional()`.
 */

export const toneSchema = z.enum(["formal", "friendly", "concise", "assertive", "apologetic"]);
export const replyLengthSchema = z.enum(["short", "medium", "long"]);
export const sentimentSchema = z.enum(["positive", "neutral", "urgent", "negative"]);

// ---- Thread analysis (summary + tone/context) ------------------------------

export const actionItemSchema = z.object({
  task: z.string(),
  owner: z.string().nullable().describe("Person responsible, if stated"),
  dueDate: z.string().nullable().describe("Due date as written in the thread, if any"),
});

export const threadSummarySchema = z.object({
  tldr: z.string().describe("One or two sentences; what the reader must know"),
  keyPoints: z.array(z.string()).max(6),
  actionItems: z.array(actionItemSchema),
  openQuestions: z.array(z.string()).describe("Questions still waiting for an answer"),
  sentiment: sentimentSchema,
  detectedTone: toneSchema.describe("Tone the latest sender wrote in"),
  needsReply: z.boolean(),
});

export const summarizeThreadRequestSchema = z.object({
  threadId: gmailIdSchema,
});

// ---- Reply drafting ---------------------------------------------------------

export const draftReplyRequestSchema = z.object({
  threadId: gmailIdSchema,
  tone: toneSchema.default("friendly"),
  length: replyLengthSchema.default("medium"),
  /** Optional steer from the user, e.g. "decline politely, offer next week". */
  instructions: z.string().trim().max(1_000).optional(),
});

export const replyDraftSchema = z.object({
  subject: z.string(),
  body: z.string().describe("Plain-text body, no signature"),
  tone: toneSchema,
  /** Facts the model assumed but couldn't confirm from the thread. */
  assumptions: z.array(z.string()),
});

// ---- Follow-up suggestions --------------------------------------------------

export const followUpKindSchema = z.enum([
  "nudge",
  "confirm",
  "schedule",
  "share-update",
  "close-loop",
]);

export const followUpSuggestionSchema = z.object({
  kind: followUpKindSchema,
  title: z.string().describe("Short imperative label, e.g. 'Nudge Sam about the contract'"),
  rationale: z.string(),
  suggestedDelayDays: z.number().int().min(0).max(60).nullable(),
  draftBody: z.string().nullable(),
});

export const followUpSuggestionsSchema = z.object({
  suggestions: z.array(followUpSuggestionSchema).max(3),
});

export const suggestFollowUpsRequestSchema = z.object({
  threadId: gmailIdSchema,
  /** Lets the model reason about elapsed time since the last message. */
  now: isoDateTimeSchema.optional(),
});

export type Tone = z.infer<typeof toneSchema>;
export type ReplyLength = z.infer<typeof replyLengthSchema>;
export type Sentiment = z.infer<typeof sentimentSchema>;
export type ActionItem = z.infer<typeof actionItemSchema>;
export type ThreadSummary = z.infer<typeof threadSummarySchema>;
export type SummarizeThreadRequest = z.infer<typeof summarizeThreadRequestSchema>;
export type DraftReplyRequest = z.infer<typeof draftReplyRequestSchema>;
export type ReplyDraft = z.infer<typeof replyDraftSchema>;
export type FollowUpKind = z.infer<typeof followUpKindSchema>;
export type FollowUpSuggestion = z.infer<typeof followUpSuggestionSchema>;
export type FollowUpSuggestions = z.infer<typeof followUpSuggestionsSchema>;
export type SuggestFollowUpsRequest = z.infer<typeof suggestFollowUpsRequestSchema>;
