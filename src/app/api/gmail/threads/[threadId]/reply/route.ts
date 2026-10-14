import { badRequest } from "@/lib/api/errors";
import { fail, ok, readJson, withErrorHandling } from "@/lib/api/respond";
import { getGmailContext } from "@/services/gmail/client";
import { sendReply } from "@/services/gmail/threads";
import { ZReplyRequestSchema, ZSentMessageSchema, ZThreadParamsSchema } from "@/schemas/email";

/** POST /api/gmail/threads/:threadId/reply { inReplyToMessageId, to, cc, subject, body } → SentMessage */
export const POST = withErrorHandling(
  async (request: Request, { params }: RouteContext<"/api/gmail/threads/[threadId]/reply">) => {
    const route = ZThreadParamsSchema.safeParse(await params);
    if (!route.success) return fail(badRequest(route.error));
    const body = ZReplyRequestSchema.safeParse(await readJson(request));
    if (!body.success) return fail(badRequest(body.error));

    const context = await getGmailContext();
    const sent = await sendReply(context, route.data.threadId, body.data);
    return ok(ZSentMessageSchema.parse(sent));
  },
);
