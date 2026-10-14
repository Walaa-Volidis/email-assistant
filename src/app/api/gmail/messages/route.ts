import { badRequest } from "@/lib/api/errors";
import { fail, ok, readJson, withErrorHandling } from "@/lib/api/respond";
import { getGmailContext } from "@/services/gmail/client";
import { sendMessage } from "@/services/gmail/threads";
import { ZComposeRequestSchema, ZSentMessageSchema } from "@/schemas/email";

/** POST /api/gmail/messages { to, cc?, subject?, body } → SentMessage */
export const POST = withErrorHandling(async (request: Request) => {
  const input = ZComposeRequestSchema.safeParse(await readJson(request));
  if (!input.success) return fail(badRequest(input.error));

  const context = await getGmailContext();
  const sent = await sendMessage(context, input.data);
  return ok(ZSentMessageSchema.parse(sent));
});
