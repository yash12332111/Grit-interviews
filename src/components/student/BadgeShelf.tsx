import { BanIcon, LockIcon, SparklesIcon, TrophyIcon } from "lucide-react";
import { STATE_TONE, StateBadge } from "@/components/shared/StateBadge";
import { JourneyState } from "@/domain/states";
import type { JourneyView } from "@/db/queries/student";
import { cn } from "@/lib/utils";

type TileKind = "earned" | "nullified" | "in_progress" | "locked";

function kindOf(state: JourneyState): TileKind {
  if (state === JourneyState.PASSED) return "earned";
  if (state === JourneyState.BADGE_NULLIFIED) return "nullified";
  if (state === JourneyState.NOT_ELIGIBLE) return "locked";
  return "in_progress";
}

const TILE: Record<TileKind, string> = {
  earned: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white",
  nullified: "border-rose-200 bg-gradient-to-br from-rose-50 to-white",
  in_progress: "border-indigo-200 bg-gradient-to-br from-indigo-50 to-white",
  locked: "border-dashed bg-muted/40 text-muted-foreground",
};

const MEDAL: Record<TileKind, string> = {
  earned: "bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-lg shadow-orange-200",
  nullified: "bg-rose-100 text-rose-600",
  in_progress: "bg-grit text-white shadow-md",
  locked: "bg-slate-200 text-slate-500",
};

/** One tile per badge in the track, shown as a path from Novice upward (architecture §8.1 /student/badges). */
export function BadgeShelf({ journeys }: { journeys: JourneyView[] }) {
  return (
    <ul className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(15rem,1fr))]" aria-label="Badge shelf">
      {journeys.map((j, i) => {
        const kind = kindOf(j.state);
        const Medal =
          kind === "earned" ? TrophyIcon : kind === "nullified" ? BanIcon : kind === "locked" ? LockIcon : STATE_TONE[j.state].icon;
        return (
          <li
            key={j.badge.id}
            data-kind={kind}
            className={cn("relative space-y-3 rounded-2xl border p-5 shadow-soft", TILE[kind])}
          >
            <div className="flex items-start gap-4">
              <span className={cn("grid size-14 shrink-0 place-items-center rounded-full", MEDAL[kind])}>
                <Medal className="size-7" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 space-y-1.5">
                <p
                  className={cn(
                    "text-lg font-bold break-words",
                    kind === "nullified" && "line-through decoration-2 text-rose-900/70",
                  )}
                >
                  {j.badge.label}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Level {i + 1}
                  </span>
                  {kind === "earned" && (
                    <span data-slot="badge" className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                      Earned
                    </span>
                  )}
                  {kind === "nullified" && (
                    <span data-slot="badge" className="rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                      Nullified
                    </span>
                  )}
                  {kind === "in_progress" && <StateBadge state={j.state} />}
                  {kind === "locked" && (
                    <span data-slot="badge" className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                      Locked
                    </span>
                  )}
                </div>
              </div>
            </div>

            {kind === "earned" && (
              <p className="flex items-center gap-1.5 text-sm">
                <SparklesIcon className="size-4 text-spark" aria-hidden="true" />
                <span>
                  <strong>+{j.badge.bonusMiles} bonus miles</strong> added to your GRIT profile.
                </span>
              </p>
            )}
            {kind === "nullified" && (
              <p className="text-sm">
                This badge was revoked after a review, so its bonus miles no longer count.
              </p>
            )}
            {kind === "in_progress" && (
              <p className="text-sm">
                Worth +{j.badge.bonusMiles} bonus miles once you clear the interview.
              </p>
            )}
            {kind === "locked" && (
              <p className="text-sm">
                Locked. Clear the earlier badges and the skill levels for {j.badge.label} first.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
