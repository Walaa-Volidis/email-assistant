import "server-only";

import { type gmail_v1 } from "@googleapis/gmail";

import { AppError, fromGoogleError } from "@/lib/api/errors";
import { type GmailContext } from "@/services/gmail/client";
import { toEmailThread } from "@/services/gmail/normalize";
import { type EmailThread } from "@/schemas/email";

export async function getThread({ gmail }: GmailContext, threadId: string): Promise<EmailThread> {
  let data: gmail_v1.Schema$Thread;
  try {
    ({ data } = await gmail.users.threads.get({ userId: "me", id: threadId, format: "full" }));
  } catch (error) {
    throw fromGoogleError(error);
  }

  const thread = toEmailThread(data);
  if (!thread) throw new AppError("NOT_FOUND", "That thread has no readable messages.");
  return thread;
}
