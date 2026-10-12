import { z } from "zod";

export const apiErrorCodeSchema = z.enum([
  "BAD_REQUEST",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "RATE_LIMITED",
  "UPSTREAM_ERROR",
  "INTERNAL",
]);

export const apiErrorSchema = z.object({
  code: apiErrorCodeSchema,
  message: z.string(),
  /** Per-field messages from a failed Zod parse, keyed by dotted path. */
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});

/**
 * Every route handler responds with this envelope, so the client can
 * narrow on `ok` and parse `data` with the route's own schema.
 */
export function apiResponseSchema<T extends z.ZodType>(data: T) {
  return z.discriminatedUnion("ok", [
    z.object({ ok: z.literal(true), data }),
    z.object({ ok: z.literal(false), error: apiErrorSchema }),
  ]);
}

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };
