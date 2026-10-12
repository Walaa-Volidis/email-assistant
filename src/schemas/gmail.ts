import { z } from "zod";

/** Mailbox profile; also the cheapest call that proves the token works. */
export const gmailProfileSchema = z.object({
  email: z.email(),
  messagesTotal: z.number().int().nonnegative(),
  threadsTotal: z.number().int().nonnegative(),
});

export type GmailProfile = z.infer<typeof gmailProfileSchema>;
