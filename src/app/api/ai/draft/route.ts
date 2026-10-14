import { badRequest } from "@/lib/api/errors";
import { fail, ok, readJson, withErrorHandling } from "@/lib/api/respond";
import { draftReply } from "@/services/ai/assistant";
import { getGmailContext } from "@/services/gmail/client";
import { getThread } from "@/services/gmail/threads";
import { ZDraftReplyRequestSchema, ZReplyDraftSchema } from "@/schemas/ai";

/** POST /api/ai/draft { threadId, tone?, length?, instructions? } → ReplyDraft */
export const POST = withErrorHandling(async (request: Request) => {
  const input = ZDraftReplyRequestSchema.safeParse(await readJson(request));
  if (!input.success) return fail(badRequest(input.error));

  const { threadId, tone, length, instructions } = input.data;
  const context = await getGmailContext();
  const thread = await getThread(context, threadId);
  const draft = await draftReply({ thread, user: context.user, tone, length, instructions });
  return ok(ZReplyDraftSchema.parse(draft));
});
