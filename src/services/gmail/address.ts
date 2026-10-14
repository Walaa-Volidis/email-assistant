import { emailAddressSchema, type EmailAddress } from "@/schemas/common";

/** Decodes RFC 2047 encoded-words (=?UTF-8?B?…?= / =?UTF-8?Q?…?=) in a header value. */
export function decodeEncodedWords(value: string): string {
  return value.replace(
    /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g,
    (_match, charset: string, encoding: string, text: string) => {
      try {
        const bytes =
          encoding.toUpperCase() === "B"
            ? Buffer.from(text, "base64")
            : Buffer.from(
                text
                  .replace(/_/g, " ")
                  .replace(/=([0-9A-Fa-f]{2})/g, (_m, hex: string) =>
                    String.fromCharCode(parseInt(hex, 16)),
                  ),
                "latin1",
              );
        return new TextDecoder(charset).decode(bytes);
      } catch {
        return text;
      }
    },
  );
}

/** Splits on commas that aren't inside quotes or angle brackets. */
function splitAddressList(header: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;
  let inAngle = false;
  for (const char of header) {
    if (char === '"') inQuotes = !inQuotes;
    else if (char === "<" && !inQuotes) inAngle = true;
    else if (char === ">" && !inQuotes) inAngle = false;
    if (char === "," && !inQuotes && !inAngle) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
}

/**
 * Parses `"Doe, Jane" <jane@x.com>, bob@y.com` into addresses. Entries that
 * aren't valid addresses (e.g. `undisclosed-recipients:;`) are dropped.
 */
export function parseAddressList(header: string | null | undefined): EmailAddress[] {
  if (!header) return [];
  return splitAddressList(decodeEncodedWords(header)).flatMap((entry) => {
    const angled = entry.match(/^(.*?)<([^>]+)>\s*$/);
    const rawName = angled ? angled[1]!.trim().replace(/^"(.*)"$/, "$1").trim() : "";
    const email = (angled ? angled[2]! : entry).trim().toLowerCase();
    const parsed = emailAddressSchema.safeParse({ name: rawName || null, email });
    return parsed.success ? [parsed.data] : [];
  });
}
