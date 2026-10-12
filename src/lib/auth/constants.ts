/**
 * `gmail.modify` covers read, label changes (read/archive/star) and send,
 * but not permanent deletion. It is a restricted scope: unverified apps are
 * limited to test users listed on the OAuth consent screen.
 */
export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.modify";

export const OAUTH_SCOPES = ["openid", "email", "profile", GMAIL_SCOPE] as const;

export const SESSION_COOKIE = "relay_session";
export const OAUTH_STATE_COOKIE = "relay_oauth";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
export const OAUTH_STATE_TTL_SECONDS = 60 * 10;

/** Refresh this long before expiry so a request never races the deadline. */
export const ACCESS_TOKEN_SKEW_MS = 60_000;
