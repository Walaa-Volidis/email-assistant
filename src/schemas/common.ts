import { z } from "zod";

/** ISO-8601 timestamp with offset, e.g. 2026-10-12T09:41:00Z. */
export const ZIsoDateTimeSchema = z.iso.datetime({ offset: true });

/** Gmail message/thread ids are opaque hex strings. */
export const ZGmailIdSchema = z.string().regex(/^[a-zA-Z0-9]+$/, "Invalid Gmail id");

export const ZEmailAddressSchema = z.object({
  name: z.string().trim().min(1).nullable(),
  email: z.email(),
});

export type IsoDateTime = z.infer<typeof ZIsoDateTimeSchema>;
export type GmailId = z.infer<typeof ZGmailIdSchema>;
export type EmailAddress = z.infer<typeof ZEmailAddressSchema>;
