import { Kbd } from "@/components/ui/kbd";
import { siteConfig } from "@/config/site";

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
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Toggle theme with <Kbd>⇧</Kbd>
          <Kbd>D</Kbd>
        </p>
      </div>
    </main>
  );
}
