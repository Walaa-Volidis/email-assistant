"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { ApiClientError } from "@/lib/api/client";
import { type ApiErrorCode } from "@/schemas/api";

/** Retrying these can't succeed: the request itself is wrong or unauthorized. */
const FINAL_CODES: ReadonlySet<ApiErrorCode> = new Set([
  "BAD_REQUEST",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INTERNAL",
]);

function onError(error: unknown) {
  // An expired or revoked Google session anywhere sends the user to sign in.
  if (error instanceof ApiClientError && error.code === "UNAUTHENTICATED") {
    // A full page load on purpose: it drops every cached email from memory.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login?error=session_expired");
  }
}

function createClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          !(error instanceof ApiClientError && FINAL_CODES.has(error.code)) && failureCount < 2,
      },
      mutations: { retry: false },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(createClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
