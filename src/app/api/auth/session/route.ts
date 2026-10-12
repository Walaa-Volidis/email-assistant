import { ok, withErrorHandling } from "@/lib/api/respond";
import { readSession } from "@/lib/auth/session";
import { type SessionResponse } from "@/schemas/auth";

/** GET /api/auth/session — who is signed in. Never exposes tokens. */
export const GET = withErrorHandling(async () => {
  const session = await readSession();
  const body: SessionResponse = session
    ? { authenticated: true, user: session.user }
    : { authenticated: false };
  return ok(body);
});
