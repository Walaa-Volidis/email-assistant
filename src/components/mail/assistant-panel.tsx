"use client";

import { CornerDownLeftIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { z } from "zod";

import { type AsyncResult } from "@/components/mail/queries";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { errorMessage } from "@/lib/api/client";
import { formatRelativeDays } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  replyLengthSchema,
  toneSchema,
  type FollowUpSuggestions,
  type ReplyDraft,
  type ReplyLength,
  type Sentiment,
  type ThreadSummary,
  type Tone,
} from "@/schemas/ai";

const assistantTabSchema = z.enum(["brief", "reply", "follow-ups"]);
export type AssistantTab = z.infer<typeof assistantTabSchema>;
export type AssistantRequest =
  | { kind: "summarize" }
  | { kind: "draft"; tone: Tone; length: ReplyLength; instructions: string }
  | { kind: "follow-ups" };

type AssistantPanelProps = {
  messageCount: number;
  summary: AsyncResult<ThreadSummary>;
  draft: AsyncResult<ReplyDraft>;
  followUps: AsyncResult<FollowUpSuggestions>;
  tab: AssistantTab;
  onTabChange: (tab: AssistantTab) => void;
  onRequest: (request: AssistantRequest) => void;
  onInsert: (body: string) => void;
  onClose: () => void;
};

/*
 * The assistant reads like a colleague's margin notes on the thread: short
 * mono labels in a gutter, the substance beside them, no chat bubbles.
 */
export function AssistantPanel({
  messageCount,
  summary,
  draft,
  followUps,
  tab,
  onTabChange,
  onRequest,
  onInsert,
  onClose,
}: AssistantPanelProps) {
  const summarize = () => onRequest({ kind: "summarize" });
  const suggest = () => onRequest({ kind: "follow-ups" });
  return (
    <aside aria-label="Assistant" className="flex h-full min-w-0 flex-col bg-subtle">
      <Tabs
        value={tab}
        onValueChange={(value) => {
          const parsed = assistantTabSchema.safeParse(value);
          if (parsed.success) onTabChange(parsed.data);
        }}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border pr-2 pl-3">
          <TabsList variant="line" className="h-full">
            <TabsTrigger value="brief" className="text-[0.8rem]">Brief</TabsTrigger>
            <TabsTrigger value="reply" className="text-[0.8rem]">Reply</TabsTrigger>
            <TabsTrigger value="follow-ups" className="text-[0.8rem]">Follow-ups</TabsTrigger>
          </TabsList>
          <div className="flex-1" />
          <Button variant="ghost" size="icon-xs" aria-label="Hide assistant" onClick={onClose}>
            <XIcon />
          </Button>
        </header>

        <ScrollArea className="min-h-0 flex-1">
          <TabsContent value="brief" className="p-4">
            {summary.pending ? (
              <Working label={`Reading ${messageCount === 1 ? "the message" : `${messageCount} messages`}…`} />
            ) : summary.error ? (
              <Failed error={summary.error} onRetry={summarize} />
            ) : summary.data ? (
              <>
                <BriefView summary={summary.data} />
                <RunAgain label="Summarize again" onClick={summarize} />
              </>
            ) : (
              <Idle
                body={`Condense ${messageCount === 1 ? "this message" : `all ${messageCount} messages`} into what you need to know, what's being asked, and who owes what.`}
                action="Summarize thread"
                onAction={summarize}
              />
            )}
          </TabsContent>

          <TabsContent value="reply" className="p-4">
            <ReplyView draft={draft} onRequest={onRequest} onInsert={onInsert} />
          </TabsContent>

          <TabsContent value="follow-ups" className="p-4">
            {followUps.pending ? (
              <Working label="Looking for loose ends…" />
            ) : followUps.error ? (
              <Failed error={followUps.error} onRetry={suggest} />
            ) : followUps.data ? (
              <>
                <FollowUpsView followUps={followUps.data} onInsert={onInsert} />
                <RunAgain label="Check again" onClick={suggest} />
              </>
            ) : (
              <Idle
                body="Find loose ends in this thread: unanswered asks, promised updates, and when to nudge."
                action="Suggest follow-ups"
                onAction={suggest}
              />
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </aside>
  );
}

function Idle({ body, action, onAction }: { body: string; action: string; onAction: () => void }) {
  return (
    <div className="space-y-3 py-2">
      <p className="text-[0.8rem] leading-relaxed text-muted-foreground">{body}</p>
      <Button variant="outline" size="sm" className="bg-background" onClick={onAction}>
        {action}
      </Button>
    </div>
  );
}

function Working({ label }: { label: string }) {
  return (
    <div aria-busy="true" className="space-y-3 py-1">
      <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">{label}</p>
      {[0.95, 0.8, 0.88, 0.6].map((width, i) => (
        <Skeleton key={i} className="h-3" style={{ width: `${width * 100}%` }} />
      ))}
    </div>
  );
}

function Failed({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div role="alert" className="space-y-3 py-1">
      <p className="border-l-2 border-destructive pl-3 text-[0.8rem] leading-relaxed text-destructive">
        {errorMessage(error)}
      </p>
      <Button variant="outline" size="sm" className="bg-background" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function RunAgain({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="ghost" size="xs" className="mt-3 text-muted-foreground" onClick={onClick}>
      <RotateCcwIcon />
      {label}
    </Button>
  );
}

/** One margin note: a mono label in the gutter, content beside it. */
function Note({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[4.25rem_1fr] gap-x-3 border-t border-border py-3 first:border-t-0 first:pt-0">
      <dt className="pt-px font-mono text-[0.65rem] uppercase leading-5 tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-[0.8rem] leading-5">{children}</dd>
    </div>
  );
}

const SENTIMENT: Record<Sentiment, { label: string; className: string }> = {
  positive: { label: "Positive", className: "bg-tone-positive" },
  neutral: { label: "Neutral", className: "bg-tone-neutral" },
  urgent: { label: "Time-sensitive", className: "bg-tone-urgent" },
  negative: { label: "Frustrated", className: "bg-tone-negative" },
};

function BriefView({ summary }: { summary: ThreadSummary }) {
  const sentiment = SENTIMENT[summary.sentiment];
  return (
    <dl>
      <Note label="Gist">
        <p className="text-foreground">{summary.tldr}</p>
      </Note>
      <Note label="Mood">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className={cn("size-1.5 rounded-full", sentiment.className)} />
            {sentiment.label}
          </span>
          <span className="text-muted-foreground">written {summary.detectedTone}</span>
          {summary.needsReply && (
            <span className="font-mono text-[0.65rem] uppercase tracking-wider text-primary">Reply needed</span>
          )}
        </span>
      </Note>
      {summary.keyPoints.length > 0 && (
        <Note label="Points">
          <ul className="space-y-1.5">
            {summary.keyPoints.map((point) => (
              <li key={point} className="text-foreground/90">{point}</li>
            ))}
          </ul>
        </Note>
      )}
      {summary.actionItems.length > 0 && (
        <Note label="Owed">
          <ul className="space-y-2">
            {summary.actionItems.map((item) => (
              <li key={item.task}>
                <span className="text-foreground">{item.task}</span>
                <span className="block text-[0.7rem] text-muted-foreground">
                  {[item.owner, item.dueDate && `due ${item.dueDate}`].filter(Boolean).join(" · ") || "Unassigned"}
                </span>
              </li>
            ))}
          </ul>
        </Note>
      )}
      {summary.openQuestions.length > 0 && (
        <Note label="Open">
          <ul className="space-y-1.5">
            {summary.openQuestions.map((question) => (
              <li key={question} className="text-foreground/90">{question}</li>
            ))}
          </ul>
        </Note>
      )}
    </dl>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
        {label}
      </legend>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === value}
            onClick={() => onChange(option)}
            className="h-7 rounded-md border border-border bg-background px-2.5 text-[0.75rem] capitalize text-muted-foreground outline-none transition-colors duration-100 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-foreground/30 aria-pressed:bg-accent aria-pressed:text-foreground"
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ReplyView({
  draft: result,
  onRequest,
  onInsert,
}: {
  draft: AsyncResult<ReplyDraft>;
  onRequest: (request: AssistantRequest) => void;
  onInsert: (body: string) => void;
}) {
  const draft = result.data;
  const [tone, setTone] = useState<Tone>(draft?.tone ?? "friendly");
  const [length, setLength] = useState<ReplyLength>("medium");
  const [instructions, setInstructions] = useState("");

  return (
    <div className="space-y-4">
      <Segmented label="Tone" options={toneSchema.options} value={tone} onChange={setTone} />
      <Segmented label="Length" options={replyLengthSchema.options} value={length} onChange={setLength} />
      <label className="block">
        <span className="mb-1.5 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          Steer (optional)
        </span>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="e.g. confirm the rate, offer a call Thursday"
          className="block w-full resize-none rounded-md border border-input bg-background px-2.5 py-2 text-[0.8rem] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <Button
        size="sm"
        className="w-full"
        disabled={result.pending}
        onClick={() => onRequest({ kind: "draft", tone, length, instructions })}
      >
        {result.pending ? "Drafting…" : draft ? "Draft again" : "Draft reply"}
      </Button>

      {result.pending ? (
        <Working label="Writing a draft…" />
      ) : result.error ? (
        <Failed error={result.error} onRetry={() => onRequest({ kind: "draft", tone, length, instructions })} />
      ) : draft && (
        <div className="rounded-lg border border-border bg-background">
          <p className="border-b border-hairline px-3 py-2 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            Draft · {draft.tone}
          </p>
          <p className="px-3 py-3 text-[0.8rem] leading-relaxed whitespace-pre-wrap">{draft.body}</p>
          {draft.assumptions.length > 0 && (
            <div className="border-t border-hairline px-3 py-2.5">
              <p className="font-mono text-[0.65rem] uppercase tracking-wider text-tone-urgent">Check before sending</p>
              <ul className="mt-1.5 space-y-1 text-[0.75rem] text-muted-foreground">
                {draft.assumptions.map((assumption) => (
                  <li key={assumption}>{assumption}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="border-t border-hairline p-2">
            <Button variant="ghost" size="sm" className="w-full gap-2" onClick={() => onInsert(draft.body)}>
              <CornerDownLeftIcon />
              Insert into reply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FollowUpsView({
  followUps,
  onInsert,
}: {
  followUps: FollowUpSuggestions;
  onInsert: (body: string) => void;
}) {
  if (followUps.suggestions.length === 0) {
    return <p className="text-[0.8rem] text-muted-foreground">Nothing outstanding on this thread.</p>;
  }
  return (
    <dl>
      {followUps.suggestions.map((suggestion) => (
        <Note key={suggestion.title} label={suggestion.kind.replace("-", " ")}>
          <p className="font-medium text-foreground">{suggestion.title}</p>
          <p className="mt-0.5 text-[0.75rem] text-muted-foreground">{suggestion.rationale}</p>
          <div className="mt-2 flex items-center gap-2">
            {suggestion.suggestedDelayDays !== null && (
              <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                {formatRelativeDays(suggestion.suggestedDelayDays)}
              </span>
            )}
            {suggestion.draftBody && (
              <Button
                variant="outline"
                size="xs"
                className="ml-auto bg-background"
                onClick={() => onInsert(suggestion.draftBody!)}
              >
                Use as reply
              </Button>
            )}
          </div>
        </Note>
      ))}
    </dl>
  );
}
