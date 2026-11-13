import Link from "next/link";
import { getActor } from "@/lib/session";
import { getAwaitingOutcome, getDaySchedule } from "@/db/queries/interviewer";
import { UserRole } from "@/domain/states";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { ScheduleList } from "@/components/interviewer/ScheduleList";
import { addIstDays, formatDateLong, istDayKey, relativeDayLabel } from "@/lib/time";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = await searchParams;
  // The layout redirects other roles; this just narrows the type.
  const actor = await getActor();
  if (!actor || actor.role !== UserRole.INTERVIEWER) return null;

  // Selected day: ?date=YYYY-MM-DD in IST, default today.
  const todayKey = istDayKey(new Date());
  const raw = typeof query.date === "string" ? query.date : null;
  const parsedDay = raw && DAY_RE.test(raw) ? new Date(`${raw}T00:00:00+05:30`) : null;
  const dayStart =
    parsedDay && !Number.isNaN(parsedDay.getTime()) && istDayKey(parsedDay) === raw
      ? parsedDay
      : new Date(`${todayKey}T00:00:00+05:30`);
  const dayKey = istDayKey(dayStart);

  const [awaiting, { now, items }] = await Promise.all([
    getAwaitingOutcome(actor.id),
    getDaySchedule(actor.id, dayKey),
  ]);

  const prev = istDayKey(addIstDays(dayStart, -1));
  const next = istDayKey(addIstDays(dayStart, 1));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Daily schedule</h1>
        <p className="text-sm text-muted-foreground">
          Your interviews, and the outcomes still waiting for you. Times are in IST.
        </p>
      </div>

      {awaiting.length > 0 ? (
        <section className="space-y-3" aria-labelledby="awaiting-heading">
          <h2 id="awaiting-heading" className="text-lg font-semibold">
            Awaiting your outcome ({awaiting.length})
          </h2>
          <ScheduleList items={awaiting} showDate />
        </section>
      ) : null}

      <section className="space-y-3" aria-labelledby="day-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="day-heading" className="text-lg font-semibold">
              {relativeDayLabel(dayStart, now)}
            </h2>
            <p className="text-sm text-muted-foreground">{formatDateLong(dayStart)}</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/interviewer/schedule?date=${prev}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              ← Previous day
            </Link>
            {dayKey !== todayKey ? (
              <Link href="/interviewer/schedule" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Today
              </Link>
            ) : null}
            <Link href={`/interviewer/schedule?date=${next}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Next day →
            </Link>
          </div>
        </div>

        {items.length === 0 ? (
          <EmptyState
            title="No interviews on this day"
            description="Students book from the slots you open, so add availability if you'd like to take more interviews."
            action={
              <Link href="/interviewer/availability" className={buttonVariants({ variant: "outline" })}>
                Manage availability
              </Link>
            }
          />
        ) : (
          <ScheduleList items={items} />
        )}
      </section>
    </div>
  );
}
