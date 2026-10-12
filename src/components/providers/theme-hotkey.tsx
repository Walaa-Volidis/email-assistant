"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

import { isTypingTarget } from "@/lib/keyboard";

/** Shift+D toggles light/dark, ignored while the user is typing. */
export function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() !== "d" || isTypingTarget(event.target)) return;
      event.preventDefault();
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resolvedTheme, setTheme]);

  return null;
}
