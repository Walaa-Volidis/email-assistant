"use client";

import { MailOpenIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useSignOut } from "@/components/auth/use-sign-out";
import {
  AssistantPanel,
  type AssistantRequest,
  type AssistantTab,
} from "@/components/mail/assistant-panel";
import { CommandMenu, type ThreadCommand } from "@/components/mail/command-menu";
import { ComposeDialog, EMPTY_COMPOSE, type ComposeDraft } from "@/components/mail/compose-dialog";
import {
  useAssistant,
  useMailboxCounts,
  useQuickReplies,
  useSendMessage,
  useSendReply,
  useThread,
  useThreadAction,
  useThreadList,
} from "@/components/mail/queries";
import { ShortcutsDialog } from "@/components/mail/shortcuts-dialog";
import { Sidebar } from "@/components/mail/sidebar";
import { ThreadList } from "@/components/mail/thread-list";
import { ReaderPlaceholder, ThreadReader } from "@/components/mail/thread-reader";
import { useMailRoute } from "@/components/mail/use-mail-state";
import { useUndoSend } from "@/components/mail/use-undo-send";
import { Kbd } from "@/components/ui/kbd";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useHotkeys, type Hotkey } from "@/hooks/use-hotkeys";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useStoredFlag } from "@/hooks/use-stored-flag";
import { errorMessage } from "@/lib/api/client";
import { INVERSE_ACTION, MAILBOXES, replyTarget, stillInMailbox } from "@/lib/mail";
import { type SessionUser } from "@/schemas/auth";
import {
  type ComposeRequest,
  type Mailbox,
  type ThreadAction,
  type ThreadListItem,
} from "@/schemas/email";

type ComposerState = { open: boolean; body: string };
const CLOSED: ComposerState = { open: false, body: "" };

const ACTION_TOASTS: Partial<Record<ThreadAction, string>> = {
  archive: "Archived",
  trash: "Moved to trash",
  unarchive: "Moved to inbox",
  untrash: "Restored from trash",
};

export function MailWorkspace({ user }: { user: SessionUser }) {
  const { mailbox, threadId, navigate } = useMailRoute();
  const { signOut } = useSignOut();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isWide = useMediaQuery("(min-width: 1180px)");

  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query.trim(), 350);
  const [assistantOpen, setAssistantOpen] = useStoredFlag("relay:assistant-open", true);
  const [assistantTab, setAssistantTab] = useState<AssistantTab>("brief");
  const [composers, setComposers] = useState<Record<string, ComposerState>>({});
  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeDraft, setComposeDraft] = useState<ComposeDraft>(EMPTY_COMPOSE);

  const searchRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const self = useMemo(() => new Set([user.email.toLowerCase()]), [user.email]);

  const list = useThreadList(mailbox, search);
  const detail = useThread(threadId);
  const counts = useMailboxCounts();
  const { mutate: runAction } = useThreadAction();
  const sendReply = useSendReply();
  const sendMessage = useSendMessage();
  const assistant = useAssistant(threadId);
  const scheduleSend = useUndoSend();
  const lastFromOther = (() => {
    const last = detail.data?.messages.at(-1);
    return last ? !self.has(last.from.email.toLowerCase()) : false;
  })();
  const quickReplies = useQuickReplies(threadId, lastFromOther);

  const visible = useMemo(() => {
    const byId = new Map<string, ThreadListItem>();
    for (const page of list.data?.pages ?? []) {
      for (const thread of page.threads) if (!byId.has(thread.id)) byId.set(thread.id, thread);
    }
    return [...byId.values()].filter((thread) => stillInMailbox(thread, mailbox));
  }, [list.data, mailbox]);

  const listItem = visible.find((t) => t.id === threadId) ?? null;
  const thread = detail.data ?? null;
  const isStarred = thread?.isStarred ?? listItem?.isStarred ?? false;
  const selectedIndex = threadId ? visible.findIndex((t) => t.id === threadId) : -1;
  const composer = (threadId && composers[threadId]) || CLOSED;
  const showAssistant = assistantOpen && isWide && threadId !== null;

  // Opening an unread thread marks it read, in Gmail too, once per opening,
  // so "mark unread" isn't immediately undone.
  const autoReadRef = useRef<string | null>(null);
  useEffect(() => {
    if (thread?.isUnread && autoReadRef.current !== thread.id) {
      autoReadRef.current = thread.id;
      runAction({ threadId: thread.id, action: "markRead", subject: thread.subject });
    }
  }, [thread, runAction]);

  function toggleAssistant(open = !assistantOpen) {
    setAssistantOpen(open);
  }

  function openThread(id: string | null) {
    autoReadRef.current = null;
    navigate({ t: id });
    // In Waiting, the useful view of a thread is "how do I nudge them".
    if (id && mailbox === "waiting") setAssistantTab("follow-ups");
  }

  /** Like Gmail: marking a thread unread closes it so it stays unread. */
  function markUnread() {
    if (!threadId) return;
    act("markUnread", threadId, thread?.subject ?? listItem?.subject ?? "");
    openThread(null);
    // Keep the auto-read effect from re-reading it before the URL change lands.
    autoReadRef.current = threadId;
  }

  function openCompose() {
    setComposeOpen(true);
  }

  function sendNewMessage(message: ComposeRequest) {
    const draft = composeDraft;
    const restore = () => {
      setComposeDraft(draft);
      setComposeOpen(true);
    };
    const subject = message.subject || "(no subject)";

    setComposeOpen(false);
    setComposeDraft(EMPTY_COMPOSE);
    scheduleSend({
      key: `compose-${Date.now()}`,
      description: subject,
      undo: restore,
      send: () =>
        sendMessage
          .mutateAsync(message)
          .then(() => toast("Message sent", { description: subject }))
          .catch((error: unknown) => {
            restore();
            toast.error(errorMessage(error), { description: "Your message is back in the editor." });
          }),
    });
  }

  function step(delta: 1 | -1) {
    if (visible.length === 0) return;
    const nextIndex =
      selectedIndex === -1 ? 0 : Math.min(Math.max(selectedIndex + delta, 0), visible.length - 1);
    openThread(visible[nextIndex]!.id);
    if (delta === 1 && nextIndex >= visible.length - 3 && list.hasNextPage && !list.isFetchingNextPage) {
      void list.fetchNextPage();
    }
  }

  function selectMailbox(box: Mailbox) {
    setQuery("");
    navigate({ box, t: null });
  }

  function act(action: ThreadAction, id: string, subject: string) {
    runAction({ threadId: id, action, subject });
    const message = ACTION_TOASTS[action];
    if (message) {
      toast(message, {
        description: subject,
        action: { label: "Undo", onClick: () => act(INVERSE_ACTION[action], id, subject) },
      });
    }
  }

  /** Moves the thread out and opens its neighbour, like Gmail's auto-advance. */
  function removeAndAdvance(action: "archive" | "trash") {
    if (!threadId) return;
    const neighbour = visible[selectedIndex + 1] ?? visible[selectedIndex - 1] ?? null;
    act(action, threadId, thread?.subject ?? listItem?.subject ?? "");
    openThread(neighbour?.id ?? null);
  }

  function toggleStar() {
    if (!threadId) return;
    act(isStarred ? "unstar" : "star", threadId, thread?.subject ?? "");
  }

  function setComposer(next: ComposerState) {
    if (!threadId) return;
    setComposers((all) => ({ ...all, [threadId]: next }));
  }

  function openReply() {
    if (!thread) return;
    setComposer({ ...composer, open: true });
    requestAnimationFrame(() => composerRef.current?.focus());
  }

  function insertIntoReply(body: string) {
    if (!thread) return;
    setComposer({ open: true, body });
    requestAnimationFrame(() => {
      composerRef.current?.focus();
      composerRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  function send() {
    if (!thread) return;
    const target = replyTarget(thread, self);
    if (!target) return;
    const { id, subject } = thread;
    const body = composer.body;
    const restore = () => setComposers((all) => ({ ...all, [id]: { open: true, body } }));

    // Close now; the reply is held for the undo window before it goes out.
    setComposers((all) => ({ ...all, [id]: CLOSED }));
    scheduleSend({
      key: `reply-${id}-${Date.now()}`,
      description: subject,
      undo: restore,
      // mutateAsync, not per-call callbacks: those only fire for the latest mutate().
      send: () =>
        sendReply
          .mutateAsync({ threadId: id, inReplyToMessageId: target.message.id, to: target.to, cc: [], subject, body })
          .then(() => toast("Reply sent", { description: subject }))
          .catch((error: unknown) => {
            restore();
            toast.error(errorMessage(error), { description: "Your reply is back in the composer." });
          }),
    });
  }

  function handleAssistantRequest(request: AssistantRequest) {
    if (request.kind === "summarize") assistant.summary.run();
    else if (request.kind === "follow-ups") assistant.followUps.run();
    else assistant.draft.run({ tone: request.tone, length: request.length, instructions: request.instructions });
  }

  function handleThreadCommand(command: ThreadCommand) {
    switch (command) {
      case "reply":
        return openReply();
      case "archive":
        return removeAndAdvance("archive");
      case "star":
        return toggleStar();
      case "unread":
        return markUnread();
      case "summarize":
        toggleAssistant(true);
        setAssistantTab("brief");
        return assistant.summary.run();
      case "follow-ups":
        toggleAssistant(true);
        setAssistantTab("follow-ups");
        return assistant.followUps.run();
      case "draft":
        toggleAssistant(true);
        return setAssistantTab("reply");
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
    { keys: "c", handler: openCompose },
    { keys: "u", handler: markUnread },
    { keys: "r", handler: openReply },
    { keys: "e", handler: () => removeAndAdvance("archive") },
    { keys: "#", handler: () => removeAndAdvance("trash") },
    { keys: "s", handler: toggleStar },
    { keys: ".", handler: () => toggleAssistant() },
    { keys: "1", handler: () => setAssistantTab("brief") },
    { keys: "2", handler: () => setAssistantTab("reply") },
    { keys: "3", handler: () => setAssistantTab("follow-ups") },
    ...MAILBOXES.map((box) => ({ keys: `g ${box.hotkey}`, handler: () => selectMailbox(box.id) })),
  ];
  useHotkeys(hotkeys, !commandOpen && !shortcutsOpen && !composeOpen);

  const sidebar = (
    <Sidebar
      user={user}
      counts={counts.data}
      mailbox={mailbox}
      onSelectMailbox={selectMailbox}
      onCompose={openCompose}
      onOpenCommand={() => setCommandOpen(true)}
      onOpenShortcuts={() => setShortcutsOpen(true)}
      onSignOut={signOut}
    />
  );

  const threadList = (
    <ThreadList
      ref={searchRef}
      mailbox={mailbox}
      threads={visible}
      status={list.status}
      error={list.error ? errorMessage(list.error) : null}
      refreshing={list.isFetching && !list.isPending && !list.isFetchingNextPage}
      hasMore={list.hasNextPage}
      loadingMore={list.isFetchingNextPage}
      onLoadMore={() => void list.fetchNextPage()}
      onRetry={() => void list.refetch()}
      selectedId={threadId}
      query={query}
      onQueryChange={setQuery}
      onSelect={openThread}
      selfEmails={self}
    />
  );

  const toolbarProps = {
    isStarred,
    assistantOpen: showAssistant,
    onArchive: () => removeAndAdvance("archive"),
    onTrash: () => removeAndAdvance("trash"),
    onToggleStar: toggleStar,
    onToggleAssistant: () => toggleAssistant(),
    onBack: isDesktop ? undefined : () => openThread(null),
  };

  const reader = !threadId ? (
    <EmptyReader count={visible.length} />
  ) : thread ? (
    <ThreadReader
      key={thread.id}
      thread={thread}
      selfEmails={self}
      composer={composer}
      composerRef={composerRef}
      sending={sendReply.isPending}
      quickReplies={quickReplies}
      onComposerChange={setComposer}
      onSend={send}
      {...toolbarProps}
    />
  ) : (
    <ReaderPlaceholder
      subject={listItem?.subject ?? null}
      error={detail.error ? errorMessage(detail.error) : null}
      onRetry={() => void detail.refetch()}
      {...toolbarProps}
    />
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
            {threadList}
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
                  key={threadId}
                  messageCount={thread?.messageCount ?? listItem?.messageCount ?? 1}
                  summary={assistant.summary}
                  draft={assistant.draft}
                  followUps={assistant.followUps}
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
        <div className="min-w-0 flex-1">{threadId ? reader : threadList}</div>
      )}

      <CommandMenu
        open={commandOpen}
        onOpenChange={setCommandOpen}
        hasThread={threadId !== null}
        onMailbox={selectMailbox}
        onThreadCommand={handleThreadCommand}
        onCompose={openCompose}
        onShortcuts={() => setShortcutsOpen(true)}
        onSignOut={signOut}
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <ComposeDialog
        open={composeOpen}
        draft={composeDraft}
        sending={sendMessage.isPending}
        onDraftChange={setComposeDraft}
        onOpenChange={setComposeOpen}
        onSend={sendNewMessage}
      />
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
