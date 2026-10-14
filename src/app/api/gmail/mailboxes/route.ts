import { ok, withErrorHandling } from "@/lib/api/respond";
import { getGmailContext } from "@/services/gmail/client";
import { getMailboxCounts } from "@/services/gmail/threads";
import { ZMailboxCountsSchema } from "@/schemas/email";

/** GET /api/gmail/mailboxes → MailboxCounts (no input) */
export const GET = withErrorHandling(async () => {
  const context = await getGmailContext();
  const counts = await getMailboxCounts(context);
  return ok(ZMailboxCountsSchema.parse(counts));
});
