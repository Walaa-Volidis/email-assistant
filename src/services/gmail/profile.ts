import "server-only";

import { fromGoogleError } from "@/lib/api/errors";
import { type GmailContext } from "@/services/gmail/client";
import { ZGmailProfileSchema, type GmailProfile } from "@/schemas/gmail";

export async function getGmailProfile({ gmail }: GmailContext): Promise<GmailProfile> {
  try {
    const { data } = await gmail.users.getProfile({ userId: "me" });
    return ZGmailProfileSchema.parse({
      email: data.emailAddress,
      messagesTotal: data.messagesTotal ?? 0,
      threadsTotal: data.threadsTotal ?? 0,
    });
  } catch (error) {
    throw fromGoogleError(error);
  }
}
