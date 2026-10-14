"use client";

import { ChevronsUpDownIcon, LogOutIcon, MoonIcon, PenLineIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { MAILBOXES, initials, mailboxCount } from "@/lib/mail";
import { cn } from "@/lib/utils";
import { type SessionUser } from "@/schemas/auth";
import { type Mailbox, type MailboxCounts } from "@/schemas/email";

type SidebarProps = {
  user: SessionUser;
  counts: MailboxCounts | undefined;
  mailbox: Mailbox;
  onSelectMailbox: (mailbox: Mailbox) => void;
  onCompose: () => void;
  onOpenCommand: () => void;
  onOpenShortcuts: () => void;
  onSignOut: () => void;
};

export function Sidebar({
  user,
  counts,
  mailbox,
  onSelectMailbox,
  onCompose,
  onOpenCommand,
  onOpenShortcuts,
  onSignOut,
}: SidebarProps) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <aside className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-150 ease-snappy outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <Avatar size="sm" className="rounded-md after:rounded-md">
                {user.picture && <AvatarImage src={user.picture} alt="" className="rounded-md" />}
                <AvatarFallback className="rounded-md text-[0.65rem]">
                  {initials({ name: user.name, email: user.email })}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.8rem] font-medium text-foreground">
                  {user.name ?? user.email}
                </span>
                <span className="block truncate text-[0.7rem] text-muted-foreground">{user.email}</span>
              </span>
              <ChevronsUpDownIcon className="size-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
              {resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
              {resolvedTheme === "dark" ? "Light theme" : "Dark theme"}
              <DropdownMenuShortcut>⇧D</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onSignOut}>
              <LogOutIcon />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="px-3 pb-3">
        <Button variant="outline" className="w-full justify-start gap-2 bg-background" onClick={onCompose}>
          <PenLineIcon />
          New message
          <Kbd className="ml-auto">C</Kbd>
        </Button>
      </div>

      <nav aria-label="Mailboxes" className="flex-1 space-y-px px-2">
        {MAILBOXES.map((box) => {
          const active = box.id === mailbox;
          const count = mailboxCount(box.id, counts);
          return (
            <button
              key={box.id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onSelectMailbox(box.id)}
              className={cn(
                "group/nav flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-[0.8rem] outline-none transition-colors duration-150 ease-snappy focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <box.icon className={cn("size-4", active ? "text-foreground" : "text-muted-foreground")} />
              <span className="flex-1 text-left">{box.label}</span>
              {count !== null && (
                <span className="tabular text-[0.7rem] text-muted-foreground group-hover/nav:hidden">
                  {count}
                </span>
              )}
              <span className="hidden font-mono text-[0.65rem] text-muted-foreground/70 group-hover/nav:inline">
                G {box.hotkey.toUpperCase()}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="space-y-px border-t border-sidebar-border p-2 text-[0.75rem] text-muted-foreground">
        <button
          type="button"
          onClick={onOpenCommand}
          className="flex h-7 w-full items-center justify-between rounded-md px-2 outline-none transition-colors hover:bg-sidebar-accent/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          Command menu
          <span className="flex gap-0.5">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenShortcuts}
          className="flex h-7 w-full items-center justify-between rounded-md px-2 outline-none transition-colors hover:bg-sidebar-accent/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          Keyboard shortcuts
          <Kbd>?</Kbd>
        </button>
      </div>
    </aside>
  );
}
