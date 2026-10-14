import { ok, parseJsonBody, withErrorHandling } from "@/lib/api/respond";
import { suggestFollowUps } from "@/services/ai/assistant";
import { getGmailContext } from "@/services/gmail/client";
import { getThread } from "@/services/gmail/threads";
import { suggestFollowUpsRequestSchema } from "@/schemas/ai";

/** POST /api/ai/follow-ups { threadId, now? } → FollowUpSuggestions */
export const POST = withErrorHandling(async (request: Request) => {
  const { threadId, now } = await parseJsonBody(request, suggestFollowUpsRequestSchema);
  const context = await getGmailContext();
  const thread = await getThread(context, threadId);
  return ok(await suggestFollowUps({ thread, user: context.user, now }));
});
