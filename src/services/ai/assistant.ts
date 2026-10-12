import "server-only";

import { generateStructured } from "@/services/ai/openai";
import {
  draftReplyInstructions,
  followUpInstructions,
  summarizeInstructions,
} from "@/services/ai/prompts";
import { serializeThread } from "@/services/ai/thread-context";
import {
  followUpSuggestionsSchema,
  replyDraftSchema,
  threadSummarySchema,
  type FollowUpSuggestions,
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
    schema: threadSummarySchema,
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
    schema: replyDraftSchema,
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
    schema: followUpSuggestionsSchema,
    instructions: followUpInstructions(user, now ?? new Date().toISOString()),
    input: serializeThread(thread, user.email),
    userId: user.id,
  });
}
