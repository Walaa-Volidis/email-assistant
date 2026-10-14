import { type gmail_v1 } from "@googleapis/gmail";
import { describe, expect, it } from "vitest";

import { toEmailThread } from "@/services/gmail/normalize";

const b64 = (text: string) => Buffer.from(text, "utf8").toString("base64url");

function message(overrides: Partial<gmail_v1.Schema$Message>): gmail_v1.Schema$Message {
  return {
    id: "m1",
    threadId: "t1",
    labelIds: ["INBOX"],
    snippet: "Hi Alex, here&#39;s the deck",
    internalDate: String(Date.parse("2026-10-10T08:00:00Z")),
    payload: {
      mimeType: "multipart/mixed",
      headers: [
        { name: "From", value: "Maya Chen <maya@acme.com>" },
        { name: "To", value: "alex@northwind.io" },
        { name: "Subject", value: "Q4 renewal" },
        { name: "Message-ID", value: "<abc@acme.com>" },
      ],
      parts: [
        {
          mimeType: "multipart/alternative",
          parts: [
            { mimeType: "text/plain", body: { data: b64("Hi Alex,\nhere's the deck.") } },
            { mimeType: "text/html", body: { data: b64("<p>Hi Alex,</p><p>here&#39;s the deck.</p>") } },
          ],
        },
        {
          mimeType: "application/pdf",
          filename: "deck.pdf",
          body: { attachmentId: "att-1", size: 2048 },
        },
      ],
    },
    ...overrides,
  };
}

describe("toEmailThread", () => {
  it("normalizes a multipart Gmail thread", () => {
    const thread = toEmailThread({
      id: "t1",
      messages: [
        message({ id: "m2", internalDate: String(Date.parse("2026-10-11T09:00:00Z")), labelIds: ["INBOX", "UNREAD"] }),
        message({}),
      ],
    });

    expect(thread).not.toBeNull();
    expect(thread!.messages.map((m) => m.id)).toEqual(["m1", "m2"]); // sorted oldest first
    expect(thread!.messageCount).toBe(2);
    expect(thread!.isUnread).toBe(true);
    expect(thread!.hasAttachments).toBe(true);
    expect(thread!.lastMessageAt).toBe("2026-10-11T09:00:00.000Z");

    const first = thread!.messages[0]!;
    expect(first.from).toEqual({ name: "Maya Chen", email: "maya@acme.com" });
    expect(first.bodyText).toBe("Hi Alex,\nhere's the deck.");
    expect(first.snippet).toBe("Hi Alex, here's the deck");
    expect(first.rfcMessageId).toBe("<abc@acme.com>");
    expect(first.attachments).toEqual([
      { id: "att-1", filename: "deck.pdf", mimeType: "application/pdf", sizeBytes: 2048 },
    ]);
  });

  it("falls back to HTML converted to text", () => {
    const thread = toEmailThread({
      id: "t1",
      messages: [
        message({
          payload: {
            mimeType: "text/html",
            headers: [{ name: "From", value: "a@b.com" }],
            body: { data: b64("<div>Line one<br>Line &amp; two</div><style>p{}</style>") },
          },
        }),
      ],
    });
    expect(thread!.messages[0]!.bodyText).toBe("Line one\nLine & two");
    expect(thread!.subject).toBe("(no subject)");
  });

  it("returns null for a thread without messages", () => {
    expect(toEmailThread({ id: "t1", messages: [] })).toBeNull();
  });
});

describe("toEmailThread dates", () => {
  it("survives a malformed Date header with no internalDate", () => {
    const thread = toEmailThread({
      id: "t9",
      messages: [{ id: "m9", threadId: "t9", payload: { headers: [{ name: "Date", value: "not a date" }, { name: "From", value: "a@b.com" }] } }],
    });
    expect(thread!.messages[0]!.sentAt).toBe("1970-01-01T00:00:00.000Z");
  });
});
