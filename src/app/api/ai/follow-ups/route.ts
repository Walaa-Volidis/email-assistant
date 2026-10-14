import { badRequest } from "@/lib/api/errors";
import { fail, ok, readJson, withErrorHandling } from "@/lib/api/respond";
import { suggestFollowUps } from "@/services/ai/assistant";
import { getGmailContext } from "@/services/gmail/client";
import { getThread } from "@/services/gmail/threads";
import { ZFollowUpSuggestionsSchema, ZSuggestFollowUpsRequestSchema } from "@/schemas/ai";

/** POST /api/ai/follow-ups { threadId, now? } → FollowUpSuggestions */
export const POST = withErrorHandling(async (request: Request) => {
  const input = ZSuggestFollowUpsRequestSchema.safeParse(await readJson(request));
  if (!input.success) return fail(badRequest(input.error));

  const context = await getGmailContext();
  const thread = await getThread(context, input.data.threadId);
  const followUps = await suggestFollowUps({ thread, user: context.user, now: input.data.now });
  return ok(ZFollowUpSuggestionsSchema.parse(followUps));
});
