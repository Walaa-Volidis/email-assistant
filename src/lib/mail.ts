import {
  ArchiveIcon,
  FileIcon,
  InboxIcon,
  SendIcon,
  StarIcon,
  Trash2Icon,
  type LucideIcon,
} from "lucide-react";

import { type EmailAddress } from "@/schemas/common";
import { type EmailThread, type Mailbox } from "@/schemas/email";

export type MailboxMeta = {
  id: Mailbox;
  label: string;
  icon: LucideIcon;
  /** Second key of the `g` sequence, e.g. `g i` for inbox. */
  hotkey: string;
  /** Whether the sidebar count shows unread threads or all threads. */
  countMode: "unread" | "total" | "none";
};

export const MAILBOXES: readonly MailboxMeta[] = [
  { id: "inbox", label: "Inbox", icon: InboxIcon, hotkey: "i", countMode: "unread" },
  { id: "starred", label: "Starred", icon: StarIcon, hotkey: "s", countMode: "none" },
  { id: "sent", label: "Sent", icon: SendIcon, hotkey: "t", countMode: "none" },
  { id: "drafts", label: "Drafts", icon: FileIcon, hotkey: "d", countMode: "total" },
  { id: "archive", label: "Archive", icon: ArchiveIcon, hotkey: "a", countMode: "none" },
  { id: "trash", label: "Trash", icon: Trash2Icon, hotkey: "#", countMode: "none" },
];

export function mailboxMeta(id: Mailbox): MailboxMeta {
  return MAILBOXES.find((box) => box.id === id) ?? MAILBOXES[0]!;
}

/** Mirrors how Gmail system labels map onto mailboxes. */
export function isInMailbox(thread: EmailThread, mailbox: Mailbox): boolean {
  const labels = new Set(thread.labelIds);
  if (labels.has("TRASH")) return mailbox === "trash";
  switch (mailbox) {
    case "inbox":
      return labels.has("INBOX");
    case "starred":
      return labels.has("STARRED");
    case "sent":
      return labels.has("SENT");
    case "drafts":
      return labels.has("DRAFT");
    case "archive":
      return !labels.has("INBOX") && !labels.has("DRAFT") && !labels.has("SENT");
    case "trash":
      return false;
  }
}

export function threadsIn(threads: EmailThread[], mailbox: Mailbox): EmailThread[] {
  return threads
    .filter((thread) => isInMailbox(thread, mailbox))
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}

export function mailboxCount(threads: EmailThread[], box: MailboxMeta): number | null {
  if (box.countMode === "none") return null;
  const inBox = threads.filter((thread) => isInMailbox(thread, box.id));
  const count = box.countMode === "unread" ? inBox.filter((t) => t.isUnread).length : inBox.length;
  return count > 0 ? count : null;
}

export function matchesQuery(thread: EmailThread, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    thread.subject,
    thread.snippet,
    ...thread.participants.flatMap((p) => [p.name ?? "", p.email]),
  ]
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

export function displayName(address: EmailAddress, selfEmails: ReadonlySet<string>): string {
  if (selfEmails.has(address.email.toLowerCase())) return "Me";
  return address.name ?? address.email;
}

export function firstName(address: EmailAddress, selfEmails: ReadonlySet<string>): string {
  const name = displayName(address, selfEmails);
  return name === "Me" ? name : (name.split(/[\s@]/)[0] ?? name);
}

export function initials(address: EmailAddress): string {
  const source = address.name ?? address.email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
