import { describe, expect, it } from "vitest";

import { decodeEncodedWords, parseAddressList } from "@/services/gmail/address";

describe("parseAddressList", () => {
  it("handles quoted names containing commas", () => {
    expect(parseAddressList('"Doe, Jane" <Jane@Example.com>, bob@example.org')).toEqual([
      { name: "Doe, Jane", email: "jane@example.com" },
      { name: null, email: "bob@example.org" },
    ]);
  });

  it("drops entries that aren't addresses", () => {
    expect(parseAddressList("undisclosed-recipients:;")).toEqual([]);
    expect(parseAddressList(null)).toEqual([]);
  });

  it("decodes RFC 2047 names", () => {
    expect(parseAddressList("=?UTF-8?B?SsO2cmc=?= <jorg@example.de>")).toEqual([
      { name: "Jörg", email: "jorg@example.de" },
    ]);
  });
});

describe("decodeEncodedWords", () => {
  it("decodes Q-encoding", () => {
    expect(decodeEncodedWords("=?UTF-8?Q?Caf=C3=A9_menu?=")).toBe("Café menu");
  });
});

describe("parseAddressList spoofing", () => {
  it("doesn't let an encoded display name inject another address", () => {
    const name = Buffer.from('"a" <ceo@corp.com>, "b"').toString("base64");
    const parsed = parseAddressList(`=?UTF-8?B?${name}?= <attacker@evil.com>`);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.email).toBe("attacker@evil.com");
  });
});
