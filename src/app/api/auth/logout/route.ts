import { ok, withErrorHandling } from "@/lib/api/respond";
import { revokeToken } from "@/lib/auth/google-oauth";
import { clearSession, readSession } from "@/lib/auth/session";
import { ZSignOutResponseSchema } from "@/schemas/auth";

/** POST /api/auth/logout → SignOutResponse (no input). Revokes Google access and clears the session. */
export const POST = withErrorHandling(async () => {
  const session = await readSession();
  if (session) await revokeToken(session.tokens.refreshToken);
  await clearSession();
  return ok(ZSignOutResponseSchema.parse({ signedOut: true }));
});
