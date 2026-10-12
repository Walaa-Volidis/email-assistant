"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { apiResponseSchema } from "@/schemas/api";

const logoutResponseSchema = apiResponseSchema(z.object({ signedOut: z.literal(true) }));

export function useSignOut() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const signOut = useCallback(() => {
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
  }, [router]);

  return { signOut, pending };
}
