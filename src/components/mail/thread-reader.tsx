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

import { ReplyComposer } from "@/components/mail/reply-composer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatBytes, formatFullTime, formatListTime } from "@/lib/format";
import { displayName, initials } from "@/lib/mail";
import { cn } from "@/lib/utils";
import { type EmailMessage, type EmailThread } from "@/schemas/email";

type ThreadReaderProps = {
  thread: EmailThread;
  selfEmails: ReadonlySet<string>;
  assistantOpen: boolean;
  composer: { open: boolean; body: string };
  composerRef: RefObject<HTMLTextAreaElement | null>;
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
  onComposerChange,
  onSend,
  onArchive,
  onTrash,
  onToggleStar,
  onToggleAssistant,
  onBack,
}: ThreadReaderProps) {
  const people = thread.participants.length;
  const replyTo = [...thread.messages].reverse().find((m) => !selfEmails.has(m.from.email.toLowerCase()));

  return (
    <article aria-label={thread.subject} className="flex h-full min-w-0 flex-col">
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
        <ToolbarButton label={thread.isStarred ? "Unstar" : "Star"} shortcut="S" onClick={onToggleStar}>
          <StarIcon className={cn(thread.isStarred && "fill-tone-urgent text-tone-urgent")} />
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

          <ReplyComposer
            ref={composerRef}
            recipient={replyTo ? displayName(replyTo.from, selfEmails) : null}
            state={composer}
            onChange={onComposerChange}
            onSend={onSend}
          />
        </div>
      </ScrollArea>
    </article>
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

      <div className="mt-3 pl-9 text-[0.85rem] leading-relaxed whitespace-pre-wrap text-foreground/90">
        {message.bodyText}
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
