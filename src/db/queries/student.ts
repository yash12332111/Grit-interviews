// src/db/queries/student.ts
// Read-only queries for the student area.

import { connection } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  availabilitySlots,
  badgeAwards,
  badges,
  bookings,
  eligibilities,
  interviewAttempts,
  notifications,
  users,
} from "@/db/schema";
import { deriveJourneyState, type DeriveJourneyInput } from "@/domain/derive";
import { badgeLabel } from "@/domain/messages";
import { AttemptStatus, AwardStatus, JourneyState } from "@/domain/states";

const OPEN_STATUSES: string[] = [
  AttemptStatus.AWAITING_BOOKING,
  AttemptStatus.BOOKED,
  AttemptStatus.RESCHEDULE_REQUIRED,
];

export type JourneyView = {
  badge: { id: string; level: string; label: string; rank: number; bonusMiles: number };
  state: JourneyState;
  /** The open attempt, or the latest attempt when none is open. */
  attempt: {
    id: string;
    attemptNo: number;
    status: string;
    notBefore: Date;
    rescheduleCount: number;
  } | null;
  /** The active booking on the open attempt. */
  booking: {
    id: string;
    startAt: Date;
    endAt: Date;
    meetingUrl: string;
    interviewerFirstName: string;
  } | null;
  /** Why the interviewer moved the slot (RESCHEDULE_REQUIRED only). */
  interviewerCancelReason: string | null;
  award: { id: string; status: string; awardedAt: Date } | null;
};

export type NotificationView = {
  id: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
};

export type StudentHome = {
  now: Date;
  journeys: JourneyView[];
  notification: NotificationView | null;
};

/**
 * Everything the student home needs: one journey per badge that has an
 * eligibility, attempt or award (else one NOT_ELIGIBLE journey for the track's
 * first badge), plus the latest unread notification.
 */
export async function getStudentHome(studentId: string): Promise<StudentHome> {
  await connection();

  const [badgeRows, eligRows, attemptRows, bookingRows, awardRows, notifRows] = await Promise.all([
    db.select().from(badges).orderBy(badges.level_rank),
    db
      .select()
      .from(eligibilities)
      .where(and(eq(eligibilities.student_id, studentId), isNull(eligibilities.revoked_at))),
    db.select().from(interviewAttempts).where(eq(interviewAttempts.student_id, studentId)),
    db
      .select({
        id: bookings.id,
        attemptId: bookings.attempt_id,
        status: bookings.status,
        cancelReason: bookings.cancel_reason,
        endedAt: bookings.ended_at,
        meetingUrl: bookings.meeting_url,
        startAt: availabilitySlots.start_at,
        endAt: availabilitySlots.end_at,
        interviewerName: users.name,
      })
      .from(bookings)
      .innerJoin(availabilitySlots, eq(bookings.slot_id, availabilitySlots.id))
      .innerJoin(users, eq(bookings.interviewer_id, users.id))
      .where(eq(bookings.student_id, studentId)),
    db.select().from(badgeAwards).where(eq(badgeAwards.student_id, studentId)),
    db
      .select()
      .from(notifications)
      .where(and(eq(notifications.user_id, studentId), isNull(notifications.read_at)))
      .orderBy(desc(notifications.created_at))
      .limit(1),
  ]);

  // Read the clock only after awaited queries (Cache Components rule).
  const now = new Date();

  const badgeIds = new Set<string>();
  for (const e of eligRows) badgeIds.add(e.badge_id);
  for (const a of attemptRows) badgeIds.add(a.badge_id);
  for (const w of awardRows) badgeIds.add(w.badge_id);
  if (badgeIds.size === 0 && badgeRows[0]) badgeIds.add(badgeRows[0].id);

  const journeys: JourneyView[] = [];
  for (const badge of badgeRows) {
    if (!badgeIds.has(badge.id)) continue;

    const attempts = attemptRows
      .filter((a) => a.badge_id === badge.id)
      .sort((a, b) => b.attempt_no - a.attempt_no);
    const open = attempts.find((a) => OPEN_STATUSES.includes(a.status)) ?? null;
    const shown = open ?? attempts[0] ?? null;
    const activeBooking = open
      ? (bookingRows.find((b) => b.attemptId === open.id && b.status === "active") ?? null)
      : null;
    const award = awardRows.find((w) => w.badge_id === badge.id) ?? null;
    const cancelledByInterviewer = open
      ? bookingRows
          .filter((b) => b.attemptId === open.id && b.status === "cancelled_by_interviewer")
          .sort((a, b) => (b.endedAt?.getTime() ?? 0) - (a.endedAt?.getTime() ?? 0))[0]
      : undefined;

    const input: DeriveJourneyInput = {
      awards: awardRows
        .filter((w) => w.badge_id === badge.id)
        .map((w) => ({ status: w.status as AwardStatus, badge_id: w.badge_id })),
      openAttempt: open
        ? { status: open.status as AttemptStatus, not_before: open.not_before }
        : null,
      activeBooking: activeBooking
        ? { start_at: activeBooking.startAt, status: activeBooking.status }
        : null,
      latestAttempt: attempts[0]
        ? { status: attempts[0].status as AttemptStatus, not_before: attempts[0].not_before }
        : null,
    };

    journeys.push({
      badge: {
        id: badge.id,
        level: badge.level,
        label: badgeLabel(badge.level),
        rank: badge.level_rank,
        bonusMiles: badge.bonus_miles,
      },
      state: deriveJourneyState(input, now),
      attempt: shown
        ? {
            id: shown.id,
            attemptNo: shown.attempt_no,
            status: shown.status,
            notBefore: shown.not_before,
            rescheduleCount: shown.reschedule_count,
          }
        : null,
      booking: activeBooking
        ? {
            id: activeBooking.id,
            startAt: activeBooking.startAt,
            endAt: activeBooking.endAt,
            meetingUrl: activeBooking.meetingUrl,
            interviewerFirstName: activeBooking.interviewerName.split(" ")[0],
          }
        : null,
      interviewerCancelReason: cancelledByInterviewer?.cancelReason ?? null,
      award: award ? { id: award.id, status: award.status, awardedAt: award.awarded_at } : null,
    });
  }

  const n = notifRows[0];
  return {
    now,
    journeys,
    notification: n
      ? { id: n.id, title: n.title, body: n.body, ctaLabel: n.cta_label, ctaHref: n.cta_href }
      : null,
  };
}

export type BookingTarget = {
  attemptId: string;
  status: string;
  notBefore: Date;
  badgeLabel: string;
  /** Set in reschedule mode: the student's current active booking. */
  currentBooking: { id: string; startAt: Date } | null;
};

/**
 * The attempt a student wants to book (or reschedule). Returns null when the
 * attempt doesn't exist or belongs to someone else, which the page turns into
 * a not-found screen.
 */
export async function getBookingTarget(
  studentId: string,
  attemptId: string,
  bookingId: string | null,
): Promise<BookingTarget | null> {
  await connection();

  const [attempt] = await db
    .select({
      id: interviewAttempts.id,
      studentId: interviewAttempts.student_id,
      status: interviewAttempts.status,
      notBefore: interviewAttempts.not_before,
      level: badges.level,
    })
    .from(interviewAttempts)
    .innerJoin(badges, eq(badges.id, interviewAttempts.badge_id))
    .where(eq(interviewAttempts.id, attemptId));
  if (!attempt || attempt.studentId !== studentId) return null;

  let currentBooking: BookingTarget["currentBooking"] = null;
  if (bookingId) {
    const [b] = await db
      .select({ id: bookings.id, startAt: availabilitySlots.start_at })
      .from(bookings)
      .innerJoin(availabilitySlots, eq(availabilitySlots.id, bookings.slot_id))
      .where(
        and(
          eq(bookings.id, bookingId),
          eq(bookings.attempt_id, attemptId),
          eq(bookings.student_id, studentId),
          eq(bookings.status, "active"),
        ),
      );
    currentBooking = b ?? null;
  }

  return {
    attemptId: attempt.id,
    status: attempt.status,
    notBefore: attempt.notBefore,
    badgeLabel: badgeLabel(attempt.level),
    currentBooking,
  };
}
