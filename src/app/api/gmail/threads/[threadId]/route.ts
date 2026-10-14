import { badRequest } from "@/lib/api/errors";
import { fail, ok, withErrorHandling } from "@/lib/api/respond";
import { getGmailContext } from "@/services/gmail/client";
import { getThread } from "@/services/gmail/threads";
import { ZEmailThreadSchema, ZThreadParamsSchema } from "@/schemas/email";

/** GET /api/gmail/threads/:threadId → EmailThread */
export const GET = withErrorHandling(
  async (_request: Request, { params }: RouteContext<"/api/gmail/threads/[threadId]">) => {
    const input = ZThreadParamsSchema.safeParse(await params);
    if (!input.success) return fail(badRequest(input.error));

    const context = await getGmailContext();
    const thread = await getThread(context, input.data.threadId);
    return ok(ZEmailThreadSchema.parse(thread));
  },
);
