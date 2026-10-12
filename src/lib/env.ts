import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),

  /** Encrypts the session cookie that holds Gmail OAuth tokens. */
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.url(),

  OPENAI_API_KEY: z.string().startsWith("sk-", "OPENAI_API_KEY should start with sk-"),
  OPENAI_MODEL: z.string().min(1).default("gpt-5-mini"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/**
 * Validated server environment. Parsed lazily on first use so `next build`
 * doesn't need secrets, but any request touching Gmail/OpenAI fails loudly
 * with every missing variable listed at once.
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }

  cached = result.data;
  return cached;
}
