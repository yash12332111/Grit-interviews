import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getActor } from "@/lib/session";
import { getBookingTarget } from "@/db/queries/student";
import { getOpenTimes } from "@/db/queries/slots";
import { BOOK_MAX_DAYS, BOOK_MIN_LEAD_HOURS, SLOT_MINUTES } from "@/domain/config";
import { AttemptStatus, UserRole } from "@/domain/states";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { SlotPicker } from "@/components/student/SlotPicker";
import { CalendarClockIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatDate, formatDateTime } from "@/lib/time";

const idSchema = z.guid();

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ attemptId }, query] = await Promise.all([params, searchParams]);
  const actor = await getActor();
  if (!actor || actor.role !== UserRole.STUDENT) return null;
  if (!idSchema.safeParse(attemptId).success) notFound();

  const rawBookingId = typeof query.bookingId === "string" ? query.bookingId : null;
  const bookingId = rawBookingId && idSchema.safeParse(rawBookingId).success ? rawBookingId : null;
  const wantsReschedule = query.mode === "reschedule" && bookingId !== null;

  const target = await getBookingTarget(actor.id, attemptId, wantsReschedule ? bookingId : null);
  if (!target) notFound();

  const back = (
    <Link href="/student" className={buttonVariants({ variant: "outline" })}>
      Back to home
    </Link>
  );

  let content: React.ReactNode;
  if (wantsReschedule && !target.currentBooking) {
    content = (
      <EmptyState
        title="That booking can't be changed"
        description="It may already have been cancelled or moved."
        action={back}
      />
    );
  } else if (!wantsReschedule && target.status === AttemptStatus.AWAITING_BOOKING && target.notBefore > new Date()) {
    content = (
      <EmptyState
        title="Booking isn't open yet"
        description={`Your next attempt opens on ${formatDate(target.notBefore)}.`}
        action={back}
      />
    );
  } else if (
    !wantsReschedule &&
    target.status !== AttemptStatus.AWAITING_BOOKING &&
    target.status !== AttemptStatus.RESCHEDULE_REQUIRED
  ) {
    content = (
      <EmptyState
        title="Nothing to book here"
        description="This interview is already booked or closed. Your home screen shows where things stand."
        action={back}
      />
    );
  } else {
    const days = await getOpenTimes();
    content = (
      <SlotPicker
        attemptId={target.attemptId}
        badgeLabel={target.badgeLabel}
        days={days}
        reschedule={
          wantsReschedule && target.currentBooking
            ? {
                bookingId: target.currentBooking.id,
                currentLabel: formatDateTime(target.currentBooking.startAt),
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <PageHeader
        icon={CalendarClockIcon}
        title={`${wantsReschedule ? "Reschedule" : "Book"} your ${target.badgeLabel} interview`}
        description={`Interviews are ${SLOT_MINUTES} minutes. Times are in IST and open from ${BOOK_MIN_LEAD_HOURS} hours ahead, up to ${BOOK_MAX_DAYS} days ahead.`}
      />
      {content}
    </div>
  );
}
