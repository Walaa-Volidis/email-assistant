import "server-only";

import { type gmail_v1 } from "@googleapis/gmail";

import { fromGoogleError } from "@/lib/api/errors";
import { type GmailContext } from "@/services/gmail/client";
import { ZGmailProfileSchema, type GmailProfile } from "@/schemas/gmail";

export async function getGmailProfile({ gmail }: GmailContext): Promise<GmailProfile> {
  let data: gmail_v1.Schema$Profile;
  try {
    ({ data } = await gmail.users.getProfile({ userId: "me" }));
  } catch (error) {
    throw fromGoogleError(error);
  }
  // Outside the try: a schema mismatch is our bug, not a Gmail failure.
  return ZGmailProfileSchema.parse({
    email: data.emailAddress,
    messagesTotal: data.messagesTotal ?? 0,
    threadsTotal: data.threadsTotal ?? 0,
  });
}
