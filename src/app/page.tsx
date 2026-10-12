import { redirect } from "next/navigation";
import { Suspense } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { siteConfig } from "@/config/site";
import { readSession } from "@/lib/auth/session";

/**
 * Placeholder until the mail workspace lands in Step 3.
 */
export default function HomePage() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-3 border-l border-border pl-5">
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Setup
        </p>
        <h1 className="text-lg font-medium tracking-tight">{siteConfig.name}</h1>
        <p className="leading-relaxed text-muted-foreground">
          {siteConfig.description}
        </p>
        <Suspense fallback={<Skeleton className="h-8 w-full" />}>
          <AccountRow />
        </Suspense>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Toggle theme with <Kbd>⇧</Kbd>
          <Kbd>D</Kbd>
        </p>
      </div>
    </main>
  );
}

async function AccountRow() {
  const session = await readSession();
  // The proxy only checks cookie presence; an unreadable cookie lands here.
  if (!session) redirect("/login?error=session_expired");

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card py-1 pr-1 pl-3">
      <span className="truncate text-[0.8rem]">{session.user.email}</span>
      <SignOutButton />
    </div>
  );
}
