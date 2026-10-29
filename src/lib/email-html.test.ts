// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { buildEmailDocument, hasRemoteImages, sanitizeEmailHtml } from "@/lib/email-html";

describe("sanitizeEmailHtml", () => {
  it("removes scripts, handlers, forms and embeds", () => {
    const clean = sanitizeEmailHtml(
      `<p onclick="steal()">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a>
       <form action="https://evil"><input name="pw"></form><iframe src="https://evil"></iframe>`,
    );
    expect(clean).toContain("<p>Hi</p>");
    expect(clean).not.toMatch(/script|onclick|javascript:|<form|<input|<iframe/i);
  });

  it("keeps ordinary formatting", () => {
    expect(sanitizeEmailHtml("<table><tr><td><b>Total</b></td></tr></table>")).toContain("<b>Total</b>");
  });
});

describe("buildEmailDocument", () => {
  it("blocks remote images unless allowed", () => {
    expect(buildEmailDocument("<p>x</p>", { allowRemoteImages: false })).toContain("img-src data: cid:;");
    expect(buildEmailDocument("<p>x</p>", { allowRemoteImages: true })).toContain("img-src data: cid: https: http:;");
  });

  it("never allows scripts or outbound connections", () => {
    const doc = buildEmailDocument("<p>x</p>", { allowRemoteImages: true });
    expect(doc).toContain("default-src 'none'");
    expect(doc).not.toMatch(/script-src|connect-src/);
  });
});

describe("hasRemoteImages", () => {
  it("detects network images but not inline ones", () => {
    expect(hasRemoteImages('<img src="https://t.co/pixel.gif">')).toBe(true);
    expect(hasRemoteImages('<div style="background:url(//cdn.x/a.png)">')).toBe(true);
    expect(hasRemoteImages('<img src="data:image/png;base64,AAA">')).toBe(false);
    expect(hasRemoteImages('<img src="cid:logo">')).toBe(false);
  });
});
