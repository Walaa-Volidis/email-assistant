"use client";

import {
  ArchiveIcon,
  ArrowLeftIcon,
  FileTextIcon,
  PanelRightIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react";
import { useState, type ReactNode, type RefObject } from "react";

import { EmailBody } from "@/components/mail/email-body";
import { QuickReplies } from "@/components/mail/quick-replies";
import { ReplyComposer } from "@/components/mail/reply-composer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatBytes, formatFullTime, formatListTime } from "@/lib/format";
import { displayName, initials, replyTarget } from "@/lib/mail";
import { cn } from "@/lib/utils";
import { type AsyncResult } from "@/components/mail/queries";
import { type QuickReplies as QuickRepliesData } from "@/schemas/ai";
import { type EmailMessage, type EmailThread } from "@/schemas/email";

type ThreadReaderProps = {
  thread: EmailThread;
  selfEmails: ReadonlySet<string>;
  assistantOpen: boolean;
  composer: { open: boolean; body: string };
  composerRef: RefObject<HTMLTextAreaElement | null>;
  sending: boolean;
  quickReplies: AsyncResult<QuickRepliesData>;
  onComposerChange: (next: { open: boolean; body: string }) => void;
  onSend: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onToggleStar: () => void;
  onToggleAssistant: () => void;
  /** Mobile only: return to the thread list. */
  onBack?: () => void;
};

export function ThreadReader({
  thread,
  selfEmails,
  assistantOpen,
  composer,
  composerRef,
  sending,
  quickReplies,
  onComposerChange,
  onSend,
  onArchive,
  onTrash,
  onToggleStar,
  onToggleAssistant,
  onBack,
}: ThreadReaderProps) {
  const people = thread.participants.length;
  const target = replyTarget(thread, selfEmails);
  const recipient = target ? target.to.map((a) => displayName(a, selfEmails)).join(", ") : null;

  return (
    <article aria-label={thread.subject} className="flex h-full min-w-0 flex-col">
      <ReaderToolbar
        isStarred={thread.isStarred}
        assistantOpen={assistantOpen}
        onArchive={onArchive}
        onTrash={onTrash}
        onToggleStar={onToggleStar}
        onToggleAssistant={onToggleAssistant}
        onBack={onBack}
      />

      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto max-w-3xl px-6 pt-6 pb-10">
          <h1 className="text-lg font-medium tracking-tight text-balance">{thread.subject}</h1>
          <p className="mt-1 font-mono text-[0.7rem] text-muted-foreground">
            {thread.messageCount} {thread.messageCount === 1 ? "message" : "messages"} · {people}{" "}
            {people === 1 ? "person" : "people"}
          </p>

          <ol className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
            {thread.messages.map((message, index) => (
              <MessageItem
                key={message.id}
                message={message}
                selfEmails={selfEmails}
                defaultExpanded={index === thread.messages.length - 1 || message.isUnread}
              />
            ))}
          </ol>

          {target && !composer.open && (
            <QuickReplies
              result={quickReplies}
              onPick={(body) => onComposerChange({ open: true, body })}
            />
          )}

          {target ? (
            <ReplyComposer
              ref={composerRef}
              recipient={recipient}
              state={composer}
              sending={sending}
              onChange={onComposerChange}
              onSend={onSend}
            />
          ) : (
            <p className="mt-4 text-[0.75rem] text-muted-foreground">
              No one else is on this thread to reply to.
            </p>
          )}
        </div>
      </ScrollArea>
    </article>
  );
}

type ToolbarProps = {
  isStarred: boolean;
  assistantOpen: boolean;
  onArchive: () => void;
  onTrash: () => void;
  onToggleStar: () => void;
  onToggleAssistant: () => void;
  onBack?: () => void;
};

function ReaderToolbar({
  isStarred,
  assistantOpen,
  onArchive,
  onTrash,
  onToggleStar,
  onToggleAssistant,
  onBack,
}: ToolbarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-border px-3">
      {onBack && (
        <Button variant="ghost" size="icon-sm" aria-label="Back to list" onClick={onBack}>
          <ArrowLeftIcon />
        </Button>
      )}
      <div className="flex-1" />
      <ToolbarButton label="Archive" shortcut="E" onClick={onArchive}>
        <ArchiveIcon />
      </ToolbarButton>
      <ToolbarButton label={isStarred ? "Unstar" : "Star"} shortcut="S" onClick={onToggleStar}>
        <StarIcon className={cn(isStarred && "fill-tone-urgent text-tone-urgent")} />
      </ToolbarButton>
      <ToolbarButton label="Move to trash" shortcut="#" onClick={onTrash}>
        <Trash2Icon />
      </ToolbarButton>
      <span aria-hidden className="mx-1.5 h-4 w-px bg-border" />
      <ToolbarButton
        label={assistantOpen ? "Hide assistant" : "Show assistant"}
        shortcut="."
        onClick={onToggleAssistant}
        pressed={assistantOpen}
        className="hidden lg:inline-flex"
      >
        <PanelRightIcon />
      </ToolbarButton>
    </header>
  );
}

/**
 * Shown while the full thread loads (or fails to). The list row already
 * has the subject and star state, so the toolbar works immediately.
 */
export function ReaderPlaceholder({
  subject,
  error,
  onRetry,
  ...toolbar
}: ToolbarProps & { subject: string | null; error: string | null; onRetry: () => void }) {
  return (
    <div className="flex h-full min-w-0 flex-col">
      <ReaderToolbar {...toolbar} />
      <div className="mx-auto w-full max-w-3xl px-6 pt-6">
        {subject ? (
          <h1 className="text-lg font-medium tracking-tight text-balance">{subject}</h1>
        ) : (
          <Skeleton className="h-6 w-2/3" />
        )}
        {error ? (
          <div className="mt-6 space-y-3 rounded-lg border border-border bg-card p-4">
            <p className="text-[0.8rem] text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          </div>
        ) : (
          <div aria-busy="true" aria-label="Loading thread" className="mt-6 space-y-3 rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  shortcut,
  onClick,
  pressed,
  className,
  children,
}: {
  label: string;
  shortcut: string;
  onClick: () => void;
  pressed?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={pressed}
          onClick={onClick}
          className={cn("text-muted-foreground hover:text-foreground aria-pressed:text-foreground", className)}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2">
        {label}
        <Kbd>{shortcut}</Kbd>
      </TooltipContent>
    </Tooltip>
  );
}

function MessageItem({
  message,
  selfEmails,
  defaultExpanded,
}: {
  message: EmailMessage;
  selfEmails: ReadonlySet<string>;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const sender = displayName(message.from, selfEmails);

  if (!expanded) {
    return (
      <li className="border-b border-hairline last:border-b-0">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-left outline-none transition-colors hover:bg-subtle focus-visible:bg-subtle"
        >
          <Avatar size="sm">
            <AvatarFallback className="text-[0.6rem]">{initials(message.from)}</AvatarFallback>
          </Avatar>
          <span className="w-28 shrink-0 truncate text-[0.8rem] font-medium">{sender}</span>
          <span className="min-w-0 flex-1 truncate text-[0.8rem] text-muted-foreground">{message.snippet}</span>
          <time
            dateTime={message.sentAt}
            suppressHydrationWarning
            className="tabular shrink-0 text-[0.7rem] text-muted-foreground"
          >
            {formatListTime(message.sentAt)}
          </time>
        </button>
      </li>
    );
  }

  const recipients = [...message.to, ...message.cc].map((a) => displayName(a, selfEmails)).join(", ");

  return (
    <li className="border-b border-hairline px-4 py-4 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="flex w-full items-start gap-3 text-left outline-none"
        aria-label={`Collapse message from ${sender}`}
      >
        <Avatar size="sm" className="mt-0.5">
          <AvatarFallback className="text-[0.6rem]">{initials(message.from)}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-[0.8rem] font-medium">{sender}</span>
            {sender !== message.from.email && (
              <span className="truncate text-[0.7rem] text-muted-foreground">{message.from.email}</span>
            )}
          </span>
          <span className="block truncate text-[0.7rem] text-muted-foreground">to {recipients}</span>
        </span>
        <time
          dateTime={message.sentAt}
          suppressHydrationWarning
          className="tabular shrink-0 text-[0.7rem] text-muted-foreground"
        >
          {formatFullTime(message.sentAt)}
        </time>
      </button>

      <div className="mt-3 pl-9">
        <EmailBody text={message.bodyText} html={message.bodyHtml} />
      </div>

      {message.attachments.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2 pl-9">
          {message.attachments.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-[0.75rem]"
            >
              <FileTextIcon className="size-3.5 text-muted-foreground" />
              <span className="max-w-56 truncate">{file.filename}</span>
              <span className="tabular text-muted-foreground">{formatBytes(file.sizeBytes)}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
