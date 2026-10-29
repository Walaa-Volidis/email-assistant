import {
  ArchiveIcon,
  FileIcon,
  HourglassIcon,
  InboxIcon,
  SendIcon,
  StarIcon,
  Trash2Icon,
  type LucideIcon,
} from "lucide-react";

import { type EmailAddress } from "@/schemas/common";
import {
  type EmailMessage,
  type EmailThread,
  type Mailbox,
  type MailboxCounts,
  type ThreadAction,
  type ThreadListItem,
} from "@/schemas/email";

export type MailboxMeta = {
  id: Mailbox;
  label: string;
  icon: LucideIcon;
  /** Second key of the `g` sequence, e.g. `g i` for inbox. */
  hotkey: string;
};

export const MAILBOXES: readonly MailboxMeta[] = [
  { id: "inbox", label: "Inbox", icon: InboxIcon, hotkey: "i" },
  { id: "starred", label: "Starred", icon: StarIcon, hotkey: "s" },
  { id: "sent", label: "Sent", icon: SendIcon, hotkey: "t" },
  { id: "waiting", label: "Waiting", icon: HourglassIcon, hotkey: "w" },
  { id: "drafts", label: "Drafts", icon: FileIcon, hotkey: "d" },
  { id: "archive", label: "Archive", icon: ArchiveIcon, hotkey: "a" },
  { id: "trash", label: "Trash", icon: Trash2Icon, hotkey: "#" },
];

export function mailboxMeta(id: Mailbox): MailboxMeta {
  return MAILBOXES.find((box) => box.id === id) ?? MAILBOXES[0]!;
}

/** Sidebar badge: unread for the inbox, total for drafts, nothing elsewhere. */
export function mailboxCount(id: Mailbox, counts: MailboxCounts | undefined): number | null {
  if (!counts) return null;
  const value = id === "inbox" ? counts.inboxUnread : id === "drafts" ? counts.drafts : 0;
  return value > 0 ? value : null;
}

/**
 * Whether a loaded thread still belongs in the mailbox it was listed in.
 * The server decides membership; this only hides threads that a local
 * action (archive, trash, unstar) has just moved out.
 */
export function stillInMailbox(thread: Pick<ThreadListItem, "labelIds">, mailbox: Mailbox): boolean {
  const labels = new Set(thread.labelIds);
  if (mailbox === "trash") return labels.has("TRASH");
  if (labels.has("TRASH")) return false;
  if (mailbox === "inbox") return labels.has("INBOX");
  if (mailbox === "starred") return labels.has("STARRED");
  if (mailbox === "archive") return !labels.has("INBOX");
  return true;
}

/** Expected labels after an action; the server's answer replaces this. */
export function applyActionToLabels(labelIds: string[], action: ThreadAction): string[] {
  const labels = new Set(labelIds);
  const change: Record<ThreadAction, () => void> = {
    star: () => labels.add("STARRED"),
    unstar: () => labels.delete("STARRED"),
    archive: () => labels.delete("INBOX"),
    unarchive: () => labels.add("INBOX"),
    trash: () => {
      labels.add("TRASH");
      labels.delete("INBOX");
    },
    untrash: () => {
      labels.delete("TRASH");
      labels.add("INBOX");
    },
    markRead: () => labels.delete("UNREAD"),
    markUnread: () => labels.add("UNREAD"),
  };
  change[action]();
  return [...labels];
}

export const INVERSE_ACTION: Record<ThreadAction, ThreadAction> = {
  star: "unstar",
  unstar: "star",
  archive: "unarchive",
  unarchive: "archive",
  trash: "untrash",
  untrash: "trash",
  markRead: "markUnread",
  markUnread: "markRead",
};

/**
 * Who a reply goes to: the sender of the latest message not written by the
 * user, or, on a thread only the user wrote to, that message's recipients.
 */
export function replyTarget(
  thread: EmailThread,
  selfEmails: ReadonlySet<string>,
): { message: EmailMessage; to: EmailAddress[] } | null {
  const isSelf = (a: EmailAddress) => selfEmails.has(a.email.toLowerCase());
  const external = [...thread.messages].reverse().find((m) => !isSelf(m.from));
  if (external) return { message: external, to: [external.from] };
  const last = thread.messages.at(-1);
  if (!last) return null;
  const to = last.to.filter((a) => !isSelf(a));
  return to.length > 0 ? { message: last, to } : null;
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
