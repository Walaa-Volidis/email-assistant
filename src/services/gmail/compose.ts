import { type EmailAddress } from "@/schemas/common";

/** Header values must never carry line breaks: that's how header injection works. */
function singleLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

/** RFC 2047 B-encoding for header text that isn't plain ASCII. */
export function encodeHeaderText(value: string): string {
  const clean = singleLine(value);
  if (/^[\x20-\x7e]*$/.test(clean)) return clean;
  return `=?UTF-8?B?${Buffer.from(clean, "utf8").toString("base64")}?=`;
}

export function formatAddress({ name, email }: EmailAddress): string {
  if (!name) return email;
  const encoded = encodeHeaderText(name);
  const display = encoded.startsWith("=?") ? encoded : `"${encoded.replace(/(["\\])/g, "\\$1")}"`;
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
export function buildReplyMime({ to, cc, subject, body, inReplyTo, references }: ReplyMime): string {
  const headers = [
    `To: ${to.map(formatAddress).join(", ")}`,
    cc.length > 0 ? `Cc: ${cc.map(formatAddress).join(", ")}` : null,
    `Subject: ${encodeHeaderText(replySubject(subject))}`,
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
