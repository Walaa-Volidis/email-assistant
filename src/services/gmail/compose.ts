import { type EmailAddress } from "@/schemas/common";

/** Header values must never carry line breaks: that's how header injection works. */
function singleLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

/** RFC 2047 B-encoding for header text that isn't plain ASCII. */
export function encodeHeaderText(value: string): string {
  const clean = singleLine(value);
  return isPlainAscii(clean) ? clean : encodeWord(clean);
}

function isPlainAscii(value: string): boolean {
  return /^[\x20-\x7e]*$/.test(value);
}

function encodeWord(value: string): string {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

/**
 * ASCII names are always quoted (so commas, "<" or a leading "=?" can't add
 * recipients); anything else is B-encoded, which can't contain those either.
 */
export function formatAddress({ name, email }: EmailAddress): string {
  if (!name) return email;
  const clean = singleLine(name);
  const display = isPlainAscii(clean) ? `"${clean.replace(/(["\\])/g, "\\$1")}"` : encodeWord(clean);
  return `${display} <${email}>`;
}

export function replySubject(subject: string): string {
  const clean = singleLine(subject);
  return /^re:/i.test(clean) ? clean : `Re: ${clean}`;
}

type ReplyMime = {
  to: EmailAddress[];
  cc: EmailAddress[];
  subject: string;
  body: string;
  /** Message-ID of the message being answered, angle brackets included. */
  inReplyTo: string | null;
  /** That message's own References header, if any. */
  references: string | null;
};

/**
 * Builds an RFC 5322 plain-text reply. In-Reply-To and References keep it
 * threaded in every client, not just Gmail. Returns base64url for the API.
 */
export function buildReplyMime(reply: ReplyMime): string {
  return buildMessageMime({ ...reply, subject: replySubject(reply.subject) });
}

/** Builds a plain-text message that starts a new thread. */
export function buildNewMessageMime(message: Omit<ReplyMime, "inReplyTo" | "references">): string {
  return buildMessageMime({ ...message, inReplyTo: null, references: null });
}

function buildMessageMime({ to, cc, subject, body, inReplyTo, references }: ReplyMime): string {
  const headers = [
    `To: ${to.map(formatAddress).join(", ")}`,
    cc.length > 0 ? `Cc: ${cc.map(formatAddress).join(", ")}` : null,
    `Subject: ${encodeHeaderText(subject)}`,
    inReplyTo ? `In-Reply-To: ${singleLine(inReplyTo)}` : null,
    inReplyTo ? `References: ${singleLine([references, inReplyTo].filter(Boolean).join(" "))}` : null,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
  ].filter(Boolean);

  const encodedBody = Buffer.from(body.replace(/\r?\n/g, "\r\n"), "utf8")
    .toString("base64")
    .replace(/.{76}/g, "$&\r\n");

  return Buffer.from(`${headers.join("\r\n")}\r\n\r\n${encodedBody}`, "utf8").toString("base64url");
}
