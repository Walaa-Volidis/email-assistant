import { z } from "zod";

export const ZApiErrorCodeSchema = z.enum([
  "BAD_REQUEST",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "RATE_LIMITED",
  "UPSTREAM_ERROR",
  "INTERNAL",
]);

export const ZApiErrorSchema = z.object({
  code: ZApiErrorCodeSchema,
  message: z.string(),
  /** Per-field messages from a failed Zod parse, keyed by dotted path. */
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});

/**
 * Every route handler responds with this envelope, so the client can
 * narrow on `ok` and parse `data` with the route's own schema.
 */
export function ZApiResponseSchema<T extends z.ZodType>(data: T) {
  return z.discriminatedUnion("ok", [
    z.object({ ok: z.literal(true), data }),
    z.object({ ok: z.literal(false), error: ZApiErrorSchema }),
  ]);
}

export type ApiErrorCode = z.infer<typeof ZApiErrorCodeSchema>;
export type ApiError = z.infer<typeof ZApiErrorSchema>;
export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };
