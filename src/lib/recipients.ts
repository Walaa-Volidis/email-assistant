import { ZEmailAddressSchema, type EmailAddress } from "@/schemas/common";

export type ParsedRecipients = { addresses: EmailAddress[]; invalid: string[] };

/**
 * Parses what a person types in a To/Cc field: `a@b.com, Maya Chen <m@x.com>`,
 * separated by commas or semicolons. Each entry is validated with Zod; the
 * ones that fail are returned so the form can name them.
 */
export function parseRecipients(input: string): ParsedRecipients {
  const addresses: EmailAddress[] = [];
  const invalid: string[] = [];

  for (const entry of input.split(/[,;]/).map((part) => part.trim()).filter(Boolean)) {
    const angled = entry.match(/^(.*?)<([^>]+)>$/);
    const name = angled ? angled[1]!.trim().replace(/^"(.*)"$/, "$1").trim() : "";
    const email = (angled ? angled[2]! : entry).trim().toLowerCase();
    const parsed = ZEmailAddressSchema.safeParse({ name: name || null, email });
    if (parsed.success) addresses.push(parsed.data);
    else invalid.push(entry);
  }
  return { addresses, invalid };
}
