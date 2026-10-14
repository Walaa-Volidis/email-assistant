import { ok, parseJsonBody, parseOrThrow, withErrorHandling } from "@/lib/api/respond";
import { getGmailContext } from "@/services/gmail/client";
import { sendReply } from "@/services/gmail/threads";
import { gmailIdSchema } from "@/schemas/common";
import { replyRequestSchema } from "@/schemas/email";

/** POST /api/gmail/threads/:threadId/reply { inReplyToMessageId, to, cc, subject, body } → SentMessage */
export const POST = withErrorHandling(
  async (request: Request, { params }: RouteContext<"/api/gmail/threads/[threadId]/reply">) => {
    const threadId = parseOrThrow(gmailIdSchema, (await params).threadId);
    const reply = await parseJsonBody(request, replyRequestSchema);
    const context = await getGmailContext();
    return ok(await sendReply(context, threadId, reply));
  },
);
