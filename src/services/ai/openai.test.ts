import type * as OpenAIModule from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { followUpSuggestionsSchema, replyDraftSchema, threadSummarySchema } from "@/schemas/ai";

const parseMock = vi.fn();

vi.mock("openai", async (importActual) => {
  const actual = await importActual<typeof OpenAIModule>();
  class FakeOpenAI {
    responses = { parse: parseMock };
  }
  return { ...actual, default: FakeOpenAI };
});

process.env.OPENAI_API_KEY = "sk-test";
process.env.OPENAI_MODEL = "gpt-5-mini";

const { generateStructured } = await import("@/services/ai/openai");
const { RateLimitError, AuthenticationError } = await import("openai");

type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JsonSchema;
  anyOf?: JsonSchema[];
};

/** Strict mode: every object lists all its properties as required and forbids extras. */
function assertStrict(schema: JsonSchema, path = "$"): void {
  if (schema.type === "object" && schema.properties) {
    expect(schema.additionalProperties, `${path} additionalProperties`).toBe(false);
    expect([...(schema.required ?? [])].sort(), `${path} required`).toEqual(
      Object.keys(schema.properties).sort(),
    );
    for (const [key, child] of Object.entries(schema.properties)) assertStrict(child, `${path}.${key}`);
  }
  if (schema.items) assertStrict(schema.items, `${path}[]`);
  schema.anyOf?.forEach((child, i) => assertStrict(child, `${path}|${i}`));
}

describe("AI output schemas", () => {
  it.each([
    ["thread_summary", threadSummarySchema],
    ["reply_draft", replyDraftSchema],
    ["follow_up_suggestions", followUpSuggestionsSchema],
  ] as const)("%s converts to a strict JSON schema", (name, schema) => {
    const format = zodTextFormat(schema, name);
    expect(format.strict).toBe(true);
    assertStrict(format.schema as JsonSchema);
  });
});

const summary = {
  tldr: "Acme needs the overage rate.",
  keyPoints: ["Peak runs 30% over cap"],
  actionItems: [{ task: "Send rate", owner: "You", dueDate: null }],
  openQuestions: [],
  sentiment: "urgent",
  detectedTone: "friendly",
  needsReply: true,
};

const request = {
  name: "thread_summary",
  schema: threadSummarySchema,
  instructions: "x",
  input: "<thread/>",
  userId: "user-1",
};

describe("generateStructured", () => {
  beforeEach(() => parseMock.mockReset());

  it("returns validated data and sends privacy-preserving options", async () => {
    parseMock.mockResolvedValue({ status: "completed", output: [], output_parsed: summary });
    await expect(generateStructured(request)).resolves.toEqual(summary);

    const body = parseMock.mock.calls[0]![0];
    expect(body.store).toBe(false);
    expect(body.model).toBe("gpt-5-mini");
    expect(body.safety_identifier).toMatch(/^[0-9a-f]{32}$/);
    expect(body.safety_identifier).not.toContain("user-1");
  });

  it("rejects output that doesn't match the schema", async () => {
    parseMock.mockResolvedValue({
      status: "completed",
      output: [],
      output_parsed: { ...summary, sentiment: "ecstatic" },
    });
    await expect(generateStructured(request)).rejects.toMatchObject({ code: "UPSTREAM_ERROR" });
  });

  it("reports a truncated answer", async () => {
    parseMock.mockResolvedValue({
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
      output: [],
      output_parsed: null,
    });
    await expect(generateStructured(request)).rejects.toMatchObject({
      code: "UPSTREAM_ERROR",
      message: expect.stringContaining("too long"),
    });
  });

  it("reports a refusal", async () => {
    parseMock.mockResolvedValue({
      status: "completed",
      output: [{ type: "message", content: [{ type: "refusal", refusal: "no" }] }],
      output_parsed: null,
    });
    await expect(generateStructured(request)).rejects.toMatchObject({
      message: expect.stringContaining("declined"),
    });
  });

  it("maps rate limits and bad credentials", async () => {
    parseMock.mockRejectedValueOnce(new RateLimitError(429, undefined, "slow down", new Headers()));
    await expect(generateStructured(request)).rejects.toMatchObject({ code: "RATE_LIMITED" });

    vi.spyOn(console, "error").mockImplementation(() => {});
    parseMock.mockRejectedValueOnce(
      new RateLimitError(429, { code: "credit_balance_exhausted" }, "no credits", new Headers()),
    );
    await expect(generateStructured(request)).rejects.toMatchObject({
      code: "INTERNAL",
      message: expect.stringContaining("out of credits"),
    });

    parseMock.mockRejectedValueOnce(new AuthenticationError(401, undefined, "bad key", new Headers()));
    await expect(generateStructured(request)).rejects.toMatchObject({ code: "INTERNAL" });
  });
});
