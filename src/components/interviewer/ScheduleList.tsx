import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTime, formatDate } from "@/lib/time";
import type { ScheduleItem } from "@/db/queries/interviewer";
import { NoShowButton } from "./NoShowButton";
import { OutcomeDialog } from "./OutcomeDialog";

const OUTCOME_TEXT: Record<NonNullable<ScheduleItem["outcome"]>, string> = {
  pass: "Passed",
  fail: "Failed",
  retake_later: "Retake later",
};

function State({ item }: { item: ScheduleItem }) {
  if (item.active) {
    return item.started ? (
      <Badge variant="secondary">Awaiting result</Badge>
    ) : (
      <Badge variant="secondary">Booked</Badge>
    );
  }
  return (
    <Badge variant="outline">
      {item.noShow ? "No-show · Retake later" : item.outcome ? OUTCOME_TEXT[item.outcome] : "Completed"}
    </Badge>
  );
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
        <li key={item.bookingId} className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-base font-semibold">
                {showDate ? `${formatDate(item.startAt)}, ` : ""}
                {formatTime(item.startAt)} · {item.studentName}
              </p>
              <p className="text-sm text-muted-foreground">{item.badgeLabel} interview</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {item.overdue ? <Badge variant="destructive">Outcome overdue</Badge> : null}
              <State item={item} />
            </div>
          </div>

          <a
            href={item.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium underline underline-offset-4"
          >
            Join link
          </a>

          {item.active ? (
            item.started ? (
              <div className="flex flex-wrap gap-2">
                <OutcomeDialog
                  bookingId={item.bookingId}
                  studentName={item.studentName}
                  badgeLabel={item.badgeLabel}
                  bonusMiles={item.bonusMiles}
                />
                <NoShowButton bookingId={item.bookingId} studentName={item.studentName} />
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" disabled>
                  Record outcome
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Student didn&apos;t join
                </Button>
                <span className="text-xs text-muted-foreground">Opens at {formatTime(item.startAt)}</span>
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              Recorded: <strong className="text-foreground">{item.noShow ? "Student didn't join (Retake later)" : item.outcome ? OUTCOME_TEXT[item.outcome] : "Completed"}</strong>
              {item.notes ? <> · &ldquo;{item.notes}&rdquo;</> : null}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
