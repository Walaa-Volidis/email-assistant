"use client";

import { ReplyIcon } from "lucide-react";
import { type Ref } from "react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

type ComposerState = { open: boolean; body: string };

type ReplyComposerProps = {
  ref: Ref<HTMLTextAreaElement>;
  recipient: string | null;
  state: ComposerState;
  sending: boolean;
  onChange: (next: ComposerState) => void;
  onSend: () => void;
};

export function ReplyComposer({ ref, recipient, state, sending, onChange, onSend }: ReplyComposerProps) {
  if (!state.open) {
    return (
      <button
        type="button"
        onClick={() => onChange({ ...state, open: true })}
        className="mt-4 flex w-full items-center gap-2.5 rounded-lg border border-dashed border-border px-4 py-3 text-left text-[0.8rem] text-muted-foreground outline-none transition-colors hover:border-input hover:bg-subtle hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ReplyIcon className="size-4" />
        {recipient ? `Reply to ${recipient}` : "Reply"}
        <Kbd className="ml-auto">R</Kbd>
      </button>
    );
  }

  const canSend = state.body.trim().length > 0 && !sending;

  return (
    <form
      className="mt-4 rounded-lg border border-input bg-card shadow-xs transition-shadow focus-within:ring-2 focus-within:ring-ring"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSend();
      }}
    >
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-2 text-[0.75rem] text-muted-foreground">
        <ReplyIcon className="size-3.5" />
        {recipient ? <span>Reply to {recipient}</span> : <span>Reply</span>}
      </div>
      <textarea
        ref={ref}
        autoFocus
        value={state.body}
        readOnly={sending}
        onChange={(e) => onChange({ ...state, body: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (canSend) onSend();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onChange({ ...state, open: false });
          }
        }}
        rows={7}
        placeholder="Write a reply…"
        aria-label="Reply"
        className="block w-full resize-y bg-transparent px-4 py-3 text-[0.85rem] leading-relaxed outline-none placeholder:text-muted-foreground"
      />
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-[0.7rem] text-muted-foreground">
          <Kbd>Esc</Kbd> to close, draft is kept
        </span>
        <div className="flex-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={sending}
          onClick={() => onChange({ open: false, body: "" })}
        >
          Discard
        </Button>
        <Button type="submit" size="sm" disabled={!canSend} className="gap-2">
          {sending ? "Sending…" : "Send"}
          <span className="flex gap-0.5 opacity-70">
            <Kbd className="bg-primary-foreground/15 text-primary-foreground">⌘</Kbd>
            <Kbd className="bg-primary-foreground/15 text-primary-foreground">↵</Kbd>
          </span>
        </Button>
      </div>
    </form>
  );
}
