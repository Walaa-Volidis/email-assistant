"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { apiResponseSchema } from "@/schemas/api";

const logoutResponseSchema = apiResponseSchema(z.object({ signedOut: z.literal(true) }));

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function signOut() {
    startTransition(async () => {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const body = logoutResponseSchema.safeParse(await response.json());
      if (!body.success || !body.data.ok) {
        toast.error("Couldn't sign out. Try again.");
        return;
      }
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={signOut} disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
