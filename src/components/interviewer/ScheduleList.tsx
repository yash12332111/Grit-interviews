import { AlertTriangleIcon, VideoIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { StateBadge } from "@/components/shared/StateBadge";
import { JourneyState } from "@/domain/states";
import { formatTime, formatDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { ScheduleItem } from "@/db/queries/interviewer";
import { NoShowButton } from "./NoShowButton";
import { OutcomeDialog } from "./OutcomeDialog";

const OUTCOME_TEXT: Record<NonNullable<ScheduleItem["outcome"]>, string> = {
  pass: "Passed",
  fail: "Failed",
  retake_later: "Retake later",
};

const OUTCOME_STATE: Record<NonNullable<ScheduleItem["outcome"]>, JourneyState> = {
  pass: JourneyState.PASSED,
  fail: JourneyState.FAILED,
  retake_later: JourneyState.RETAKE_COOLDOWN,
};

function State({ item }: { item: ScheduleItem }) {
  if (item.active) {
    return item.started ? (
      <StateBadge state={JourneyState.AWAITING_RESULT} />
    ) : (
      <StateBadge state={JourneyState.BOOKED} />
    );
  }
  if (item.noShow) return <StateBadge state={JourneyState.RETAKE_COOLDOWN} label="No-show · Retake later" />;
  if (item.outcome) return <StateBadge state={OUTCOME_STATE[item.outcome]} label={OUTCOME_TEXT[item.outcome]} />;
  return <StateBadge state={JourneyState.PASSED} label="Completed" />;
}

/** Interviews in time order, each with its outcome controls or its recorded (read-only) result. */
export function ScheduleList({
  items,
  showDate = false,
}: {
  items: ScheduleItem[];
  /** Show the date next to the time (used when rows come from several days). */
  showDate?: boolean;
}) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.bookingId}
          className={cn(
            "flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-soft sm:flex-row",
            item.overdue && "border-rose-200 ring-1 ring-rose-100",
          )}
        >
          <div className="flex shrink-0 items-center gap-3 sm:w-28 sm:flex-col sm:items-start sm:gap-0.5 sm:border-r sm:pr-4">
            <p className="text-xl font-extrabold tabular-nums text-primary">{formatTime(item.startAt)}</p>
            <p className="text-xs text-muted-foreground">{showDate ? formatDate(item.startAt) : "30 min"}</p>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-base font-semibold">{item.studentName}</p>
                <p className="text-sm text-muted-foreground">{item.badgeLabel} interview</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {item.overdue ? (
                  <span
                    data-slot="badge"
                    className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-semibold text-white"
                  >
                    <AlertTriangleIcon className="size-3.5" aria-hidden="true" />
                    Outcome overdue
                  </span>
                ) : null}
                <State item={item} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={item.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <VideoIcon data-icon="inline-start" />
                Join link
              </a>

              {item.active ? (
                item.started ? (
                  <>
                    <OutcomeDialog
                      bookingId={item.bookingId}
                      studentName={item.studentName}
                      badgeLabel={item.badgeLabel}
                      bonusMiles={item.bonusMiles}
                    />
                    <NoShowButton bookingId={item.bookingId} studentName={item.studentName} />
                  </>
                ) : (
                  <>
                    <Button size="sm" disabled>
                      Record outcome
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      Student didn&apos;t join
                    </Button>
                    <span className="text-xs text-muted-foreground">Opens at {formatTime(item.startAt)}</span>
                  </>
                )
              ) : null}
            </div>

            {!item.active ? (
              <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                Recorded:{" "}
                <strong className="text-foreground">
                  {item.noShow ? "Student didn't join (Retake later)" : item.outcome ? OUTCOME_TEXT[item.outcome] : "Completed"}
                </strong>
                {item.notes ? <> · &ldquo;{item.notes}&rdquo;</> : null}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
