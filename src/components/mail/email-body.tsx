"use client";

import { ImageOffIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { buildEmailDocument, hasRemoteImages } from "@/lib/email-html";

type EmailBodyProps = { text: string; html: string | null };

/** Renders the HTML part when there is one, otherwise the plain text. */
export function EmailBody({ text, html }: EmailBodyProps) {
  if (!html) {
    return (
      <div className="text-[0.85rem] leading-relaxed whitespace-pre-wrap text-foreground/90">{text}</div>
    );
  }
  return <HtmlBody html={html} />;
}

function HtmlBody({ html }: { html: string }) {
  const [allowImages, setAllowImages] = useState(false);
  const [height, setHeight] = useState(120);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const remote = useMemo(() => hasRemoteImages(html), [html]);
  const srcDoc = useMemo(() => buildEmailDocument(html, { allowRemoteImages: allowImages }), [html, allowImages]);

  // Same-origin (but script-less) sandbox lets us size the frame to its content.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let observer: ResizeObserver | undefined;
    const measure = () => {
      const body = frame.contentDocument?.body;
      if (!body) return;
      setHeight(Math.ceil(body.scrollHeight) + 2);
      observer?.disconnect();
      observer = new ResizeObserver(() => setHeight(Math.ceil(body.scrollHeight) + 2));
      observer.observe(body);
    };
    frame.addEventListener("load", measure);
    return () => {
      frame.removeEventListener("load", measure);
      observer?.disconnect();
    };
  }, [srcDoc]);

  return (
    <div className="space-y-2">
      {remote && !allowImages && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-subtle px-3 py-1.5 text-[0.75rem] text-muted-foreground">
          <ImageOffIcon className="size-3.5 shrink-0" />
          <span className="flex-1">Remote images are hidden so the sender can&apos;t tell you opened this.</span>
          <Button variant="ghost" size="xs" onClick={() => setAllowImages(true)}>
            Show images
          </Button>
        </div>
      )}
      <iframe
        ref={frameRef}
        title="Email content"
        // No allow-scripts: the email can't run code even if sanitizing missed something.
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        srcDoc={srcDoc}
        style={{ height }}
        className="block w-full rounded-md border border-hairline bg-white"
      />
    </div>
  );
}
