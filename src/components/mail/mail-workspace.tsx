"use client";

import { MailOpenIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useSignOut } from "@/components/auth/use-sign-out";
import {
  AssistantPanel,
  type AssistantRequest,
  type AssistantTab,
} from "@/components/mail/assistant-panel";
import { CommandMenu, type ThreadCommand } from "@/components/mail/command-menu";
import { ShortcutsDialog } from "@/components/mail/shortcuts-dialog";
import { Sidebar } from "@/components/mail/sidebar";
import { ThreadList } from "@/components/mail/thread-list";
import { ThreadReader } from "@/components/mail/thread-reader";
import { useMailRoute, useThreads } from "@/components/mail/use-mail-state";
import { Kbd } from "@/components/ui/kbd";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useHotkeys, type Hotkey } from "@/hooks/use-hotkeys";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useStoredFlag } from "@/hooks/use-stored-flag";
import { type AiSamples } from "@/lib/fixtures/threads";
import { MAILBOXES, matchesQuery, threadsIn } from "@/lib/mail";
import { type SessionUser } from "@/schemas/auth";
import { type EmailThread, type Mailbox } from "@/schemas/email";

type ComposerState = { open: boolean; body: string };
const CLOSED: ComposerState = { open: false, body: "" };

type MailWorkspaceProps = {
  user: SessionUser;
  initialThreads: EmailThread[];
  aiSamples: AiSamples;
  /** Addresses rendered as "Me"; includes the sample mailbox owner until Step 5. */
  selfEmails: string[];
};

export function MailWorkspace({ user, initialThreads, aiSamples, selfEmails }: MailWorkspaceProps) {
  const { threads, dispatch } = useThreads(initialThreads);
  const { mailbox, threadId, navigate } = useMailRoute();
  const { signOut } = useSignOut();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isWide = useMediaQuery("(min-width: 1180px)");

  const [query, setQuery] = useState("");
  const [assistantOpen, setAssistantOpen] = useStoredFlag("relay:assistant-open", true);
  const [assistantTab, setAssistantTab] = useState<AssistantTab>("brief");
  const [composers, setComposers] = useState<Record<string, ComposerState>>({});
  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const self = useMemo(() => new Set(selfEmails.map((e) => e.toLowerCase())), [selfEmails]);

  const visible = useMemo(
    () => threadsIn(threads, mailbox).filter((thread) => matchesQuery(thread, query)),
    [threads, mailbox, query],
  );
  const selected = threads.find((thread) => thread.id === threadId) ?? null;
  const selectedIndex = selected ? visible.findIndex((t) => t.id === selected.id) : -1;
  const composer = (selected && composers[selected.id]) || CLOSED;
  const showAssistant = assistantOpen && isWide && selected !== null;

  function toggleAssistant(open = !assistantOpen) {
    setAssistantOpen(open);
  }

  function openThread(id: string | null) {
    navigate({ t: id });
    if (id) dispatch({ type: "markRead", id });
  }

  function step(delta: 1 | -1) {
    if (visible.length === 0) return;
    const nextIndex =
      selectedIndex === -1 ? 0 : Math.min(Math.max(selectedIndex + delta, 0), visible.length - 1);
    openThread(visible[nextIndex]!.id);
  }

  function selectMailbox(box: Mailbox) {
    setQuery("");
    navigate({ box, t: null });
  }

  /** Removes the thread from view and moves to its neighbour, like Gmail's auto-advance. */
  function removeAndAdvance(action: "archive" | "trash") {
    if (!selected) return;
    const neighbour = visible[selectedIndex + 1] ?? visible[selectedIndex - 1] ?? null;
    dispatch({ type: action, id: selected.id });
    openThread(neighbour?.id ?? null);
    toast(action === "archive" ? "Archived" : "Moved to trash", {
      description: selected.subject,
    });
  }

  function setComposer(next: ComposerState) {
    if (!selected) return;
    setComposers((all) => ({ ...all, [selected.id]: next }));
  }

  function openReply() {
    if (!selected) return;
    setComposer({ ...composer, open: true });
    requestAnimationFrame(() => composerRef.current?.focus());
  }

  function insertIntoReply(body: string) {
    if (!selected) return;
    setComposer({ open: true, body });
    requestAnimationFrame(() => {
      composerRef.current?.focus();
      composerRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  // Steps 4–5 replace these placeholders with real calls.
  function notConnected(what: string) {
    toast(`${what} isn't connected yet`, {
      description: "It goes live once Gmail and OpenAI are wired in.",
    });
  }

  function handleAssistantRequest(request: AssistantRequest) {
    const labels: Record<AssistantRequest["kind"], string> = {
      summarize: "Summarizing",
      draft: "Drafting",
      "follow-ups": "Follow-up suggestions",
    };
    notConnected(labels[request.kind]);
  }

  function handleThreadCommand(command: ThreadCommand) {
    switch (command) {
      case "reply":
        return openReply();
      case "archive":
        return removeAndAdvance("archive");
      case "star":
        return selected && dispatch({ type: "toggleStar", id: selected.id });
      case "summarize":
      case "draft":
      case "follow-ups":
        toggleAssistant(true);
        setAssistantTab(command === "summarize" ? "brief" : command === "draft" ? "reply" : "follow-ups");
        return;
    }
  }

  const hotkeys: Hotkey[] = [
    { keys: "j", handler: () => step(1) },
    { keys: "k", handler: () => step(-1) },
    { keys: "ArrowDown", handler: () => step(1) },
    { keys: "ArrowUp", handler: () => step(-1) },
    { keys: "Escape", handler: () => openThread(null) },
    { keys: "/", handler: () => searchRef.current?.focus() },
    { keys: "mod+k", handler: () => setCommandOpen((open) => !open), allowInInput: true },
    { keys: "?", handler: () => setShortcutsOpen(true) },
    { keys: "c", handler: () => notConnected("New message") },
    { keys: "r", handler: openReply },
    { keys: "e", handler: () => removeAndAdvance("archive") },
    { keys: "#", handler: () => removeAndAdvance("trash") },
    { keys: "s", handler: () => selected && dispatch({ type: "toggleStar", id: selected.id }) },
    { keys: ".", handler: () => toggleAssistant() },
    { keys: "1", handler: () => setAssistantTab("brief") },
    { keys: "2", handler: () => setAssistantTab("reply") },
    { keys: "3", handler: () => setAssistantTab("follow-ups") },
    ...MAILBOXES.map((box) => ({ keys: `g ${box.hotkey}`, handler: () => selectMailbox(box.id) })),
  ];
  useHotkeys(hotkeys, !commandOpen && !shortcutsOpen);

  const sidebar = (
    <Sidebar
      user={user}
      threads={threads}
      mailbox={mailbox}
      onSelectMailbox={selectMailbox}
      onCompose={() => notConnected("New message")}
      onOpenCommand={() => setCommandOpen(true)}
      onOpenShortcuts={() => setShortcutsOpen(true)}
      onSignOut={signOut}
    />
  );

  const list = (
    <ThreadList
      ref={searchRef}
      mailbox={mailbox}
      threads={visible}
      selectedId={selected?.id ?? null}
      query={query}
      onQueryChange={setQuery}
      onSelect={openThread}
      selfEmails={self}
    />
  );

  const reader = selected ? (
    <ThreadReader
      key={selected.id}
      thread={selected}
      selfEmails={self}
      assistantOpen={showAssistant}
      composer={composer}
      composerRef={composerRef}
      onComposerChange={setComposer}
      onSend={() => notConnected("Sending")}
      onArchive={() => removeAndAdvance("archive")}
      onTrash={() => removeAndAdvance("trash")}
      onToggleStar={() => dispatch({ type: "toggleStar", id: selected.id })}
      onToggleAssistant={() => toggleAssistant()}
      onBack={isDesktop ? undefined : () => openThread(null)}
    />
  ) : (
    <EmptyReader count={visible.length} />
  );

  return (
    // Fixed h-dvh, not flex-1: the panel group sizes with height:100%, which
    // needs a definite parent height (a flexed one inside min-h body isn't).
    <div className="flex h-dvh w-full overflow-hidden">
      {isDesktop ? (
        <ResizablePanelGroup orientation="horizontal" id="relay-workspace">
          <ResizablePanel id="sidebar" defaultSize={232} minSize={196} maxSize={300} className="border-r border-sidebar-border">
            {sidebar}
          </ResizablePanel>
          <ResizablePanel id="list" defaultSize={360} minSize={300} maxSize={520}>
            {list}
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel id="reader" minSize={420}>
            {reader}
          </ResizablePanel>
          {showAssistant && (
            <>
              <ResizableHandle />
              <ResizablePanel id="assistant" defaultSize={320} minSize={280} maxSize={480}>
                <AssistantPanel
                  key={selected.id}
                  thread={selected}
                  sample={aiSamples[selected.id]}
                  tab={assistantTab}
                  onTabChange={setAssistantTab}
                  onRequest={handleAssistantRequest}
                  onInsert={insertIntoReply}
                  onClose={() => toggleAssistant(false)}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      ) : (
        <div className="min-w-0 flex-1">{selected ? reader : list}</div>
      )}

      <CommandMenu
        open={commandOpen}
        onOpenChange={setCommandOpen}
        hasThread={selected !== null}
        onMailbox={selectMailbox}
        onThreadCommand={handleThreadCommand}
        onCompose={() => notConnected("New message")}
        onShortcuts={() => setShortcutsOpen(true)}
        onSignOut={signOut}
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}

function EmptyReader({ count }: { count: number }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <MailOpenIcon className="size-5 text-muted-foreground/60" />
      <p className="text-[0.8rem] text-muted-foreground">
        {count > 0 ? "Pick a thread to read it." : "Nothing to read here."}
      </p>
      {count > 0 && (
        <p className="flex items-center gap-1.5 text-[0.75rem] text-muted-foreground/80">
          <Kbd>J</Kbd>
          <Kbd>K</Kbd> to move between threads
        </p>
      )}
    </div>
  );
}
