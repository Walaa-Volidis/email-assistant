import { ok, withErrorHandling } from "@/lib/api/respond";
import { readSession } from "@/lib/auth/session";
import { ZSessionResponseSchema } from "@/schemas/auth";

/** GET /api/auth/session → SessionResponse (no input). Never exposes tokens. */
export const GET = withErrorHandling(async () => {
  const session = await readSession();
  // Parsing strips anything not in the schema, so tokens can't leak by accident.
  return ok(
    ZSessionResponseSchema.parse(
      session ? { authenticated: true, user: session.user } : { authenticated: false },
    ),
  );
});
