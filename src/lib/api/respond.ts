import "server-only";

import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";

import { AppError } from "@/lib/api/errors";
import { type ApiResponse } from "@/schemas/api";

/*
 * Route convention: every handler validates its own input with
 * `ZSomethingSchema.safeParse(...)` (returning `fail(badRequest(error))` on
 * failure) and its output with `ZSomethingSchema.parse(...)` before `ok()`.
 * An output that fails to parse is our bug, so it surfaces as a 500 here.
 */

export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(error: AppError): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      ok: false,
      error: { code: error.code, message: error.message, fieldErrors: error.fieldErrors },
    },
    { status: error.status },
  );
}

/** The request body as unknown JSON, or null if it isn't JSON; Zod decides what's valid. */
export async function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}

/** Query string as a plain object, ready for a Zod schema. */
export function readQuery(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams);
}

/**
 * Wraps a route handler so every failure leaves as the standard envelope.
 * Unknown errors (including a ZodError from an output parse) are logged and
 * reported as INTERNAL without leaking detail.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      // Let Next's control-flow errors (redirect, dynamic bailout) through.
      unstable_rethrow(error);
      if (error instanceof AppError) return fail(error);
      console.error("[api] unhandled error", error);
      return fail(new AppError("INTERNAL", "Something went wrong."));
    }
  };
}
