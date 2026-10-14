import { z } from "zod";

/** Signed-in Google account, as shown in the UI. */
export const ZSessionUserSchema = z.object({
  /** Google account id (`sub` claim). */
  id: z.string().min(1),
  email: z.email(),
  name: z.string().nullable(),
  picture: z.url().nullable(),
});

export const ZOauthTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  /** Epoch milliseconds. */
  expiresAt: z.number().int().positive(),
  scope: z.string(),
});

/** Contents of the encrypted session cookie. Re-validated on every read. */
export const ZSessionDataSchema = z.object({
  user: ZSessionUserSchema,
  tokens: ZOauthTokensSchema,
});

/** Short-lived cookie bridging /login → Google → /callback. */
export const ZOauthStateSchema = z.object({
  state: z.string().min(16),
  codeVerifier: z.string().min(43),
  returnTo: z.string(),
});

/** Only same-origin absolute paths, so the callback can't become an open redirect. */
export const ZReturnToSchema = z
  .string()
  .regex(/^\/(?!\/)[^\s\\]*$/, "returnTo must be a same-origin path")
  .catch("/");

export const ZLoginQuerySchema = z.object({
  returnTo: ZReturnToSchema.default("/"),
});

export const ZOauthCallbackQuerySchema = z.union([
  z.object({ code: z.string().min(1), state: z.string().min(1) }),
  z.object({ error: z.string().min(1) }),
]);

/** Claims we rely on from Google's verified ID token. */
export const ZGoogleIdTokenClaimsSchema = z.object({
  sub: z.string().min(1),
  email: z.email(),
  email_verified: z.boolean(),
  name: z.string().optional(),
  picture: z.url().optional(),
});

/** Reasons surfaced on /login?error=… */
export const ZAuthErrorReasonSchema = z.enum([
  "access_denied",
  "missing_scope",
  "state_mismatch",
  "no_refresh_token",
  "unverified_email",
  "session_expired",
  "unknown",
]);

export const ZSessionResponseSchema = z.discriminatedUnion("authenticated", [
  z.object({ authenticated: z.literal(true), user: ZSessionUserSchema }),
  z.object({ authenticated: z.literal(false) }),
]);

export const ZSignOutResponseSchema = z.object({ signedOut: z.literal(true) });

export type SessionUser = z.infer<typeof ZSessionUserSchema>;
export type OAuthTokens = z.infer<typeof ZOauthTokensSchema>;
export type SessionData = z.infer<typeof ZSessionDataSchema>;
export type OAuthState = z.infer<typeof ZOauthStateSchema>;
export type AuthErrorReason = z.infer<typeof ZAuthErrorReasonSchema>;
export type SessionResponse = z.infer<typeof ZSessionResponseSchema>;
export type SignOutResponse = z.infer<typeof ZSignOutResponseSchema>;
