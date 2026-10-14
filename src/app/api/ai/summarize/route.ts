import { badRequest } from "@/lib/api/errors";
import { fail, ok, readJson, withErrorHandling } from "@/lib/api/respond";
import { summarizeThread } from "@/services/ai/assistant";
import { getGmailContext } from "@/services/gmail/client";
import { getThread } from "@/services/gmail/threads";
import { ZSummarizeThreadRequestSchema, ZThreadSummarySchema } from "@/schemas/ai";

/** POST /api/ai/summarize { threadId } → ThreadSummary */
export const POST = withErrorHandling(async (request: Request) => {
  const input = ZSummarizeThreadRequestSchema.safeParse(await readJson(request));
  if (!input.success) return fail(badRequest(input.error));

  const context = await getGmailContext();
  const thread = await getThread(context, input.data.threadId);
  const summary = await summarizeThread({ thread, user: context.user });
  return ok(ZThreadSummarySchema.parse(summary));
});
