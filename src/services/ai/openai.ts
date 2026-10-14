import "server-only";

import { createHash } from "node:crypto";

import OpenAI, {
  APIConnectionError,
  APIError,
  AuthenticationError,
  PermissionDeniedError,
  RateLimitError,
} from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { type z } from "zod";

import { AppError } from "@/lib/api/errors";
import { getOpenAIEnv } from "@/lib/env";

let client: OpenAI | undefined;

function getClient(): OpenAI {
  client ??= new OpenAI({
    apiKey: getOpenAIEnv().OPENAI_API_KEY,
    timeout: 45_000,
    maxRetries: 2,
  });
  return client;
}

type StructuredRequest<T extends z.ZodType> = {
  /** Response format name sent to OpenAI, e.g. "thread_summary". */
  name: string;
  schema: T;
  instructions: string;
  input: string;
  /** Opaque per-user id; hashed before it leaves the server. */
  userId: string;
  maxOutputTokens?: number;
};

/**
 * Runs one structured-output request: the Zod schema becomes the strict
 * JSON schema OpenAI must follow, and the reply is parsed back through the
 * same schema, so callers receive fully typed, validated data or an AppError.
 */
export async function generateStructured<T extends z.ZodType>({
  name,
  schema,
  instructions,
  input,
  userId,
  maxOutputTokens = 4_000,
}: StructuredRequest<T>): Promise<z.infer<T>> {
  let response;
  try {
    response = await getClient().responses.parse({
      model: getOpenAIEnv().OPENAI_MODEL,
      instructions,
      input,
      text: { format: zodTextFormat(schema, name) },
      reasoning: { effort: "low" },
      max_output_tokens: maxOutputTokens,
      // Email content is personal data: don't retain it on OpenAI's side.
      store: false,
      safety_identifier: createHash("sha256").update(userId).digest("hex").slice(0, 32),
    });
  } catch (error) {
    throw fromOpenAIError(error);
  }

  if (response.status === "incomplete") {
    console.warn("[ai] incomplete response", name, response.incomplete_details);
    throw new AppError(
      "UPSTREAM_ERROR",
      response.incomplete_details?.reason === "max_output_tokens"
        ? "This thread is too long for the assistant. Try a shorter thread."
        : "The assistant stopped before finishing. Try again.",
    );
  }

  const refusal = response.output
    .flatMap((item) => (item.type === "message" ? item.content : []))
    .find((part) => part.type === "refusal");
  if (refusal) {
    throw new AppError("UPSTREAM_ERROR", "The assistant declined to process this thread.");
  }

  // The SDK already parsed with the schema; parse again so the return type
  // is guaranteed by our schema, not by the SDK's inference.
  const parsed = schema.safeParse(response.output_parsed);
  if (!parsed.success) {
    console.error("[ai] response failed schema validation", name, parsed.error.issues);
    throw new AppError("UPSTREAM_ERROR", "The assistant returned an unexpected answer. Try again.");
  }
  return parsed.data;
}

export function fromOpenAIError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  // OpenAI reports an empty balance as a 429, but waiting won't fix it.
  if (
    error instanceof RateLimitError &&
    (error.code === "insufficient_quota" || error.code === "credit_balance_exhausted")
  ) {
    console.error("[ai] OpenAI account has no credits", error.code);
    return new AppError("INTERNAL", "The assistant's OpenAI account is out of credits.");
  }
  if (error instanceof RateLimitError) {
    return new AppError("RATE_LIMITED", "The assistant is busy right now. Try again in a moment.");
  }
  if (error instanceof AuthenticationError || error instanceof PermissionDeniedError) {
    // Our key or model access is wrong: a server problem, not the user's.
    console.error("[ai] OpenAI rejected credentials", error.status, error.message);
    return new AppError("INTERNAL", "The assistant isn't configured correctly.");
  }
  if (error instanceof APIConnectionError) {
    return new AppError("UPSTREAM_ERROR", "Couldn't reach the assistant. Check your connection and try again.");
  }
  if (error instanceof APIError) {
    console.error("[ai] OpenAI API error", error.status, error.message);
    return new AppError("UPSTREAM_ERROR", "The assistant ran into a problem. Try again.");
  }
  console.error("[ai] unexpected error", error);
  return new AppError("UPSTREAM_ERROR", "The assistant returned an unexpected answer. Try again.");
}
