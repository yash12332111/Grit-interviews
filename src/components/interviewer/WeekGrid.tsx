import { cn } from "@/lib/utils";
import { formatDate, formatDateTime, formatTime, istDayKey, relativeDayLabel } from "@/lib/time";
import { addIstDays } from "@/lib/time";
import type { SlotView } from "@/db/queries/interviewer";
import { WEEK_DAYS } from "@/db/queries/interviewer";
import { WithdrawSlotButton } from "./WithdrawSlotButton";

const STATUS_STYLE: Record<SlotView["status"], string> = {
  open: "border-emerald-200 bg-emerald-50 text-emerald-900",
  booked: "border-sky-200 bg-sky-50 text-sky-900",
  withdrawn: "border-dashed bg-muted/40 text-muted-foreground",
};

const STATUS_LABEL: Record<SlotView["status"], string> = {
  open: "Open",
  booked: "Booked",
  withdrawn: "Withdrawn",
};

function Legend() {
  return (
    <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      {(Object.keys(STATUS_LABEL) as SlotView["status"][]).map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className={cn("inline-block size-3 rounded border", STATUS_STYLE[s])} />
          {STATUS_LABEL[s]}
        </li>
      ))}
    </ul>
  );
}

/** Seven IST days from today, each listing the interviewer's slots coloured by status. */
export function WeekGrid({ from, slots, now }: { from: Date; slots: SlotView[]; now: Date }) {
  const days = Array.from({ length: WEEK_DAYS }, (_, i) => {
    const day = addIstDays(from, i);
    const key = istDayKey(day);
    return { key, day, slots: slots.filter((s) => istDayKey(s.startAt) === key) };
  });

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Your next 7 days</h2>
        <Legend />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {days.map(({ key, day, slots: daySlots }) => (
          <div key={key} className="space-y-2 rounded-xl border bg-card p-3">
            <div>
              <p className="text-sm font-medium">{relativeDayLabel(day, now)}</p>
              <p className="text-xs text-muted-foreground">{formatDate(day)}</p>
            </div>
            {daySlots.length === 0 ? (
              <p className="text-xs text-muted-foreground">No slots</p>
            ) : (
              <ul className="space-y-1.5">
                {daySlots.map((slot) => (
                  <li
                    key={slot.id}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-lg border px-2 py-1 text-xs",
                      STATUS_STYLE[slot.status],
                    )}
                  >
                    <div className="min-w-0">
                      <p className={cn("font-medium", slot.status === "withdrawn" && "line-through")}>
                        {formatTime(slot.startAt)}
                      </p>
                      <p className="truncate">
                        {slot.status === "booked" && slot.studentName
                          ? slot.studentName
                          : STATUS_LABEL[slot.status]}
                      </p>
                    </div>
                    {slot.status !== "withdrawn" ? (
                      <WithdrawSlotButton
                        slotId={slot.id}
                        whenLabel={formatDateTime(slot.startAt)}
                        studentName={slot.status === "booked" ? (slot.studentName ?? "A student") : null}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
