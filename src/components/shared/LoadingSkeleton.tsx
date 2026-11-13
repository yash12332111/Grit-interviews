import { Skeleton } from "@/components/ui/skeleton";

/** Page-level placeholder shown while a route streams in (also covers Neon cold starts). */
export function LoadingSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-5xl space-y-4 px-4 py-8"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <div className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}
