"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

const GROUPS: { title: string; items: [keys: string[], label: string][] }[] = [
  {
    title: "Navigate",
    items: [
      [["J"], "Next thread"],
      [["K"], "Previous thread"],
      [["Esc"], "Close thread"],
      [["/"], "Search"],
      [["G", "I"], "Go to inbox"],
      [["G", "S"], "Go to starred"],
      [["G", "T"], "Go to sent"],
      [["G", "D"], "Go to drafts"],
      [["G", "A"], "Go to archive"],
      [["⌘", "K"], "Command menu"],
    ],
  },
  {
    title: "Act",
    items: [
      [["R"], "Reply"],
      [["E"], "Archive"],
      [["S"], "Star"],
      [["U"], "Mark unread"],
      [["#"], "Move to trash"],
      [["C"], "New message"],
      [["⌘", "↵"], "Send"],
    ],
  },
  {
    title: "Assistant",
    items: [
      [["."], "Show or hide panel"],
      [["1"], "Brief"],
      [["2"], "Reply draft"],
      [["3"], "Follow-ups"],
    ],
  },
];

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">Keyboard shortcuts</DialogTitle>
          <DialogDescription className="text-[0.8rem]">
            Shortcuts are off while you&apos;re typing, except ⌘↵ and Esc.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 sm:grid-cols-3">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="mb-2 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h3>
              <ul className="space-y-1.5">
                {group.items.map(([keys, label]) => (
                  <li key={label} className="flex items-center justify-between gap-3 text-[0.8rem]">
                    <span>{label}</span>
                    <KbdGroup>
                      {keys.map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                      ))}
                    </KbdGroup>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
