import { type gmail_v1 } from "@googleapis/gmail";

import { type Attachment } from "@/schemas/email";

type Part = gmail_v1.Schema$MessagePart;

export function decodeBase64Url(data: string | null | undefined): string {
  if (!data) return "";
  return Buffer.from(data, "base64url").toString("utf8");
}

export function getHeader(part: Part | undefined, name: string): string | null {
  const lower = name.toLowerCase();
  return part?.headers?.find((h) => h.name?.toLowerCase() === lower)?.value ?? null;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (match, entity: string) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(parseInt(entity.slice(1), 10));
    return ENTITIES[entity] ?? match;
  });
}

/** Good-enough HTML → text for prompts and plain rendering; not a sanitizer. */
export function htmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h[1-6]|blockquote)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function walk(part: Part, visit: (part: Part) => void): void {
  visit(part);
  part.parts?.forEach((child) => walk(child, visit));
}

/** First inline text/plain and text/html bodies, skipping attachments. */
export function extractBodies(payload: Part | undefined): { text: string | null; html: string | null } {
  let text: string | null = null;
  let html: string | null = null;
  if (!payload) return { text, html };

  walk(payload, (part) => {
    if (part.filename) return;
    if (part.mimeType === "text/plain" && text === null && part.body?.data) {
      text = decodeBase64Url(part.body.data);
    } else if (part.mimeType === "text/html" && html === null && part.body?.data) {
      html = decodeBase64Url(part.body.data);
    }
  });
  return { text, html };
}

export function extractAttachments(payload: Part | undefined): Attachment[] {
  const attachments: Attachment[] = [];
  if (!payload) return attachments;
  walk(payload, (part) => {
    if (!part.filename || !part.body?.attachmentId) return;
    attachments.push({
      id: part.body.attachmentId,
      filename: part.filename,
      mimeType: part.mimeType ?? "application/octet-stream",
      sizeBytes: part.body.size ?? 0,
    });
  });
  return attachments;
}
