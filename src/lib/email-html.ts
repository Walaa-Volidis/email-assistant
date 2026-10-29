import DOMPurify from "dompurify";

/*
 * Turns an email's HTML into a self-contained document for a sandboxed
 * iframe. Three layers, each enough on its own to stop the worst cases:
 *
 * 1. DOMPurify strips scripts, event handlers, forms and embeds.
 * 2. The iframe sandbox has no `allow-scripts`, so nothing can run anyway.
 * 3. A CSP meta tag blocks every network request except, when the reader
 *    opts in, images. Remote images are off by default because senders use
 *    them to track opens.
 */

export type EmailDocumentOptions = { allowRemoteImages: boolean };

/** True when the HTML references images that would load from the network. */
export function hasRemoteImages(html: string): boolean {
  return /<img[^>]+src\s*=\s*["']?\s*(https?:)?\/\//i.test(html) || /url\(\s*["']?\s*(https?:)?\/\//i.test(html);
}

export function sanitizeEmailHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: false,
    FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select", "iframe", "object", "embed", "base", "meta", "link"],
    FORBID_ATTR: ["srcset"],
    ALLOW_DATA_ATTR: false,
  });
}

export function buildEmailDocument(html: string, { allowRemoteImages }: EmailDocumentOptions): string {
  const imgSrc = allowRemoteImages ? "data: cid: https: http:" : "data: cid:";
  const csp = `default-src 'none'; img-src ${imgSrc}; style-src 'unsafe-inline'; font-src data:`;

  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<base target="_blank">
<style>
  html,body{margin:0;padding:0;background:#fff;color:#1f2329;}
  body{padding:12px 16px;font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;overflow-wrap:anywhere;}
  img{max-width:100%;height:auto;}
  table{max-width:100%;}
  a{color:#2557c4;}
  blockquote{margin:0 0 0 .5em;padding-left:.75em;border-left:2px solid #d9dde3;color:#5b6370;}
</style></head><body>${sanitizeEmailHtml(html)}</body></html>`;
}
