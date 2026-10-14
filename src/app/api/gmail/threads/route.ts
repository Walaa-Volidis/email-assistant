import { type NextRequest } from "next/server";

import { ok, parseOrThrow, withErrorHandling } from "@/lib/api/respond";
import { getGmailContext } from "@/services/gmail/client";
import { listThreads } from "@/services/gmail/threads";
import { threadListQuerySchema } from "@/schemas/email";

/** GET /api/gmail/threads?mailbox=inbox&q=&pageToken=&pageSize= → ThreadListPage */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const query = parseOrThrow(threadListQuerySchema, Object.fromEntries(request.nextUrl.searchParams));
  const context = await getGmailContext();
  return ok(await listThreads(context, query));
});
