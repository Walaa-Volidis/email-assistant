import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Optimistic gate: bounce page requests without a session cookie to /login.
 * It only checks presence; the cookie is decrypted and validated where data
 * is read (readSession / getGmailContext), so a forged cookie gets nothing.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const login = new URL("/login", request.nextUrl.origin);
  const returnTo = request.nextUrl.pathname + request.nextUrl.search;
  if (returnTo !== "/") login.searchParams.set("returnTo", returnTo);
  return NextResponse.redirect(login);
}

export const config = {
  // Pages only: API routes answer 401 themselves; assets and /login stay public.
  matcher: ["/((?!api|login|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
