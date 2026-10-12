import { NextResponse, type NextRequest } from "next/server";

import { buildAuthorizationUrl } from "@/lib/auth/google-oauth";
import { writeOAuthState } from "@/lib/auth/session";
import { loginQuerySchema } from "@/schemas/auth";

/** GET /api/auth/google/login?returnTo=/path → Google consent screen. */
export async function GET(request: NextRequest) {
  const { returnTo } = loginQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  const { url, state, codeVerifier } = await buildAuthorizationUrl();
  await writeOAuthState({ state, codeVerifier, returnTo });

  return NextResponse.redirect(url);
}
