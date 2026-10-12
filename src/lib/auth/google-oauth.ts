import "server-only";

import { randomBytes } from "node:crypto";

import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";

import { GMAIL_SCOPE, OAUTH_SCOPES } from "@/lib/auth/constants";
import { getGoogleEnv } from "@/lib/env";
import {
  googleIdTokenClaimsSchema,
  type AuthErrorReason,
  type SessionData,
} from "@/schemas/auth";

export function createOAuthClient(): OAuth2Client {
  const env = getGoogleEnv();
  return new OAuth2Client({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI,
  });
}

/** Builds the consent URL. PKCE + state guard against code interception and CSRF. */
export async function buildAuthorizationUrl(): Promise<{
  url: string;
  state: string;
  codeVerifier: string;
}> {
  const client = createOAuthClient();
  const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
  const state = randomBytes(24).toString("base64url");

  const url = client.generateAuthUrl({
    // Offline + consent guarantees a refresh token, even on re-login.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: [...OAUTH_SCOPES],
    state,
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
  });

  return { url, state, codeVerifier };
}

export class OAuthCallbackError extends Error {
  constructor(readonly reason: AuthErrorReason) {
    super(`OAuth callback failed: ${reason}`);
    this.name = "OAuthCallbackError";
  }
}

/** Exchanges the authorization code and verifies the ID token. */
export async function exchangeCode(code: string, codeVerifier: string): Promise<SessionData> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken({ code, codeVerifier });

  if (!tokens.access_token || !tokens.id_token) throw new OAuthCallbackError("unknown");
  if (!tokens.refresh_token) throw new OAuthCallbackError("no_refresh_token");

  // Granular consent lets the user untick Gmail access while still signing in.
  const grantedScopes = (tokens.scope ?? "").split(" ");
  if (!grantedScopes.includes(GMAIL_SCOPE)) throw new OAuthCallbackError("missing_scope");

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: getGoogleEnv().GOOGLE_CLIENT_ID,
  });
  const claims = googleIdTokenClaimsSchema.safeParse(ticket.getPayload());
  if (!claims.success) throw new OAuthCallbackError("unknown");
  if (!claims.data.email_verified) throw new OAuthCallbackError("unverified_email");

  return {
    user: {
      id: claims.data.sub,
      email: claims.data.email,
      name: claims.data.name ?? null,
      picture: claims.data.picture ?? null,
    },
    tokens: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date ?? Date.now() + 3_600_000,
      scope: tokens.scope ?? "",
    },
  };
}

/** Best effort: the session is cleared locally whether or not Google answers. */
export async function revokeToken(token: string): Promise<void> {
  try {
    await createOAuthClient().revokeToken(token);
  } catch {
    // Already revoked or network failure; nothing useful to do.
  }
}
