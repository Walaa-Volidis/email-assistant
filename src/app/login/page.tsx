import { type Metadata } from "next";
import { Suspense } from "react";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { LoginError } from "@/components/auth/login-error";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-[22rem]">
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {siteConfig.name}
        </p>
        <h1 className="mt-2 text-xl font-medium tracking-tight">Sign in to your inbox</h1>
        <p className="mt-1.5 leading-relaxed text-muted-foreground">
          Connect a Gmail account to summarize threads and draft replies.
        </p>

        <Suspense fallback={null}>
          <LoginError searchParams={searchParams} />
        </Suspense>

        <Suspense fallback={<GoogleSignInButton returnTo="/" />}>
          <GoogleSignInButtonWithReturn searchParams={searchParams} />
        </Suspense>

        <dl className="mt-8 space-y-2.5 border-t border-hairline pt-5 text-xs text-muted-foreground">
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 font-mono text-[0.7rem] uppercase tracking-wider">Reads</dt>
            <dd>Threads you open, to summarize and draft against them.</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 font-mono text-[0.7rem] uppercase tracking-wider">Sends</dt>
            <dd>Only replies you review and confirm.</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 font-mono text-[0.7rem] uppercase tracking-wider">Stores</dt>
            <dd>Nothing server-side. Tokens live in an encrypted cookie.</dd>
          </div>
        </dl>
      </div>
    </main>
  );
}

async function GoogleSignInButtonWithReturn({
  searchParams,
}: Pick<PageProps<"/login">, "searchParams">) {
  const { returnTo } = await searchParams;
  return <GoogleSignInButton returnTo={typeof returnTo === "string" ? returnTo : "/"} />;
}
