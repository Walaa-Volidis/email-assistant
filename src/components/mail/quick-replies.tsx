"use client";

import { type AsyncResult } from "@/components/mail/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { type QuickReplies as QuickRepliesData } from "@/schemas/ai";

/**
 * One-click reply starters. They're a convenience, so a failure (no OpenAI
 * credit, rate limit) hides them quietly instead of showing an error.
 */
export function QuickReplies({
  result,
  onPick,
}: {
  result: AsyncResult<QuickRepliesData>;
  onPick: (body: string) => void;
}) {
  if (result.pending) {
    return (
      <div aria-busy="true" aria-label="Suggesting replies" className="mt-4 flex gap-2">
        {[96, 120, 88].map((width) => (
          <Skeleton key={width} className="h-7 rounded-full" style={{ width }} />
        ))}
      </div>
    );
  }
  const replies = result.data?.replies ?? [];
  if (result.error || replies.length === 0) return null;

  return (
    <div role="group" aria-label="Suggested replies" className="mt-4 flex flex-wrap gap-2">
      {replies.map((reply) => (
        <button
          key={reply.label}
          type="button"
          title={reply.body}
          onClick={() => onPick(reply.body)}
          className="h-7 rounded-full border border-border bg-background px-3 text-[0.75rem] text-foreground/90 outline-none transition-colors duration-100 ease-snappy hover:border-input hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        >
          {reply.label}
        </button>
      ))}
    </div>
  );
}
