import { z } from "zod";

import { followUpSuggestionsSchema, replyDraftSchema, threadSummarySchema } from "@/schemas/ai";
import { gmailIdSchema } from "@/schemas/common";
import { emailThreadSchema, type EmailMessage, type EmailThread } from "@/schemas/email";

/*
 * Sample mailbox used to build the workspace before Gmail and OpenAI are
 * wired in (Step 5). Parsed through the real schemas at import time, so the
 * fixtures can't drift from the shapes the API will return.
 */

export const FIXTURE_OWNER = { name: "Alex Rivera", email: "alex@northwind.io" } as const;

const me = FIXTURE_OWNER;
const maya = { name: "Maya Chen", email: "maya.chen@acmelogistics.com" };
const tom = { name: "Tom Becker", email: "tom@acmelogistics.com" };
const jonas = { name: "Jonas Weber", email: "j.weber@hartmann-legal.de" };
const priya = { name: "Priya Nair", email: "priya@northwind.io" };
const finance = { name: "Northwind Finance", email: "finance@northwind.io" };
const sam = { name: "Sam Okafor", email: "sam.okafor@fieldlane.co" };
const lena = { name: "Lena Brandt", email: "lena@northwind.io" };
const daniel = { name: "Daniel Park", email: "daniel@parkventures.vc" };
const ruth = { name: "Ruth Alvarez", email: "ruth@cobaltdata.eu" };
const events = { name: "Events Team", email: "events@northwind.io" };

type MessageSeed = {
  id: string;
  from: { name: string; email: string };
  to: { name: string; email: string }[];
  cc?: { name: string; email: string }[];
  sentAt: string;
  body: string;
  unread?: boolean;
  attachments?: EmailMessage["attachments"];
};

function thread(
  id: string,
  subject: string,
  labelIds: string[],
  seeds: MessageSeed[],
): EmailThread {
  const messages: EmailMessage[] = seeds.map((seed, index) => ({
    id: seed.id,
    threadId: id,
    rfcMessageId: `<${seed.id}@mail.example>`,
    from: seed.from,
    to: seed.to,
    cc: seed.cc ?? [],
    subject: index === 0 ? subject : `Re: ${subject}`,
    snippet: seed.body.replace(/\s+/g, " ").slice(0, 140),
    bodyText: seed.body,
    bodyHtml: null,
    sentAt: seed.sentAt,
    labelIds: seed.unread ? [...labelIds, "UNREAD"] : labelIds,
    isUnread: seed.unread ?? false,
    attachments: seed.attachments ?? [],
  }));

  const last = messages.at(-1)!;
  const participants = [...new Map(messages.map((m) => [m.from.email, m.from])).values()];

  return {
    id,
    subject,
    snippet: last.snippet,
    participants,
    messageCount: messages.length,
    lastMessageAt: last.sentAt,
    isUnread: messages.some((m) => m.isUnread),
    isStarred: labelIds.includes("STARRED"),
    hasAttachments: messages.some((m) => m.attachments.length > 0),
    labelIds: messages.some((m) => m.isUnread) ? [...labelIds, "UNREAD"] : labelIds,
    messages,
  };
}

const rawThreads: EmailThread[] = [
  thread("18f2a01", "Q4 renewal: pricing tiers", ["INBOX", "IMPORTANT"], [
    {
      id: "18f2a01a",
      from: me,
      to: [maya],
      sentAt: "2026-10-08T09:14:00Z",
      body: `Hi Maya,

Attached is the revised proposal for the Q4 renewal. The main change is the move from per-seat pricing to three usage tiers, which should fit your seasonal volume better.

Happy to walk through it on a call this week.

Alex`,
      attachments: [
        { id: "att1", filename: "Northwind-Acme-renewal-Q4.pdf", mimeType: "application/pdf", sizeBytes: 482_113 },
      ],
    },
    {
      id: "18f2a01b",
      from: maya,
      to: [me],
      cc: [tom],
      sentAt: "2026-10-09T15:02:00Z",
      body: `Thanks Alex, this is helpful. Looping in Tom from procurement.

The Growth tier looks right for us, but our peak in November usually runs about 30% over the cap. Is overage billed at the same per-unit rate, or is there a step-up?`,
    },
    {
      id: "18f2a01c",
      from: tom,
      to: [me, maya],
      sentAt: "2026-10-10T08:40:00Z",
      body: `Hi both,

Two things from procurement before we can approve:
1. We need the overage rate in writing.
2. Our fiscal year closes Oct 31, so a signed order form has to reach us by Oct 24.

Tom`,
    },
    {
      id: "18f2a01d",
      from: maya,
      to: [me],
      cc: [tom],
      sentAt: "2026-10-12T07:51:00Z",
      unread: true,
      body: `Alex, just checking whether you've had a chance to look at the overage question. If we can settle it this week, I can get the order form through legal before Tom's deadline.

Could you also confirm whether the 12-month term still includes the onboarding credits we discussed?

Maya`,
    },
  ]),

  thread("18f2a02", "Order form redlines: section 7.2 liability cap", ["INBOX", "STARRED"], [
    {
      id: "18f2a02a",
      from: jonas,
      to: [me],
      sentAt: "2026-10-11T16:20:00Z",
      body: `Dear Alex,

Please find our redlines attached. The only material change is in 7.2: we propose capping liability at 12 months of fees rather than 6, which is standard for our client's vendor policy.

Everything else is clean. If you can accept 7.2, we are ready to sign.

Kind regards,
Jonas Weber`,
      attachments: [
        { id: "att2", filename: "Order-Form_v4_redlined.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", sizeBytes: 96_420 },
      ],
    },
  ]),

  thread("18f2a03", "Senior PM loop: Thursday availability", ["INBOX"], [
    {
      id: "18f2a03a",
      from: priya,
      to: [me],
      sentAt: "2026-10-11T10:05:00Z",
      body: `Hey Alex, the final candidate for the Senior PM role can only do Thursday. Could you take the 2:00–2:45 product sense slot?`,
    },
    {
      id: "18f2a03b",
      from: priya,
      to: [me],
      sentAt: "2026-10-12T08:30:00Z",
      unread: true,
      body: `Bumping this. I need to send the schedule to the candidate by noon today. If Thursday doesn't work, Lena can cover but she'd prefer not to.`,
    },
  ]),

  thread("18f2a04", "September close: 3 invoices need your approval", ["INBOX"], [
    {
      id: "18f2a04a",
      from: finance,
      to: [me],
      sentAt: "2026-10-12T06:00:00Z",
      unread: true,
      body: `Three invoices assigned to you are waiting for approval before the September close on Oct 14:

• Cobalt Data, INV-2291, €4,800
• Fieldlane, INV-0174, $12,250
• Studio Marsh, INV-88, $2,100

Approve or reject them in the finance portal.`,
    },
  ]),

  thread("18f2a05", "Following up on the integration timeline", ["INBOX", "IMPORTANT"], [
    {
      id: "18f2a05a",
      from: sam,
      to: [me],
      sentAt: "2026-09-29T13:12:00Z",
      body: `Hi Alex, any update on when the warehouse integration will be live? We were told end of September.`,
    },
    {
      id: "18f2a05b",
      from: me,
      to: [sam],
      sentAt: "2026-09-30T09:00:00Z",
      body: `Hi Sam, sorry for the slip. We found an issue with the sync between your scanners and our inventory feed. I'll have a firm date for you by Friday.`,
    },
    {
      id: "18f2a05c",
      from: sam,
      to: [me],
      sentAt: "2026-10-10T17:45:00Z",
      unread: true,
      body: `Alex, it's been well past Friday and I haven't heard anything. Our ops team planned peak-season staffing around this go-live, and I now have to explain the delay to our COO on Monday.

I need a committed date and a plan for the interim, or we'll have to revisit the contract.`,
    },
  ]),

  thread("18f2a06", "Onboarding flow v3: ready for review", ["INBOX"], [
    {
      id: "18f2a06a",
      from: lena,
      to: [me, priya],
      sentAt: "2026-10-09T11:30:00Z",
      body: `Hi both, v3 of the onboarding flow is ready. Main changes: the workspace setup is now one step instead of three, and the import screen shows progress per source.

I'd love comments by Wednesday so we can hand off to engineering in the next sprint.`,
    },
  ]),

  thread("18f2a07", "Intro: Daniel ↔ Ruth (EU data residency)", ["SENT"], [
    {
      id: "18f2a07a",
      from: me,
      to: [daniel, ruth],
      sentAt: "2026-10-06T14:00:00Z",
      body: `Daniel, meet Ruth. She leads infrastructure at Cobalt Data and has been through exactly the EU data-residency questions your portfolio company is facing.

Ruth, Daniel is a partner at Park Ventures. I'll let you two take it from here.

Alex`,
    },
  ]),

  thread("18f2a08", "Re: Board deck feedback", ["DRAFT"], [
    {
      id: "18f2a08a",
      from: me,
      to: [priya],
      sentAt: "2026-10-11T19:10:00Z",
      body: `Priya, a few notes on the deck before Thursday. Slide 6 (retention) needs the cohort chart instead of the blended number…`,
    },
  ]),

  thread("18f2a09", "Offsite logistics: final headcount", [], [
    {
      id: "18f2a09a",
      from: events,
      to: [me],
      sentAt: "2026-09-18T09:00:00Z",
      body: `Final headcount for the offsite is 42. Rooms are confirmed at the venue; travel details will follow next week.`,
    },
  ]),

  thread("18f2a0a", "Webinar: modern warehouse ops", ["TRASH"], [
    {
      id: "18f2a0aa",
      from: { name: "Industry Webinars", email: "noreply@webinars.example" },
      to: [me],
      sentAt: "2026-10-01T12:00:00Z",
      body: `Join us on October 20 for a session on modern warehouse operations.`,
    },
  ]),
];

export const sampleThreads = z.array(emailThreadSchema).parse(rawThreads);

const aiSampleSchema = z.record(
  gmailIdSchema,
  z.object({
    summary: threadSummarySchema.optional(),
    draft: replyDraftSchema.optional(),
    followUps: followUpSuggestionsSchema.optional(),
  }),
);

export type AiSamples = z.infer<typeof aiSampleSchema>;

/** Example assistant output, shaped exactly like the structured responses from Step 4. */
export const sampleAiOutputs: AiSamples = aiSampleSchema.parse({
  "18f2a01": {
    summary: {
      tldr: "Acme wants to move to the Growth tier but needs the overage rate in writing and a signed order form by Oct 24 to make their fiscal year.",
      keyPoints: [
        "Acme's November peak runs about 30% over the Growth tier cap.",
        "Procurement (Tom) has joined the thread and owns approval.",
        "Maya can push the order form through legal this week if open points are settled.",
      ],
      actionItems: [
        { task: "Confirm the overage rate in writing", owner: "Alex", dueDate: null },
        { task: "Confirm onboarding credits on the 12-month term", owner: "Alex", dueDate: null },
        { task: "Get the signed order form to procurement", owner: "Maya", dueDate: "Oct 24" },
      ],
      openQuestions: [
        "Is overage billed at the same per-unit rate or a step-up?",
        "Does the 12-month term still include onboarding credits?",
      ],
      sentiment: "urgent",
      detectedTone: "friendly",
      needsReply: true,
    },
    draft: {
      subject: "Re: Q4 renewal: pricing tiers",
      body: `Hi Maya, hi Tom,

Thanks for the patience. To close the open points:

1. Overage on the Growth tier is billed at the same per-unit rate, with no step-up. I'll add this to the order form in writing.
2. Yes, the 12-month term still includes the onboarding credits we discussed.

I'll send the updated order form tomorrow so it can reach legal well before Oct 24.

Best,
Alex`,
      tone: "friendly",
      assumptions: [
        "Overage is billed at the same rate (not confirmed in the thread)",
        "Onboarding credits are still approved internally",
      ],
    },
    followUps: {
      suggestions: [
        {
          kind: "schedule",
          title: "Check the order form reached legal",
          rationale: "Procurement's deadline is Oct 24; a check-in 3 days ahead leaves time to fix blockers.",
          suggestedDelayDays: 9,
          draftBody: "Hi Maya, checking that the order form made it through legal. Anything you need from me before Tom's Oct 24 deadline?",
        },
      ],
    },
  },
  "18f2a05": {
    summary: {
      tldr: "Sam is frustrated: the integration missed its September date and the promised Friday update never came. He needs a committed date and interim plan before Monday.",
      keyPoints: [
        "Original go-live was end of September.",
        "Alex promised a firm date by Friday and didn't follow up.",
        "Fieldlane planned peak-season staffing around the go-live.",
      ],
      actionItems: [
        { task: "Send a committed go-live date", owner: "Alex", dueDate: "Before Monday" },
        { task: "Propose an interim workaround for the scanner sync", owner: "Alex", dueDate: "Before Monday" },
      ],
      openQuestions: ["When will the integration go live?"],
      sentiment: "negative",
      detectedTone: "assertive",
      needsReply: true,
    },
  },
  "18f2a07": {
    followUps: {
      suggestions: [
        {
          kind: "nudge",
          title: "Check whether Daniel and Ruth connected",
          rationale: "Neither replied to the intro after 6 days; a light nudge keeps it from going cold.",
          suggestedDelayDays: 0,
          draftBody: "Hi both, just making sure this landed. Ruth, Daniel mentioned the residency question is time-sensitive on their side.",
        },
        {
          kind: "close-loop",
          title: "Ask Ruth if a call happened",
          rationale: "Ruth is the busier party; a direct note is more likely to get a reply.",
          suggestedDelayDays: 3,
          draftBody: null,
        },
      ],
    },
  },
});
