import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { readQuery } from "@/lib/api/respond";
import { exchangeCode, OAuthCallbackError } from "@/lib/auth/google-oauth";
import { consumeOAuthState, writeSession } from "@/lib/auth/session";
import { ZOauthCallbackQuerySchema, type AuthErrorReason } from "@/schemas/auth";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function toLogin(request: NextRequest, reason: AuthErrorReason) {
  const url = new URL("/login", request.nextUrl.origin);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

/** GET /api/auth/google/callback — Google redirects here after consent. */
export async function GET(request: NextRequest) {
  const query = ZOauthCallbackQuerySchema.safeParse(readQuery(request));
  const pending = await consumeOAuthState();

  if (!query.success) return toLogin(request, "unknown");
  if ("error" in query.data) {
    return toLogin(request, query.data.error === "access_denied" ? "access_denied" : "unknown");
  }
  if (!pending || !safeEqual(pending.state, query.data.state)) {
    return toLogin(request, "state_mismatch");
  }

  try {
    const session = await exchangeCode(query.data.code, pending.codeVerifier);
    await writeSession(session);
  } catch (error) {
    if (error instanceof OAuthCallbackError) return toLogin(request, error.reason);
    console.error("[auth] code exchange failed", error);
    return toLogin(request, "unknown");
  }

  return NextResponse.redirect(new URL(pending.returnTo, request.nextUrl.origin));
}
