import { describe, expect, it } from "vitest";

import { sampleThreads } from "@/lib/fixtures/threads";
import { isAwaitingReply } from "@/services/gmail/threads";

const now = Date.parse("2026-10-12T12:00:00Z");
const intro = sampleThreads.find((t) => t.id === "18f2a07")!; // Alex sent last, Oct 6
const renewal = sampleThreads.find((t) => t.id === "18f2a01")!; // Maya replied last

describe("isAwaitingReply", () => {
  it("keeps threads where the user sent the last message days ago", () => {
    expect(isAwaitingReply(intro, "ALEX@northwind.io", now)).toBe(true);
  });

  it("drops threads where someone else spoke last", () => {
    expect(isAwaitingReply(renewal, "alex@northwind.io", now)).toBe(false);
  });

  it("waits two days before calling a reply overdue", () => {
    const fresh = { ...intro, lastMessageAt: "2026-10-11T12:00:00Z" };
    expect(isAwaitingReply(fresh, "alex@northwind.io", now)).toBe(false);
  });
});
