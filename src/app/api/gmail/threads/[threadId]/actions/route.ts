import { ok, parseJsonBody, parseOrThrow, withErrorHandling } from "@/lib/api/respond";
import { getGmailContext } from "@/services/gmail/client";
import { applyThreadAction } from "@/services/gmail/threads";
import { gmailIdSchema } from "@/schemas/common";
import { threadActionRequestSchema } from "@/schemas/email";

/** POST /api/gmail/threads/:threadId/actions { action } → ThreadActionResult */
export const POST = withErrorHandling(
  async (request: Request, { params }: RouteContext<"/api/gmail/threads/[threadId]/actions">) => {
    const threadId = parseOrThrow(gmailIdSchema, (await params).threadId);
    const { action } = await parseJsonBody(request, threadActionRequestSchema);
    const context = await getGmailContext();
    return ok(await applyThreadAction(context, threadId, action));
  },
);
