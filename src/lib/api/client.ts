import { z } from "zod";

import { apiResponseSchema, type ApiErrorCode } from "@/schemas/api";

/** A failed API call, carrying the server's error code and user-facing message. */
export class ApiClientError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type FetchOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
};

/**
 * Calls one of our API routes and validates the envelope and payload with
 * `schema`. Resolves to typed data or throws ApiClientError; never returns
 * unvalidated JSON.
 */
export async function apiFetch<T extends z.ZodType>(
  url: string,
  schema: T,
  { method = "GET", body, signal }: FetchOptions = {},
): Promise<z.infer<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiClientError("UPSTREAM_ERROR", "You appear to be offline. Check your connection.", 0);
  }

  const unexpected = new ApiClientError("INTERNAL", "The server sent an unexpected response.", response.status);

  // Envelope first, then the payload, so each step narrows cleanly.
  const json: unknown = await response.json().catch(() => null);
  const envelope = apiResponseSchema(z.unknown()).safeParse(json);
  if (!envelope.success) throw unexpected;
  if (!envelope.data.ok) {
    throw new ApiClientError(envelope.data.error.code, envelope.data.error.message, response.status);
  }

  const payload = schema.safeParse(envelope.data.data);
  if (!payload.success) throw unexpected;
  return payload.data;
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiClientError ? error.message : "Something went wrong. Try again.";
}
