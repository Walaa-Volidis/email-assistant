import { ok, withErrorHandling } from "@/lib/api/respond";
import { getGmailContext } from "@/services/gmail/client";
import { getGmailProfile } from "@/services/gmail/profile";
import { ZGmailProfileSchema } from "@/schemas/gmail";

/** GET /api/gmail/profile → GmailProfile (no input); doubles as a token health check. */
export const GET = withErrorHandling(async () => {
  const context = await getGmailContext();
  const profile = await getGmailProfile(context);
  return ok(ZGmailProfileSchema.parse(profile));
});
