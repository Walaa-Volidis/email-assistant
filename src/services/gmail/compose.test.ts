import { describe, expect, it } from "vitest";

import { buildReplyMime, formatAddress, replySubject } from "@/services/gmail/compose";

function decode(raw: string) {
  const text = Buffer.from(raw, "base64url").toString("utf8");
  const [head, body] = text.split("\r\n\r\n");
  return { head: head!, body: Buffer.from(body!.replace(/\r\n/g, ""), "base64").toString("utf8") };
}

describe("buildReplyMime", () => {
  it("threads the reply and encodes the body", () => {
    const { head, body } = decode(
      buildReplyMime({
        to: [{ name: "Maya Chen", email: "maya@acme.com" }],
        cc: [],
        subject: "Q4 renewal",
        body: "Hi Maya,\nConfirmed — see you Thursday.",
        inReplyTo: "<b@acme.com>",
        references: "<a@acme.com>",
      }),
    );
    expect(head).toContain('To: "Maya Chen" <maya@acme.com>');
    expect(head).toContain("Subject: Re: Q4 renewal");
    expect(head).toContain("In-Reply-To: <b@acme.com>");
    expect(head).toContain("References: <a@acme.com> <b@acme.com>");
    expect(head).not.toContain("Cc:");
    expect(body).toBe("Hi Maya,\r\nConfirmed — see you Thursday.");
  });

  it("blocks header injection through the subject", () => {
    const { head } = decode(
      buildReplyMime({
        to: [{ name: null, email: "a@b.com" }],
        cc: [],
        subject: "Hi\r\nBcc: victim@evil.com",
        body: "x",
        inReplyTo: null,
        references: null,
      }),
    );
    expect(head.split("\r\n").some((line) => line.startsWith("Bcc:"))).toBe(false);
  });
});

describe("header helpers", () => {
  it("keeps an existing Re: prefix", () => {
    expect(replySubject("RE: Budget")).toBe("RE: Budget");
    expect(replySubject("Budget")).toBe("Re: Budget");
  });

  it("encodes non-ASCII names and escapes quotes", () => {
    expect(formatAddress({ name: "Jörg", email: "j@x.de" })).toBe("=?UTF-8?B?SsO2cmc=?= <j@x.de>");
    expect(formatAddress({ name: 'Sam "SO" Okafor', email: "s@x.co" })).toBe('"Sam \\"SO\\" Okafor" <s@x.co>');
  });
});
