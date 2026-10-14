import { describe, expect, it } from "vitest";

import { parseRecipients } from "@/lib/recipients";

describe("parseRecipients", () => {
  it("accepts bare and named addresses separated by commas or semicolons", () => {
    expect(parseRecipients(' a@b.com ; "Maya Chen" <Maya@Acme.com>, ')).toEqual({
      addresses: [
        { name: null, email: "a@b.com" },
        { name: "Maya Chen", email: "maya@acme.com" },
      ],
      invalid: [],
    });
  });

  it("reports entries that aren't email addresses", () => {
    expect(parseRecipients("maya, tom@acme.com").invalid).toEqual(["maya"]);
  });
});
