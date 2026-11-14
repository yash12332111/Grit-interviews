import Link from "next/link";
import { ArrowRightIcon, SparklesIcon, VideoIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { STATE_TONE, StateBadge } from "@/components/shared/StateBadge";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHANGE_CUTOFF_HOURS, MAX_RESCHEDULES } from "@/domain/config";
import { canCancel, canReschedule } from "@/domain/rules";
import { JOURNEY_STATE_LABEL, JourneyState } from "@/domain/states";
import { formatDate, formatDateTime, relativeDayLabel } from "@/lib/time";
import type { JourneyView } from "@/db/queries/student";
import { BookedActions } from "./BookedActions";

const HOUR_MS = 60 * 60 * 1000;

type JourneyCardProps = {
  journey: JourneyView;
  now: Date;
  /** The student's next badge journey in this track, for the "next up" hint on a passed card. */
  next?: { label: string; state: JourneyState } | null;
};

/** One card per badge journey on the student home. */
export function JourneyCard({ journey, now, next = null }: JourneyCardProps) {
  const { badge, state, attempt, booking, award, lastResult } = journey;
  const tone = STATE_TONE[state];
  const Icon = tone.icon;

  return (
    <Card data-state={state} className="relative overflow-hidden shadow-soft">
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1.5", tone.rail)} />
      <CardHeader className="flex flex-wrap items-center justify-between gap-3 pl-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", tone.iconWrap)}>
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold">{badge.label} badge</CardTitle>
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <SparklesIcon className="size-3 text-spark" aria-hidden="true" />
              {badge.bonusMiles} bonus miles on clearing
            </p>
          </div>
        </div>
        <StateBadge state={state} />
      </CardHeader>
      <CardContent className="space-y-3 pl-6 text-sm">
        {state === JourneyState.NOT_ELIGIBLE && (
          <p className="text-muted-foreground">
            You aren&apos;t eligible for the {badge.label} interview yet. Keep clearing skill levels
            through GRIT contests and it will open up here.
          </p>
        )}

        {state === JourneyState.READY_TO_BOOK && attempt && (
          <>
            {lastResult?.status === "retake_later" && <LastRetakeNote journey={journey} />}
            <p>You&apos;re eligible. Pick a time that works for you and lock in your interview.</p>
            <Link href={`/student/book/${attempt.id}`} className={cn(buttonVariants({ size: "lg" }), "px-4")}>
              Book interview
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </>
        )}

        {state === JourneyState.RETAKE_COOLDOWN && attempt && (
          <>
            <LastRetakeNote journey={journey} />
            <p>
              Booking for your next attempt opens on{" "}
              <strong>{formatDate(attempt.notBefore)}</strong>. Use the time to polish your answers.
            </p>
          </>
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
            <Link href={`/student/book/${attempt.id}`} className={cn(buttonVariants({ size: "lg" }), "px-4")}>
              Rebook interview
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </>
        )}

        {state === JourneyState.AWAITING_RESULT && booking && (
          <p>
            <strong>Result pending.</strong> Your interview was on {formatDateTime(booking.startAt)}.
            You&apos;ll see the outcome here as soon as your interviewer records it.
          </p>
        )}

        {state === JourneyState.PASSED && (
          <>
            <p>
              <strong>Badge earned</strong>
              {award ? ` on ${formatDate(award.awardedAt)}` : ""}. Well done!
            </p>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-base font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <SparklesIcon className="size-4" aria-hidden="true" />
              +{badge.bonusMiles} bonus miles
            </p>
            {lastResult?.status === "passed" && lastResult.notes ? (
              <p className="text-muted-foreground">
                Interviewer&apos;s note: <em>&ldquo;{lastResult.notes}&rdquo;</em>
              </p>
            ) : null}
            {next ? (
              <p className="text-muted-foreground">
                Next up: <strong className="text-foreground">{next.label}</strong> (
                {JOURNEY_STATE_LABEL[next.state].toLowerCase()}).
              </p>
            ) : null}
          </>
        )}

        {state === JourneyState.FAILED && (
          <>
            <p>
              You didn&apos;t clear the {badge.label} interview this time, and that&apos;s okay.
              {lastResult?.status === "failed" && lastResult.notes ? (
                <>
                  {" "}
                  Interviewer&apos;s note: <em>&ldquo;{lastResult.notes}&rdquo;</em>
                </>
              ) : null}
            </p>
            <p className="text-muted-foreground">
              Re-qualifying through the GRIT skill contests reopens booking for this badge
              automatically.
            </p>
          </>
        )}

        {state === JourneyState.BADGE_NULLIFIED && (
          <>
            <p>
              This badge has been revoked following an internal review, so its bonus miles no
              longer count.
            </p>
            {award?.nullificationReason ? (
              <p className="text-muted-foreground">
                Reason on record: <em>&ldquo;{award.nullificationReason}&rdquo;</em>
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** "Last attempt: Retake later" with the interviewer's notes, shown after a retake was granted. */
function LastRetakeNote({ journey }: { journey: JourneyView }) {
  const { lastResult, attempt } = journey;
  if (lastResult?.status !== "retake_later") return null;
  return (
    <p className="text-muted-foreground">
      {attempt ? `Attempt #${attempt.attemptNo}. ` : ""}Your last attempt was marked{" "}
      <strong className="text-foreground">Retake later</strong>
      {lastResult.noShow ? " because you couldn't join" : ""}.
      {lastResult.notes ? (
        <>
          {" "}
          Interviewer&apos;s note: <em>&ldquo;{lastResult.notes}&rdquo;</em>
        </>
      ) : null}
    </p>
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sky-50/70 p-3 ring-1 ring-sky-100">
        <div className="space-y-0.5">
          <p className="text-base font-semibold">
            {/* "Tomorrow, Sun, 15 Nov, …" — but don't repeat the date when it isn't a near day. */}
            {["Today", "Tomorrow", "Yesterday"].includes(relativeDayLabel(booking.startAt, now))
              ? `${relativeDayLabel(booking.startAt, now)}, `
              : ""}
            {formatDateTime(booking.startAt)}
          </p>
          <p className="text-muted-foreground">With {booking.interviewerFirstName}</p>
        </div>
        <a
          href={booking.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "bg-white")}
        >
          <VideoIcon data-icon="inline-start" />
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
