import { ok, parseOrThrow, withErrorHandling } from "@/lib/api/respond";
import { getGmailContext } from "@/services/gmail/client";
import { getThread } from "@/services/gmail/threads";
import { gmailIdSchema } from "@/schemas/common";

/** GET /api/gmail/threads/:threadId → EmailThread */
export const GET = withErrorHandling(
  async (_request: Request, { params }: RouteContext<"/api/gmail/threads/[threadId]">) => {
    const threadId = parseOrThrow(gmailIdSchema, (await params).threadId);
    const context = await getGmailContext();
    return ok(await getThread(context, threadId));
  },
);
