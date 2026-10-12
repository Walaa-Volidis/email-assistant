import { ok, parseJsonBody, withErrorHandling } from "@/lib/api/respond";
import { summarizeThread } from "@/services/ai/assistant";
import { getGmailContext } from "@/services/gmail/client";
import { getThread } from "@/services/gmail/threads";
import { summarizeThreadRequestSchema } from "@/schemas/ai";

/** POST /api/ai/summarize { threadId } → ThreadSummary */
export const POST = withErrorHandling(async (request: Request) => {
  const { threadId } = await parseJsonBody(request, summarizeThreadRequestSchema);
  const context = await getGmailContext();
  const thread = await getThread(context, threadId);
  return ok(await summarizeThread({ thread, user: context.user }));
});
