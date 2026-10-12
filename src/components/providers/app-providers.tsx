"use client";

import { ThemeProvider } from "next-themes";

import { ThemeHotkey } from "@/components/providers/theme-hotkey";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider delayDuration={300}>
        {children}
        <ThemeHotkey />
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </ThemeProvider>
  );
}
