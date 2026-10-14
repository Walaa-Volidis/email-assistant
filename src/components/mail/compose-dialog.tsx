"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { parseRecipients } from "@/lib/recipients";
import { ZComposeRequestSchema, type ComposeRequest } from "@/schemas/email";

export type ComposeDraft = { to: string; cc: string; subject: string; body: string; showCc: boolean };
export const EMPTY_COMPOSE: ComposeDraft = { to: "", cc: "", subject: "", body: "", showCc: false };

type ComposeDialogProps = {
  open: boolean;
  draft: ComposeDraft;
  sending: boolean;
  onDraftChange: (draft: ComposeDraft) => void;
  /** Closing keeps the draft; only Discard clears it. */
  onOpenChange: (open: boolean) => void;
  onSend: (message: ComposeRequest) => void;
};

/** Validates the form with the same Zod schema the API route uses. */
function validate(draft: ComposeDraft): { message: ComposeRequest } | { error: string } {
  const to = parseRecipients(draft.to);
  const cc = parseRecipients(draft.cc);
  const invalid = [...to.invalid, ...cc.invalid];
  if (invalid.length > 0) return { error: `Not an email address: ${invalid.join(", ")}` };

  const parsed = ZComposeRequestSchema.safeParse({
    to: to.addresses,
    cc: cc.addresses,
    subject: draft.subject,
    body: draft.body,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the message and try again." };
  return { message: parsed.data };
}

const FIELD =
  "h-9 min-w-0 flex-1 bg-transparent text-[0.85rem] outline-none placeholder:text-muted-foreground";

export function ComposeDialog({ open, draft, sending, onDraftChange, onOpenChange, onSend }: ComposeDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<ComposeDraft>) => {
    setError(null);
    onDraftChange({ ...draft, ...patch });
  };

  function submit() {
    if (sending) return;
    const result = validate(draft);
    if ("error" in result) setError(result.error);
    else onSend(result.message);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">New message</DialogTitle>
        <DialogDescription className="sr-only">Write and send a new email from your Gmail account.</DialogDescription>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
        >
          <header className="flex h-10 items-center border-b border-border px-4">
            <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
              New message
            </span>
          </header>

          <label className="flex items-center gap-3 border-b border-hairline px-4">
            <span className="w-10 text-[0.75rem] text-muted-foreground">To</span>
            <input
              autoFocus
              value={draft.to}
              onChange={(e) => set({ to: e.target.value })}
              placeholder="name@example.com, Maya Chen <maya@acme.com>"
              aria-label="To"
              className={FIELD}
            />
            {!draft.showCc && (
              <button
                type="button"
                onClick={() => set({ showCc: true })}
                className="text-[0.75rem] text-muted-foreground hover:text-foreground"
              >
                Cc
              </button>
            )}
          </label>
          {draft.showCc && (
            <label className="flex items-center gap-3 border-b border-hairline px-4">
              <span className="w-10 text-[0.75rem] text-muted-foreground">Cc</span>
              <input value={draft.cc} onChange={(e) => set({ cc: e.target.value })} aria-label="Cc" className={FIELD} />
            </label>
          )}
          <label className="flex items-center gap-3 border-b border-hairline px-4">
            <span className="w-10 text-[0.75rem] text-muted-foreground">Subject</span>
            <input value={draft.subject} onChange={(e) => set({ subject: e.target.value })} aria-label="Subject" className={FIELD} />
          </label>
          <textarea
            value={draft.body}
            readOnly={sending}
            onChange={(e) => set({ body: e.target.value })}
            rows={12}
            aria-label="Message"
            placeholder="Write your message…"
            className="block w-full resize-none bg-transparent px-4 py-3 text-[0.85rem] leading-relaxed outline-none placeholder:text-muted-foreground"
          />

          {error && (
            <p role="alert" className="mx-4 mb-2 border-l-2 border-destructive pl-3 text-[0.75rem] text-destructive">
              {error}
            </p>
          )}

          <footer className="flex items-center gap-2 border-t border-hairline px-3 py-2">
            <span className="text-[0.7rem] text-muted-foreground">
              <Kbd>Esc</Kbd> to close, draft is kept
            </span>
            <div className="flex-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={sending}
              onClick={() => {
                onDraftChange(EMPTY_COMPOSE);
                onOpenChange(false);
              }}
            >
              Discard
            </Button>
            <Button type="submit" size="sm" disabled={sending} className="gap-2">
              {sending ? "Sending…" : "Send"}
              <span className="flex gap-0.5 opacity-70">
                <Kbd className="bg-primary-foreground/15 text-primary-foreground">⌘</Kbd>
                <Kbd className="bg-primary-foreground/15 text-primary-foreground">↵</Kbd>
              </span>
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}
