import { type EmailAddress } from "@/schemas/common";
import { type EmailMessage, type EmailThread } from "@/schemas/email";

/** Total characters of message bodies sent to the model (~8k tokens). */
export const THREAD_CHAR_BUDGET = 32_000;
/** Cap for a single message, so one pasted log can't crowd out the rest. */
export const MESSAGE_CHAR_CAP = 8_000;

const QUOTE_MARKERS = [
  /^On .{1,200}wrote:\s*$/m, // Gmail / Apple Mail
  /^-{2,}\s*Original Message\s*-{2,}/im, // Outlook
  /^From: .+\r?\n(Sent|Date): /m, // Outlook reply header
  /^_{10,}\s*$/m, // Outlook separator line
];

/**
 * Removes the quoted history replies drag along. The thread is sent message
 * by message, so quotes only repeat earlier text and waste budget.
 */
export function stripQuotedText(body: string): string {
  let text = body.replace(/\r\n/g, "\n");
  for (const marker of QUOTE_MARKERS) {
    const match = marker.exec(text);
    if (match && match.index > 0) text = text.slice(0, match.index);
  }
  return text
    .split("\n")
    .filter((line) => !line.startsWith(">"))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatAddress(address: EmailAddress, self: string): string {
  const label = address.name ? `${address.name} <${address.email}>` : address.email;
  return address.email.toLowerCase() === self ? `${label} (the user)` : label;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}\n[…truncated]`;
}

/**
 * Serializes a thread for the model. Newest messages keep their full body;
 * once the budget runs out, older ones are reduced to their snippet.
 */
export function serializeThread(thread: EmailThread, userEmail: string): string {
  const self = userEmail.toLowerCase();
  let remaining = THREAD_CHAR_BUDGET;

  const rendered = [...thread.messages].reverse().map((message: EmailMessage) => {
    const body = truncate(stripQuotedText(message.bodyText) || message.snippet, MESSAGE_CHAR_CAP);
    const fits = body.length <= remaining;
    remaining = Math.max(0, remaining - body.length);

    const header = [
      `From: ${formatAddress(message.from, self)}`,
      `To: ${message.to.map((a) => formatAddress(a, self)).join(", ") || "(none)"}`,
      message.cc.length > 0 ? `Cc: ${message.cc.map((a) => formatAddress(a, self)).join(", ")}` : null,
      `Date: ${message.sentAt}`,
      message.attachments.length > 0
        ? `Attachments: ${message.attachments.map((a) => a.filename).join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    return `${header}\n\n${fits ? body : `[earlier message, shortened] ${message.snippet}`}`;
  });

  const messages = rendered
    .reverse()
    .map((text, index) => `<message index="${index + 1}">\n${text}\n</message>`)
    .join("\n\n");

  return `<thread subject="${thread.subject.replace(/"/g, "'")}" messages="${thread.messageCount}">\n${messages}\n</thread>`;
}
