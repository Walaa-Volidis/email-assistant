import { badRequest } from "@/lib/api/errors";
import { fail, ok, readQuery, withErrorHandling } from "@/lib/api/respond";
import { getGmailContext } from "@/services/gmail/client";
import { listThreads } from "@/services/gmail/threads";
import { ZThreadListPageSchema, ZThreadListQuerySchema } from "@/schemas/email";

/** GET /api/gmail/threads?mailbox=inbox&q=&pageToken=&pageSize= → ThreadListPage */
export const GET = withErrorHandling(async (request: Request) => {
  const input = ZThreadListQuerySchema.safeParse(readQuery(request));
  if (!input.success) return fail(badRequest(input.error));

  const context = await getGmailContext();
  const page = await listThreads(context, input.data);
  return ok(ZThreadListPageSchema.parse(page));
});
