import { NextResponse, type NextRequest } from "next/server";

import { readQuery } from "@/lib/api/respond";
import { buildAuthorizationUrl } from "@/lib/auth/google-oauth";
import { writeOAuthState } from "@/lib/auth/session";
import { ZLoginQuerySchema } from "@/schemas/auth";

/** GET /api/auth/google/login?returnTo=/path → Google consent screen. */
export async function GET(request: NextRequest) {
  // An invalid or unsafe returnTo falls back to "/" rather than failing sign-in.
  const input = ZLoginQuerySchema.safeParse(readQuery(request));
  const returnTo = input.success ? input.data.returnTo : "/";

  const { url, state, codeVerifier } = await buildAuthorizationUrl();
  await writeOAuthState({ state, codeVerifier, returnTo });

  return NextResponse.redirect(url);
}
