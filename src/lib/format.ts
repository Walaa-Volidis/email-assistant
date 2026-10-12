/*
 * Date formatting for the mail UI. These run on the server and the client,
 * whose time zones can differ, so render the results inside
 * <time suppressHydrationWarning>.
 */

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Thread list: "09:41" today, "Oct 3" this year, "3/10/25" otherwise. */
export function formatListTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (isSameDay(date, now)) {
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString(undefined, { year: "2-digit", month: "numeric", day: "numeric" });
}

/** Reader header: "Mon, Oct 12, 09:41". */
export function formatFullTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "3 days ago", "in 9 days", "today". */
export function formatRelativeDays(days: number): string {
  if (days === 0) return "today";
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(days, "day");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
