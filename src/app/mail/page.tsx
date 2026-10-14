import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { MailWorkspace } from "@/components/mail/mail-workspace";
import { WorkspaceSkeleton } from "@/components/mail/workspace-skeleton";
import { readSession } from "@/lib/auth/session";

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
  return <MailWorkspace user={session.user} />;
}
