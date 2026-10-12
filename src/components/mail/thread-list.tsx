"use client";

import { PaperclipIcon, SearchIcon, StarIcon, XIcon } from "lucide-react";
import { forwardRef, useEffect, useRef } from "react";

import { Kbd } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatListTime } from "@/lib/format";
import { displayName, firstName, mailboxMeta } from "@/lib/mail";
import { cn } from "@/lib/utils";
import { type EmailThread, type Mailbox } from "@/schemas/email";

type ThreadListProps = {
  mailbox: Mailbox;
  threads: EmailThread[];
  selectedId: string | null;
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (id: string) => void;
  selfEmails: ReadonlySet<string>;
};

export const ThreadList = forwardRef<HTMLInputElement, ThreadListProps>(function ThreadList(
  { mailbox, threads, selectedId, query, onQueryChange, onSelect, selfEmails },
  searchRef,
) {
  const meta = mailboxMeta(mailbox);
  const unread = threads.filter((t) => t.isUnread).length;
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Keep the keyboard selection in view during j/k navigation.
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  return (
    <section aria-label={meta.label} className="flex h-full min-w-0 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <h2 className="text-sm font-medium">{meta.label}</h2>
        <span className="tabular font-mono text-[0.7rem] text-muted-foreground">
          {threads.length}
          {unread > 0 && ` · ${unread} unread`}
        </span>
      </header>

      <div className="border-b border-hairline px-3 py-2">
        <label className="flex h-8 items-center gap-2 rounded-md border border-transparent bg-muted/60 px-2.5 text-muted-foreground transition-colors focus-within:border-input focus-within:bg-background">
          <SearchIcon className="size-3.5 shrink-0" />
          <span className="sr-only">Search {meta.label}</span>
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onQueryChange("");
                e.currentTarget.blur();
              }
            }}
            placeholder={`Search ${meta.label.toLowerCase()}`}
            className="h-full min-w-0 flex-1 bg-transparent text-[0.8rem] text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onQueryChange("")}
              className="rounded-sm p-0.5 hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          ) : (
            <Kbd>/</Kbd>
          )}
        </label>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {threads.length === 0 ? (
          <EmptyList mailbox={mailbox} searching={query.length > 0} />
        ) : (
          <ul role="listbox" aria-label={`${meta.label} threads`} className="pb-6">
            {threads.map((thread) => {
              const selected = thread.id === selectedId;
              return (
                <li key={thread.id} role="option" aria-selected={selected}>
                  <ThreadRow
                    ref={selected ? selectedRef : undefined}
                    thread={thread}
                    selected={selected}
                    onSelect={onSelect}
                    selfEmails={selfEmails}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </section>
  );
});

type ThreadRowProps = {
  thread: EmailThread;
  selected: boolean;
  onSelect: (id: string) => void;
  selfEmails: ReadonlySet<string>;
};

const ThreadRow = forwardRef<HTMLButtonElement, ThreadRowProps>(function ThreadRow(
  { thread, selected, onSelect, selfEmails },
  ref,
) {
  const senders =
    thread.participants.length === 1
      ? displayName(thread.participants[0]!, selfEmails)
      : thread.participants.map((p) => firstName(p, selfEmails)).join(", ");

  return (
    <button
      ref={ref}
      type="button"
      tabIndex={-1}
      onClick={() => onSelect(thread.id)}
      className={cn(
        "relative block w-full border-b border-hairline px-4 py-2.5 text-left outline-none transition-colors duration-100 ease-snappy",
        selected ? "bg-accent" : "hover:bg-subtle",
        // Selection bar: a crisp 2px edge rather than a filled pill.
        "before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-primary before:opacity-0 before:transition-opacity",
        selected && "before:opacity-100",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            "size-1.5 shrink-0 rounded-full bg-unread transition-opacity",
            thread.isUnread ? "opacity-100" : "opacity-0",
          )}
        />
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[0.8rem]",
            thread.isUnread ? "font-semibold text-foreground" : "text-foreground/80",
          )}
        >
          {senders}
        </span>
        {thread.messageCount > 1 && (
          <span className="tabular font-mono text-[0.65rem] text-muted-foreground">
            {thread.messageCount}
          </span>
        )}
        <time
          dateTime={thread.lastMessageAt}
          suppressHydrationWarning
          className={cn(
            "tabular shrink-0 text-[0.7rem]",
            thread.isUnread ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {formatListTime(thread.lastMessageAt)}
        </time>
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 pl-3.5">
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[0.8rem]",
            thread.isUnread ? "font-medium text-foreground" : "text-foreground/80",
          )}
        >
          {thread.subject}
        </span>
        {thread.hasAttachments && (
          <PaperclipIcon aria-label="Has attachments" className="size-3 shrink-0 text-muted-foreground" />
        )}
        {thread.isStarred && (
          <StarIcon aria-label="Starred" className="size-3 shrink-0 fill-tone-urgent text-tone-urgent" />
        )}
      </div>
      <p className="mt-0.5 line-clamp-1 pl-3.5 text-[0.75rem] text-muted-foreground">{thread.snippet}</p>
    </button>
  );
});

function EmptyList({ mailbox, searching }: { mailbox: Mailbox; searching: boolean }) {
  const message = searching
    ? "No threads match. Try fewer words or clear the search."
    : mailbox === "inbox"
      ? "Inbox zero. New mail will show up here."
      : `Nothing in ${mailboxMeta(mailbox).label.toLowerCase()}.`;
  return <p className="px-4 py-10 text-center text-[0.8rem] text-muted-foreground">{message}</p>;
}
