import { ok, withErrorHandling } from "@/lib/api/respond";
import { getGmailContext } from "@/services/gmail/client";
import { getGmailProfile } from "@/services/gmail/profile";

/** GET /api/gmail/profile — mailbox totals; doubles as a token health check. */
export const GET = withErrorHandling(async () => {
  const context = await getGmailContext();
  return ok(await getGmailProfile(context));
});
