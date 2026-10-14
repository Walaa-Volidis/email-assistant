import { badRequest } from "@/lib/api/errors";
import { fail, ok, readJson, withErrorHandling } from "@/lib/api/respond";
import { getGmailContext } from "@/services/gmail/client";
import { applyThreadAction } from "@/services/gmail/threads";
import {
  ZThreadActionRequestSchema,
  ZThreadActionResultSchema,
  ZThreadParamsSchema,
} from "@/schemas/email";

/** POST /api/gmail/threads/:threadId/actions { action } → ThreadActionResult */
export const POST = withErrorHandling(
  async (request: Request, { params }: RouteContext<"/api/gmail/threads/[threadId]/actions">) => {
    const route = ZThreadParamsSchema.safeParse(await params);
    if (!route.success) return fail(badRequest(route.error));
    const body = ZThreadActionRequestSchema.safeParse(await readJson(request));
    if (!body.success) return fail(badRequest(body.error));

    const context = await getGmailContext();
    const result = await applyThreadAction(context, route.data.threadId, body.data.action);
    return ok(ZThreadActionResultSchema.parse(result));
  },
);
