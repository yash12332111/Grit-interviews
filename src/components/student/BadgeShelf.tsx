import { Badge } from "@/components/ui/badge";
import { JOURNEY_STATE_LABEL, JourneyState } from "@/domain/states";
import type { JourneyView } from "@/db/queries/student";
import { cn } from "@/lib/utils";

type TileKind = "earned" | "nullified" | "in_progress" | "locked";

function kindOf(state: JourneyState): TileKind {
  if (state === JourneyState.PASSED) return "earned";
  if (state === JourneyState.BADGE_NULLIFIED) return "nullified";
  if (state === JourneyState.NOT_ELIGIBLE) return "locked";
  return "in_progress";
}

const KIND_STYLE: Record<TileKind, string> = {
  earned: "border-emerald-300 bg-emerald-50",
  nullified: "border-rose-200 bg-rose-50",
  in_progress: "border-sky-200 bg-sky-50",
  locked: "border-dashed bg-muted/40 text-muted-foreground",
};

/** One tile per badge in the track, whatever the student's progress (architecture §8.1 /student/badges). */
export function BadgeShelf({ journeys }: { journeys: JourneyView[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2" aria-label="Badge shelf">
      {journeys.map((j) => {
        const kind = kindOf(j.state);
        return (
          <li
            key={j.badge.id}
            data-kind={kind}
            className={cn("space-y-2 rounded-xl border p-4", KIND_STYLE[kind])}
          >
            <div className="flex items-start justify-between gap-2">
              <p
                className={cn(
                  "text-base font-semibold",
                  kind === "nullified" && "line-through decoration-2",
                )}
              >
                {j.badge.label}
              </p>
              {kind === "earned" && <Badge className="bg-emerald-600 text-white">Earned</Badge>}
              {kind === "nullified" && <Badge variant="destructive">Nullified</Badge>}
              {kind === "in_progress" && <Badge variant="secondary">{JOURNEY_STATE_LABEL[j.state]}</Badge>}
              {kind === "locked" && <Badge variant="outline">Locked</Badge>}
            </div>

            {kind === "earned" && (
              <p className="text-sm">
                <strong>+{j.badge.bonusMiles} bonus miles</strong> added to your GRIT profile.
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
