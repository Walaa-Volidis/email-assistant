import { Skeleton } from "@/components/ui/skeleton";

export function WorkspaceSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading mail" className="flex h-dvh flex-1">
      <div className="hidden w-[232px] shrink-0 flex-col gap-2 border-r border-sidebar-border bg-sidebar p-3 md:flex">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="mt-2 h-8 w-full" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-6 w-3/4" />
        ))}
      </div>
      <div className="w-full shrink-0 border-r border-border md:w-[360px]">
        <div className="h-12 border-b border-border" />
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="space-y-1.5 border-b border-hairline px-4 py-3">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
      <div className="hidden flex-1 md:block">
        <div className="h-12 border-b border-border" />
      </div>
    </div>
  );
}
