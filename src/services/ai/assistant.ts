import "server-only";

import { generateStructured } from "@/services/ai/openai";
import {
  draftReplyInstructions,
  followUpInstructions,
  quickReplyInstructions,
  summarizeInstructions,
} from "@/services/ai/prompts";
import { serializeThread } from "@/services/ai/thread-context";
import {
  ZFollowUpSuggestionsSchema,
  ZQuickRepliesSchema,
  ZReplyDraftSchema,
  ZThreadSummarySchema,
  type FollowUpSuggestions,
  type QuickReplies,
  type ReplyDraft,
  type ReplyLength,
  type ThreadSummary,
  type Tone,
} from "@/schemas/ai";
import { type SessionUser } from "@/schemas/auth";
import { type EmailThread } from "@/schemas/email";

type AssistantInput = { thread: EmailThread; user: SessionUser; now?: string };

export function summarizeThread({ thread, user, now }: AssistantInput): Promise<ThreadSummary> {
  return generateStructured({
    name: "thread_summary",
    schema: ZThreadSummarySchema,
    instructions: summarizeInstructions(user, now ?? new Date().toISOString()),
    input: serializeThread(thread, user.email),
    userId: user.id,
  });
}

export function draftReply({
  thread,
  user,
  now,
  tone,
  length,
  instructions,
}: AssistantInput & { tone: Tone; length: ReplyLength; instructions?: string }): Promise<ReplyDraft> {
  return generateStructured({
    name: "reply_draft",
    schema: ZReplyDraftSchema,
    instructions: draftReplyInstructions(user, now ?? new Date().toISOString(), {
      tone,
      length,
      instructions,
    }),
    input: serializeThread(thread, user.email),
    userId: user.id,
  });
}

export function suggestFollowUps({ thread, user, now }: AssistantInput): Promise<FollowUpSuggestions> {
  return generateStructured({
    name: "follow_up_suggestions",
    schema: ZFollowUpSuggestionsSchema,
    instructions: followUpInstructions(user, now ?? new Date().toISOString()),
    input: serializeThread(thread, user.email),
    userId: user.id,
  });
}

export function suggestQuickReplies({ thread, user, now }: AssistantInput): Promise<QuickReplies> {
  return generateStructured({
    name: "quick_replies",
    schema: ZQuickRepliesSchema,
    instructions: quickReplyInstructions(user, now ?? new Date().toISOString()),
    input: serializeThread(thread, user.email),
    userId: user.id,
    maxOutputTokens: 1_500,
  });
}
