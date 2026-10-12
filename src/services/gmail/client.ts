import "server-only";

import { gmail, type gmail_v1 } from "@googleapis/gmail";

import { AppError, isInvalidGrant } from "@/lib/api/errors";
import { ACCESS_TOKEN_SKEW_MS } from "@/lib/auth/constants";
import { createOAuthClient } from "@/lib/auth/google-oauth";
import { clearSession, readSession, writeSession } from "@/lib/auth/session";
import { type SessionUser } from "@/schemas/auth";

export type GmailContext = {
  gmail: gmail_v1.Gmail;
  user: SessionUser;
};

/**
 * Authorized Gmail client for the signed-in user.
 *
 * Refreshes the access token when it is about to expire and writes the new
 * one back to the session cookie, so call this from route handlers or server
 * actions only (Server Components can't set cookies). A revoked refresh
 * token clears the session and surfaces as UNAUTHENTICATED.
 */
export async function getGmailContext(): Promise<GmailContext> {
  const session = await readSession();
  if (!session) throw new AppError("UNAUTHENTICATED", "Sign in to continue.");

  const auth = createOAuthClient();
  auth.setCredentials({
    access_token: session.tokens.accessToken,
    refresh_token: session.tokens.refreshToken,
    expiry_date: session.tokens.expiresAt,
  });

  if (session.tokens.expiresAt - Date.now() < ACCESS_TOKEN_SKEW_MS) {
    try {
      const { credentials } = await auth.refreshAccessToken();
      if (!credentials.access_token) throw new Error("Refresh returned no access token");

      const tokens = {
        accessToken: credentials.access_token,
        // Google usually omits the refresh token on refresh; keep ours.
        refreshToken: credentials.refresh_token ?? session.tokens.refreshToken,
        expiresAt: credentials.expiry_date ?? Date.now() + 3_600_000,
        scope: credentials.scope ?? session.tokens.scope,
      };
      auth.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expiry_date: tokens.expiresAt,
      });
      await writeSession({ user: session.user, tokens });
    } catch (error) {
      if (isInvalidGrant(error)) {
        await clearSession();
        throw new AppError("UNAUTHENTICATED", "Google access was revoked. Sign in again.");
      }
      throw error;
    }
  }

  return { gmail: gmail({ version: "v1", auth }), user: session.user };
}
