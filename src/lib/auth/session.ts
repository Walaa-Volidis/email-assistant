import "server-only";

import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { connection } from "next/server";

import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_TTL_SECONDS,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "@/lib/auth/constants";
import { getAppEnv } from "@/lib/env";
import {
  oauthStateSchema,
  sessionDataSchema,
  type OAuthState,
  type SessionData,
} from "@/schemas/auth";

function cookieOptions(cookieName: string, ttl: number): SessionOptions {
  const env = getAppEnv();
  return {
    cookieName,
    password: env.SESSION_SECRET,
    ttl,
    cookieOptions: {
      httpOnly: true,
      // Lax so the cookie survives the top-level redirect back from Google.
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
    },
  };
}

async function sessionStore(): Promise<IronSession<Partial<SessionData>>> {
  return getIronSession<Partial<SessionData>>(
    await cookies(),
    cookieOptions(SESSION_COOKIE, SESSION_TTL_SECONDS),
  );
}

/** Validated session, or null when signed out or the cookie is malformed. */
export async function readSession(): Promise<SessionData | null> {
  // Unsealing checks the TTL against Date.now(); pin this to request time.
  await connection();
  const parsed = sessionDataSchema.safeParse({ ...(await sessionStore()) });
  return parsed.success ? parsed.data : null;
}

/** Route handlers and server actions only: Server Components can't set cookies. */
export async function writeSession(data: SessionData): Promise<void> {
  const session = await sessionStore();
  session.user = data.user;
  session.tokens = data.tokens;
  await session.save();
}

export async function clearSession(): Promise<void> {
  (await sessionStore()).destroy();
}

async function oauthStateStore(): Promise<IronSession<Partial<OAuthState>>> {
  return getIronSession<Partial<OAuthState>>(
    await cookies(),
    cookieOptions(OAUTH_STATE_COOKIE, OAUTH_STATE_TTL_SECONDS),
  );
}

export async function writeOAuthState(data: OAuthState): Promise<void> {
  const store = await oauthStateStore();
  store.state = data.state;
  store.codeVerifier = data.codeVerifier;
  store.returnTo = data.returnTo;
  await store.save();
}

/** Reads and deletes the state cookie: each login attempt is single-use. */
export async function consumeOAuthState(): Promise<OAuthState | null> {
  const store = await oauthStateStore();
  const parsed = oauthStateSchema.safeParse({ ...store });
  store.destroy();
  return parsed.success ? parsed.data : null;
}
