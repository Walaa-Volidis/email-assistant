import { z } from "zod";

import { type ApiErrorCode } from "@/schemas/api";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  UPSTREAM_ERROR: 502,
  INTERNAL: 500,
};

/** An error that is safe to show the client, with its HTTP status. */
export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS_BY_CODE[code];
  }
}

/** Turns a failed safeParse of request input into a 400 listing each bad field. */
export function badRequest(error: z.ZodError): AppError {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_root";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return new AppError("BAD_REQUEST", "Invalid request", fieldErrors);
}

/** Shape of a Google API (Gaxios) failure, parsed instead of cast. */
const ZGoogleApiErrorSchema = z.object({
  status: z.number().optional(),
  response: z
    .object({
      status: z.number(),
      data: z
        .object({
          error: z.union([z.string(), z.object({ message: z.string() })]).optional(),
        })
        .optional(),
    })
    .optional(),
});

/** True when Google rejected the refresh token (revoked, expired, password change). */
export function isInvalidGrant(error: unknown): boolean {
  const parsed = ZGoogleApiErrorSchema.safeParse(error);
  return parsed.success && parsed.data.response?.data?.error === "invalid_grant";
}

/** Maps a Google API failure onto our error codes. */
export function fromGoogleError(error: unknown): AppError {
  const parsed = ZGoogleApiErrorSchema.safeParse(error);
  const status = parsed.success ? (parsed.data.response?.status ?? parsed.data.status) : undefined;

  switch (status) {
    case 401:
      return new AppError("UNAUTHENTICATED", "Your Google session has expired. Sign in again.");
    case 403:
      return new AppError("FORBIDDEN", "Google denied access to this mailbox.");
    case 404:
      return new AppError("NOT_FOUND", "That message no longer exists.");
    case 429:
      return new AppError("RATE_LIMITED", "Gmail is rate-limiting requests. Try again shortly.");
    default:
      return new AppError("UPSTREAM_ERROR", "Gmail didn't respond as expected.");
  }
}
