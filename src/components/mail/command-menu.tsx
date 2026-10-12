"use client";

import {
  ArchiveIcon,
  KeyboardIcon,
  ListChecksIcon,
  LogOutIcon,
  MoonIcon,
  PenLineIcon,
  ReplyIcon,
  StarIcon,
  TextQuoteIcon,
} from "lucide-react";
import { useTheme } from "next-themes";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { MAILBOXES } from "@/lib/mail";
import { type Mailbox } from "@/schemas/email";

export type ThreadCommand = "reply" | "archive" | "star" | "summarize" | "draft" | "follow-ups";

type CommandMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasThread: boolean;
  onMailbox: (mailbox: Mailbox) => void;
  onThreadCommand: (command: ThreadCommand) => void;
  onCompose: () => void;
  onShortcuts: () => void;
  onSignOut: () => void;
};

export function CommandMenu({
  open,
  onOpenChange,
  hasThread,
  onMailbox,
  onThreadCommand,
  onCompose,
  onShortcuts,
  onSignOut,
}: CommandMenuProps) {
  const { resolvedTheme, setTheme } = useTheme();

  // Close first so focus returns to the page before the action runs.
  const run = (action: () => void) => () => {
    onOpenChange(false);
    action();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command menu"
      description="Jump to a mailbox or run an action"
    >
      <Command>
      <CommandInput placeholder="Type a command or mailbox…" />
      <CommandList>
        <CommandEmpty>No matching commands.</CommandEmpty>

        {hasThread && (
          <>
            <CommandGroup heading="This thread">
              <CommandItem onSelect={run(() => onThreadCommand("reply"))}>
                <ReplyIcon /> Reply <CommandShortcut>R</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={run(() => onThreadCommand("summarize"))}>
                <TextQuoteIcon /> Summarize thread
              </CommandItem>
              <CommandItem onSelect={run(() => onThreadCommand("draft"))}>
                <PenLineIcon /> Draft a reply
              </CommandItem>
              <CommandItem onSelect={run(() => onThreadCommand("follow-ups"))}>
                <ListChecksIcon /> Suggest follow-ups
              </CommandItem>
              <CommandItem onSelect={run(() => onThreadCommand("archive"))}>
                <ArchiveIcon /> Archive <CommandShortcut>E</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={run(() => onThreadCommand("star"))}>
                <StarIcon /> Star or unstar <CommandShortcut>S</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Go to">
          {MAILBOXES.map((box) => (
            <CommandItem key={box.id} value={`go ${box.label}`} onSelect={run(() => onMailbox(box.id))}>
              <box.icon /> {box.label}
              <CommandShortcut>G {box.hotkey.toUpperCase()}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />

        <CommandGroup heading="General">
          <CommandItem onSelect={run(onCompose)}>
            <PenLineIcon /> New message <CommandShortcut>C</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}>
            <MoonIcon /> Toggle theme <CommandShortcut>⇧D</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={run(onShortcuts)}>
            <KeyboardIcon /> Keyboard shortcuts <CommandShortcut>?</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={run(onSignOut)}>
            <LogOutIcon /> Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
      </Command>
    </CommandDialog>
  );
}
