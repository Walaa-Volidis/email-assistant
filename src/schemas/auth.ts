import { z } from "zod";

/** Signed-in Google account, as shown in the UI. */
export const sessionUserSchema = z.object({
  /** Google account id (`sub` claim). */
  id: z.string().min(1),
  email: z.email(),
  name: z.string().nullable(),
  picture: z.url().nullable(),
});

export const oauthTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  /** Epoch milliseconds. */
  expiresAt: z.number().int().positive(),
  scope: z.string(),
});

/** Contents of the encrypted session cookie. Re-validated on every read. */
export const sessionDataSchema = z.object({
  user: sessionUserSchema,
  tokens: oauthTokensSchema,
});

/** Short-lived cookie bridging /login → Google → /callback. */
export const oauthStateSchema = z.object({
  state: z.string().min(16),
  codeVerifier: z.string().min(43),
  returnTo: z.string(),
});

/** Only same-origin absolute paths, so the callback can't become an open redirect. */
export const returnToSchema = z
  .string()
  .regex(/^\/(?!\/)[^\s\\]*$/, "returnTo must be a same-origin path")
  .catch("/");

export const loginQuerySchema = z.object({
  returnTo: returnToSchema.default("/"),
});

export const oauthCallbackQuerySchema = z.union([
  z.object({ code: z.string().min(1), state: z.string().min(1) }),
  z.object({ error: z.string().min(1) }),
]);

/** Claims we rely on from Google's verified ID token. */
export const googleIdTokenClaimsSchema = z.object({
  sub: z.string().min(1),
  email: z.email(),
  email_verified: z.boolean(),
  name: z.string().optional(),
  picture: z.url().optional(),
});

/** Reasons surfaced on /login?error=… */
export const authErrorReasonSchema = z.enum([
  "access_denied",
  "missing_scope",
  "state_mismatch",
  "no_refresh_token",
  "unverified_email",
  "session_expired",
  "unknown",
]);

export const sessionResponseSchema = z.discriminatedUnion("authenticated", [
  z.object({ authenticated: z.literal(true), user: sessionUserSchema }),
  z.object({ authenticated: z.literal(false) }),
]);

export type SessionUser = z.infer<typeof sessionUserSchema>;
export type OAuthTokens = z.infer<typeof oauthTokensSchema>;
export type SessionData = z.infer<typeof sessionDataSchema>;
export type OAuthState = z.infer<typeof oauthStateSchema>;
export type AuthErrorReason = z.infer<typeof authErrorReasonSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
