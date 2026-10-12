import { ok, parseJsonBody, withErrorHandling } from "@/lib/api/respond";
import { draftReply } from "@/services/ai/assistant";
import { getGmailContext } from "@/services/gmail/client";
import { getThread } from "@/services/gmail/threads";
import { draftReplyRequestSchema } from "@/schemas/ai";

/** POST /api/ai/draft { threadId, tone?, length?, instructions? } → ReplyDraft */
export const POST = withErrorHandling(async (request: Request) => {
  const { threadId, tone, length, instructions } = await parseJsonBody(
    request,
    draftReplyRequestSchema,
  );
  const context = await getGmailContext();
  const thread = await getThread(context, threadId);
  return ok(await draftReply({ thread, user: context.user, tone, length, instructions }));
});
