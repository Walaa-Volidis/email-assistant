import "server-only";

import { z } from "zod";

/*
 * Environment is validated per feature, so signing in works before an
 * OpenAI key exists and `next build` never needs secrets. Each getter parses
 * lazily on first use and lists every missing variable at once.
 */

const appEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  /** Encrypts the session cookie that holds Gmail OAuth tokens. */
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
});

const googleEnvSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.url(),
});

const openAIEnvSchema = z.object({
  OPENAI_API_KEY: z.string().startsWith("sk-", "OPENAI_API_KEY should start with sk-"),
  OPENAI_MODEL: z.string().min(1).default("gpt-5-mini"),
});

export type AppEnv = z.infer<typeof appEnvSchema>;
export type GoogleEnv = z.infer<typeof googleEnvSchema>;
export type OpenAIEnv = z.infer<typeof openAIEnvSchema>;

function lazyEnv<T extends z.ZodType>(schema: T): () => z.infer<T> {
  let cached: z.infer<T> | undefined;
  return () => {
    if (cached) return cached;
    const result = schema.safeParse(process.env);
    if (!result.success) {
      throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
    }
    cached = result.data;
    return cached;
  };
}

export const getAppEnv = lazyEnv(appEnvSchema);
export const getGoogleEnv = lazyEnv(googleEnvSchema);
export const getOpenAIEnv = lazyEnv(openAIEnvSchema);
