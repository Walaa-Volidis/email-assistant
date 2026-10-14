import { ok, withErrorHandling } from "@/lib/api/respond";
import { getGmailContext } from "@/services/gmail/client";
import { getMailboxCounts } from "@/services/gmail/threads";

/** GET /api/gmail/mailboxes → MailboxCounts */
export const GET = withErrorHandling(async () => {
  const context = await getGmailContext();
  return ok(await getMailboxCounts(context));
});
