import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { MailWorkspace } from "@/components/mail/mail-workspace";
import { WorkspaceSkeleton } from "@/components/mail/workspace-skeleton";
import { readSession } from "@/lib/auth/session";
import { FIXTURE_OWNER, sampleAiOutputs, sampleThreads } from "@/lib/fixtures/threads";

export const metadata: Metadata = { title: "Mail" };

export default function MailPage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Workspace />
    </Suspense>
  );
}

async function Workspace() {
  const session = await readSession();
  // The proxy only checks cookie presence; an unreadable cookie lands here.
  if (!session) redirect("/login?error=session_expired");

  // Sample data until Step 5 loads the real mailbox.
  return (
    <MailWorkspace
      user={session.user}
      initialThreads={sampleThreads}
      aiSamples={sampleAiOutputs}
      selfEmails={[session.user.email, FIXTURE_OWNER.email]}
    />
  );
}
