import { ZAuthErrorReasonSchema, type AuthErrorReason } from "@/schemas/auth";

const MESSAGES: Record<AuthErrorReason, string> = {
  access_denied: "Sign-in was cancelled.",
  missing_scope: "Gmail access wasn't granted. Tick the Gmail permission on the consent screen.",
  state_mismatch: "That sign-in link expired. Start again.",
  no_refresh_token: "Google didn't grant offline access. Try again.",
  unverified_email: "This Google account's email isn't verified.",
  session_expired: "Your session expired. Sign in again.",
  unknown: "Something went wrong signing in. Try again.",
};

export async function LoginError({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { error } = await searchParams;
  if (error === undefined) return null;

  const reason = ZAuthErrorReasonSchema.catch("unknown").parse(error);
  return (
    <p
      role="alert"
      className="mt-5 border-l-2 border-destructive pl-3 text-[0.8rem] leading-relaxed text-destructive"
    >
      {MESSAGES[reason]}
    </p>
  );
}
