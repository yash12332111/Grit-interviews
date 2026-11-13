// src/db/queries/interviewer.ts
// Read-only queries for the interviewer area.

import { connection } from "next/server";
import { and, asc, eq, gte, inArray, lt, lte } from "drizzle-orm";
import { db } from "@/db/client";
import {
  availabilitySlots,
  badges,
  bookings,
  interviewAttempts,
  users,
} from "@/db/schema";
import { OUTCOME_OVERDUE_HOURS } from "@/domain/config";
import { badgeLabel } from "@/domain/messages";
import { addIstDays, istDayStart } from "@/lib/time";

export type SlotView = {
  id: string;
  startAt: Date;
  endAt: Date;
  /** Derived, never stored: a slot is "booked" when a live booking sits on it. */
  status: "open" | "booked" | "withdrawn";
  studentName: string | null;
};

/** Bookings that still occupy a slot (cancelled ones free it up). */
const OCCUPYING: Array<"active" | "completed" | "no_show_student"> = [
  "active",
  "completed",
  "no_show_student",
];

/** How many IST days the availability grid shows, starting today. */
export const WEEK_DAYS = 7;

/**
 * The interviewer's slots for the 7 IST days starting today, each with a
 * derived open / booked / withdrawn status and the booked student's name.
 */
export async function getWeekSlots(interviewerId: string): Promise<{
  from: Date;
  slots: SlotView[];
}> {
  await connection();
  const from = istDayStart(new Date());
  const to = addIstDays(from, WEEK_DAYS);

  const rows = await db
    .select({
      id: availabilitySlots.id,
      startAt: availabilitySlots.start_at,
      endAt: availabilitySlots.end_at,
      slotStatus: availabilitySlots.status,
      bookingId: bookings.id,
      studentName: users.name,
    })
    .from(availabilitySlots)
    .leftJoin(
      bookings,
      and(eq(bookings.slot_id, availabilitySlots.id), inArray(bookings.status, OCCUPYING)),
    )
    .leftJoin(users, eq(users.id, bookings.student_id))
    .where(
      and(
        eq(availabilitySlots.interviewer_id, interviewerId),
        gte(availabilitySlots.start_at, from),
        lt(availabilitySlots.start_at, to),
      ),
    )
    .orderBy(asc(availabilitySlots.start_at));

  const slots: SlotView[] = rows.map((r) => ({
    id: r.id,
    startAt: r.startAt,
    endAt: r.endAt,
    status: r.slotStatus === "withdrawn" ? "withdrawn" : r.bookingId ? "booked" : "open",
    studentName: r.studentName,
  }));

  return { from, slots };
}

// ---------------------------------------------------------------------------
// Daily schedule and outcome recording (P5)
// ---------------------------------------------------------------------------

export type ScheduleItem = {
  bookingId: string;
  startAt: Date;
  studentName: string;
  badgeLabel: string;
  bonusMiles: number;
  meetingUrl: string;
  /** Still open for an outcome (active booking) vs already recorded. */
  active: boolean;
  /** Interview time has been reached (now >= start_at). */
  started: boolean;
  /** Active and started more than OUTCOME_OVERDUE_HOURS ago. */
  overdue: boolean;
  /** Recorded result, for completed / no-show bookings. */
  outcome: "pass" | "fail" | "retake_later" | null;
  noShow: boolean;
  notes: string | null;
};

const SCHEDULE_STATUSES: Array<"active" | "completed" | "no_show_student"> = [
  "active",
  "completed",
  "no_show_student",
];

const OUTCOME_BY_ATTEMPT: Record<string, ScheduleItem["outcome"]> = {
  passed: "pass",
  failed: "fail",
  retake_later: "retake_later",
};

function scheduleSelect() {
  return db
    .select({
      bookingId: bookings.id,
      bookingStatus: bookings.status,
      meetingUrl: bookings.meeting_url,
      startAt: availabilitySlots.start_at,
      studentName: users.name,
      level: badges.level,
      bonusMiles: badges.bonus_miles,
      attemptStatus: interviewAttempts.status,
      notes: interviewAttempts.outcome_notes,
    })
    .from(bookings)
    .innerJoin(availabilitySlots, eq(availabilitySlots.id, bookings.slot_id))
    .innerJoin(users, eq(users.id, bookings.student_id))
    .innerJoin(interviewAttempts, eq(interviewAttempts.id, bookings.attempt_id))
    .innerJoin(badges, eq(badges.id, interviewAttempts.badge_id));
}

function toScheduleItem(r: Awaited<ReturnType<typeof scheduleSelect>>[number], now: Date): ScheduleItem {
  const active = r.bookingStatus === "active";
  const started = r.startAt.getTime() <= now.getTime();
  return {
    bookingId: r.bookingId,
    startAt: r.startAt,
    studentName: r.studentName,
    badgeLabel: badgeLabel(r.level),
    bonusMiles: r.bonusMiles,
    meetingUrl: r.meetingUrl,
    active,
    started,
    overdue: active && now.getTime() - r.startAt.getTime() > OUTCOME_OVERDUE_HOURS * 3_600_000,
    outcome: active ? null : (OUTCOME_BY_ATTEMPT[r.attemptStatus] ?? null),
    noShow: r.bookingStatus === "no_show_student",
    notes: r.notes,
  };
}

/** The interviewer's bookings on one IST day (active, completed, no-show), in time order. */
export async function getDaySchedule(
  interviewerId: string,
  dayKey: string,
): Promise<{ now: Date; items: ScheduleItem[] }> {
  await connection();
  const from = new Date(`${dayKey}T00:00:00+05:30`);
  const to = addIstDays(from, 1);

  const rows = await scheduleSelect()
    .where(
      and(
        eq(bookings.interviewer_id, interviewerId),
        inArray(bookings.status, SCHEDULE_STATUSES),
        gte(availabilitySlots.start_at, from),
        lt(availabilitySlots.start_at, to),
      ),
    )
    .orderBy(asc(availabilitySlots.start_at));

  const now = new Date();
  return { now, items: rows.map((r) => toScheduleItem(r, now)) };
}

/**
 * The interviewer's ACTIVE bookings whose start has passed, from any day,
 * oldest first. Overdue ones (older than OUTCOME_OVERDUE_HOURS) are flagged.
 */
export async function getAwaitingOutcome(interviewerId: string): Promise<ScheduleItem[]> {
  await connection();
  const now = new Date();
  const rows = await scheduleSelect()
    .where(
      and(
        eq(bookings.interviewer_id, interviewerId),
        eq(bookings.status, "active"),
        lte(availabilitySlots.start_at, now),
      ),
    )
    .orderBy(asc(availabilitySlots.start_at));
  return rows.map((r) => toScheduleItem(r, now));
}
