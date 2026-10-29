import { badRequest } from "@/lib/api/errors";
import { fail, ok, readJson, withErrorHandling } from "@/lib/api/respond";
import { suggestQuickReplies } from "@/services/ai/assistant";
import { getGmailContext } from "@/services/gmail/client";
import { getThread } from "@/services/gmail/threads";
import { ZQuickRepliesRequestSchema, ZQuickRepliesSchema } from "@/schemas/ai";

/** POST /api/ai/quick-replies { threadId } → QuickReplies */
export const POST = withErrorHandling(async (request: Request) => {
  const input = ZQuickRepliesRequestSchema.safeParse(await readJson(request));
  if (!input.success) return fail(badRequest(input.error));

  const context = await getGmailContext();
  const thread = await getThread(context, input.data.threadId);
  const replies = await suggestQuickReplies({ thread, user: context.user });
  return ok(ZQuickRepliesSchema.parse(replies));
});
