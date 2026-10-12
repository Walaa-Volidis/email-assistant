import "server-only";

import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { type z } from "zod";

import { AppError } from "@/lib/api/errors";
import { type ApiResponse } from "@/schemas/api";

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

/** Parses input or throws a BAD_REQUEST AppError carrying per-field messages. */
export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "_root";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    throw new AppError("BAD_REQUEST", "Invalid request", fieldErrors);
  }
  return result.data;
}

/** Reads a JSON body and validates it; malformed JSON is a BAD_REQUEST too. */
export async function parseJsonBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError("BAD_REQUEST", "Request body must be valid JSON");
  }
  return parseOrThrow(schema, body);
}

/**
 * Wraps a route handler so every failure leaves as the standard envelope.
 * Unknown errors are logged and reported as INTERNAL without leaking detail.
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
