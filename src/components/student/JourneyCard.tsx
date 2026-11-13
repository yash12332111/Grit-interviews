import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHANGE_CUTOFF_HOURS, MAX_RESCHEDULES } from "@/domain/config";
import { canCancel, canReschedule } from "@/domain/rules";
import { JourneyState } from "@/domain/states";
import { formatDate, formatDateTime, relativeDayLabel } from "@/lib/time";
import type { JourneyView } from "@/db/queries/student";
import { JOURNEY_STATE_LABEL } from "@/db/queries/personas";
import { BookedActions } from "./BookedActions";

const HOUR_MS = 60 * 60 * 1000;

/** One card per badge journey on the student home. */
export function JourneyCard({ journey, now }: { journey: JourneyView; now: Date }) {
  const { badge, state, attempt, booking } = journey;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">{badge.label} badge</CardTitle>
        <Badge variant="secondary">{JOURNEY_STATE_LABEL[state]}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {state === JourneyState.NOT_ELIGIBLE && (
          <p className="text-muted-foreground">
            You aren&apos;t eligible for the {badge.label} interview yet. Keep clearing skill levels
            through GRIT contests and it will open up here.
          </p>
        )}

        {state === JourneyState.READY_TO_BOOK && attempt && (
          <>
            <p>You&apos;re eligible. Pick a time that works for you and lock in your interview.</p>
            <Link href={`/student/book/${attempt.id}`} className={buttonVariants()}>
              Book interview
            </Link>
          </>
        )}

        {state === JourneyState.RETAKE_COOLDOWN && attempt && (
          <p>
            Booking for your next attempt opens on{" "}
            <strong>{formatDate(attempt.notBefore)}</strong>. Use the time to polish your answers.
          </p>
        )}

        {state === JourneyState.BOOKED && attempt && booking && (
          <BookedBody journey={journey} now={now} />
        )}

        {state === JourneyState.RESCHEDULE_REQUIRED && attempt && (
          <>
            <p>
              Your interviewer had to move this interview.
              {journey.interviewerCancelReason ? (
                <>
                  {" "}
                  Reason: <em>&ldquo;{journey.interviewerCancelReason}&rdquo;</em>.
                </>
              ) : null}{" "}
              It doesn&apos;t count against your reschedule limit.
            </p>
            <Link href={`/student/book/${attempt.id}`} className={buttonVariants()}>
              Rebook interview
            </Link>
          </>
        )}

        {state === JourneyState.AWAITING_RESULT && booking && (
          <p>
            <strong>Result pending.</strong> Your interview was on {formatDateTime(booking.startAt)}.
            You&apos;ll see the outcome here as soon as your interviewer records it.
          </p>
        )}

        {(state === JourneyState.PASSED ||
          state === JourneyState.FAILED ||
          state === JourneyState.BADGE_NULLIFIED) && (
          <p className="text-muted-foreground">
            {state === JourneyState.PASSED && "Badge earned."}
            {state === JourneyState.FAILED && "Not cleared this time."}
            {state === JourneyState.BADGE_NULLIFIED && "This badge has been revoked."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function BookedBody({ journey, now }: { journey: JourneyView; now: Date }) {
  const { badge, attempt, booking } = journey;
  if (!attempt || !booking) return null;

  const cancelOk = canCancel({
    booking: { start_at: booking.startAt, status: "active" },
    now,
  }).ok;
  const rescheduleCheck = canReschedule({
    booking: { start_at: booking.startAt, status: "active" },
    rescheduleCount: attempt.rescheduleCount,
    now,
  });
  const rescheduleOk = rescheduleCheck.ok;
  const cutoff = new Date(booking.startAt.getTime() - CHANGE_CUTOFF_HOURS * HOUR_MS);
  const limitReached = !rescheduleCheck.ok && rescheduleCheck.code === "RESCHEDULE_LIMIT";

  return (
    <>
      <div className="space-y-1">
        <p className="text-base font-semibold">
          {relativeDayLabel(booking.startAt, now)}, {formatDateTime(booking.startAt)}
        </p>
        <p className="text-muted-foreground">With {booking.interviewerFirstName}</p>
        <a
          href={booking.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium underline underline-offset-4"
        >
          Join link
        </a>
      </div>

      <BookedActions
        attemptId={attempt.id}
        bookingId={booking.id}
        whenLabel={formatDateTime(booking.startAt)}
        badgeLabel={badge.label}
        canReschedule={rescheduleOk}
        canCancel={cancelOk}
      />

      <p className="text-xs text-muted-foreground">
        {!cancelOk
          ? `Changes closed ${CHANGE_CUTOFF_HOURS} hours before the interview, at ${formatDateTime(cutoff)}.`
          : limitReached
            ? `You've used all ${MAX_RESCHEDULES} reschedules. You can still cancel until ${formatDateTime(cutoff)}.`
            : `Reschedules used: ${attempt.rescheduleCount} of ${MAX_RESCHEDULES}. You can change this until ${formatDateTime(cutoff)}.`}
      </p>
    </>
  );
}
