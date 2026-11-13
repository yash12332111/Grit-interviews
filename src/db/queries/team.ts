// src/db/queries/team.ts
// Read-only: the interview team's booked / not-booked tracker (architecture §8.1 /team).

import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import {
  availabilitySlots,
  badgeAwards,
  badges,
  bookings,
  eligibilities,
  interviewAttempts,
  users,
} from "@/db/schema";
import { OUTCOME_OVERDUE_HOURS } from "@/domain/config";
import { deriveJourneyState, type DeriveJourneyInput } from "@/domain/derive";
import { badgeLabel } from "@/domain/messages";
import { AttemptStatus, AwardStatus, JourneyState } from "@/domain/states";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const OPEN_STATUSES: string[] = [
  AttemptStatus.AWAITING_BOOKING,
  AttemptStatus.BOOKED,
  AttemptStatus.RESCHEDULE_REQUIRED,
];

/** Counted in the "Booked" tile. */
export const BOOKED_STATES: JourneyState[] = [JourneyState.BOOKED, JourneyState.AWAITING_RESULT];

/** Counted in the "Not booked" tile. */
export const NOT_BOOKED_STATES: JourneyState[] = [
  JourneyState.READY_TO_BOOK,
  JourneyState.RESCHEDULE_REQUIRED,
  JourneyState.RETAKE_COOLDOWN,
];

export type TrackerRow = {
  /** `${studentId}:${badgeId}` */
  key: string;
  studentName: string;
  badgeLevel: string;
  badgeLabel: string;
  badgeRank: number;
  state: JourneyState;
  slotStart: Date | null;
  interviewerName: string | null;
  daysSinceEligible: number;
  outcomeOverdue: boolean;
  /** Set when the badge is earned and can be flagged (state PASSED). */
  badgeAwardId: string | null;
};

/**
 * One row per (student, badge) where the student has an active eligibility OR
 * an award (active or nullified) for that badge. Failed students (eligibility
 * revoked, no award) are not listed.
 */
export async function getTrackerRows(): Promise<{ now: Date; rows: TrackerRow[] }> {
  await connection();
  const interviewer = alias(users, "interviewer");

  const [studentRows, badgeRows, eligRows, attemptRows, bookingRows, awardRows] = await Promise.all([
    db.select({ id: users.id, name: users.name }).from(users).where(eq(users.role, "student")),
    db.select().from(badges).orderBy(badges.level_rank),
    db.select().from(eligibilities),
    db.select().from(interviewAttempts),
    db
      .select({
        attemptId: bookings.attempt_id,
        startAt: availabilitySlots.start_at,
        interviewerName: interviewer.name,
      })
      .from(bookings)
      .innerJoin(availabilitySlots, eq(availabilitySlots.id, bookings.slot_id))
      .innerJoin(interviewer, eq(interviewer.id, bookings.interviewer_id))
      .where(eq(bookings.status, "active")),
    db.select().from(badgeAwards),
  ]);

  // Read the clock only after awaited queries (Cache Components rule).
  const now = new Date();
  const rows: TrackerRow[] = [];

  for (const student of studentRows) {
    for (const badge of badgeRows) {
      const elig = eligRows
        .filter((e) => e.student_id === student.id && e.badge_id === badge.id)
        .sort((a, b) => b.granted_at.getTime() - a.granted_at.getTime());
      const hasActiveElig = elig.some((e) => e.revoked_at === null);
      const awards = awardRows.filter((w) => w.student_id === student.id && w.badge_id === badge.id);
      if (!hasActiveElig && awards.length === 0) continue;

      const attempts = attemptRows
        .filter((a) => a.student_id === student.id && a.badge_id === badge.id)
        .sort((a, b) => b.attempt_no - a.attempt_no);
      const open = attempts.find((a) => OPEN_STATUSES.includes(a.status)) ?? null;
      const booking = open ? (bookingRows.find((b) => b.attemptId === open.id) ?? null) : null;

      const input: DeriveJourneyInput = {
        awards: awards.map((w) => ({ status: w.status as AwardStatus, badge_id: w.badge_id })),
        openAttempt: open
          ? { status: open.status as AttemptStatus, not_before: open.not_before }
          : null,
        activeBooking: booking ? { start_at: booking.startAt, status: "active" } : null,
        latestAttempt: attempts[0]
          ? { status: attempts[0].status as AttemptStatus, not_before: attempts[0].not_before }
          : null,
      };
      const state = deriveJourneyState(input, now);

      const grantedAt = elig[0]?.granted_at ?? now;
      const activeAward = awards.find((w) => w.status === "active") ?? null;

      rows.push({
        key: `${student.id}:${badge.id}`,
        studentName: student.name,
        badgeLevel: badge.level,
        badgeLabel: badgeLabel(badge.level),
        badgeRank: badge.level_rank,
        state,
        slotStart: booking?.startAt ?? null,
        interviewerName: booking?.interviewerName ?? null,
        daysSinceEligible: Math.max(0, Math.floor((now.getTime() - grantedAt.getTime()) / DAY_MS)),
        outcomeOverdue:
          state === JourneyState.AWAITING_RESULT &&
          booking !== null &&
          now.getTime() - booking.startAt.getTime() > OUTCOME_OVERDUE_HOURS * HOUR_MS,
        badgeAwardId: state === JourneyState.PASSED ? (activeAward?.id ?? null) : null,
      });
    }
  }

  // Default order: Not booked first, then Booked, then rows that already have
  // an award; within a group, longest-eligible first.
  const group = (s: JourneyState) =>
    NOT_BOOKED_STATES.includes(s) ? 0 : BOOKED_STATES.includes(s) ? 1 : 2;
  rows.sort(
    (a, b) =>
      group(a.state) - group(b.state) ||
      b.daysSinceEligible - a.daysSinceEligible ||
      a.studentName.localeCompare(b.studentName),
  );

  return { now, rows };
}
