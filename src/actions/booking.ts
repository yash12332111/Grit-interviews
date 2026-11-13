"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray, notExists, sql } from "drizzle-orm";
import { z } from "zod";
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
import {
  BOOK_MAX_DAYS,
  BOOK_MIN_LEAD_HOURS,
  CHANGE_CUTOFF_HOURS,
  MAX_RESCHEDULES,
} from "@/domain/config";
import {
  badgeLabel,
  bookingCancelledMessage,
  bookingConfirmedMessage,
  bookingRescheduledMessage,
  type MessageOutput,
} from "@/domain/messages";
import { canBook, canCancel, canReschedule } from "@/domain/rules";
import type { AwardRecord, BadgeRecord } from "@/domain/rules";
import {
  AttemptStatus,
  AwardStatus,
  BadgeLevel,
  MessageKey,
  UserRole,
} from "@/domain/states";
import { ActionError, ok, toFailure, type ErrorCode, type Result } from "@/lib/result";
import { requireRole } from "@/lib/session";
import { formatDate, formatDateTime } from "@/lib/time";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const HOUR_MS = 60 * 60 * 1000;

function revalidateAffected() {
  revalidatePath("/student");
  revalidatePath("/interviewer/schedule");
  revalidatePath("/interviewer/availability");
  revalidatePath("/team");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Postgres errors arrive wrapped by the driver/ORM; dig out code + constraint. */
function pgError(err: unknown): { code?: string; constraint?: string } {
  let e = err as { code?: unknown; constraint?: unknown; cause?: unknown } | undefined;
  for (let i = 0; i < 4 && e; i++) {
    if (typeof e.code === "string" && e.code.length === 5) {
      return {
        code: e.code,
        constraint: typeof e.constraint === "string" ? e.constraint : undefined,
      };
    }
    e = e.cause as typeof e;
  }
  return {};
}

function cutoffMessage(startAt: Date): string {
  const cutoff = new Date(startAt.getTime() - CHANGE_CUTOFF_HOURS * HOUR_MS);
  return `Changes close ${CHANGE_CUTOFF_HOURS} hours before the interview, at ${formatDateTime(cutoff)}, so this can't be changed any more.`;
}

type AttemptContext = {
  attempt: typeof interviewAttempts.$inferSelect;
  badge: typeof badges.$inferSelect;
  trackBadges: BadgeRecord[];
  awards: AwardRecord[];
};

/** Locks the attempt (SELECT … FOR UPDATE) and loads what the guards need. */
async function lockAttempt(tx: Tx, attemptId: string, actorId: string): Promise<AttemptContext> {
  const [attempt] = await tx
    .select()
    .from(interviewAttempts)
    .where(eq(interviewAttempts.id, attemptId))
    .for("update");
  // A foreign attempt looks exactly like a missing one.
  if (!attempt || attempt.student_id !== actorId) throw new ActionError("NOT_FOUND");

  const [badge] = await tx.select().from(badges).where(eq(badges.id, attempt.badge_id));
  const trackRows = await tx
    .select()
    .from(badges)
    .where(eq(badges.track_id, badge.track_id))
    .orderBy(asc(badges.level_rank));
  const awardRows = await tx
    .select({ badge_id: badgeAwards.badge_id, status: badgeAwards.status })
    .from(badgeAwards)
    .where(eq(badgeAwards.student_id, actorId));

  return {
    attempt,
    badge,
    trackBadges: trackRows.map((b) => ({
      id: b.id,
      level: b.level as BadgeLevel,
      level_rank: b.level_rank,
      track_id: b.track_id,
    })),
    awards: awardRows.map((a) => ({ badge_id: a.badge_id, status: a.status as AwardStatus })),
  };
}

/** Eligibility must still be active (it can be revoked mid-flow). */
async function assertEligible(tx: Tx, eligibilityId: string) {
  const [elig] = await tx
    .select({ revokedAt: eligibilities.revoked_at })
    .from(eligibilities)
    .where(eq(eligibilities.id, eligibilityId));
  if (!elig || elig.revokedAt !== null) throw new ActionError("NOT_ELIGIBLE");
}

function badgeRecord(ctx: AttemptContext): BadgeRecord {
  return {
    id: ctx.badge.id,
    level: ctx.badge.level as BadgeLevel,
    level_rank: ctx.badge.level_rank,
    track_id: ctx.badge.track_id,
  };
}

/** Runs the T2/T6 guard and converts a refusal into the matching error code. */
function assertCanBook(params: {
  ctx: AttemptContext;
  attemptStatus: AttemptStatus;
  startAt: Date;
  now: Date;
  hasActiveBooking: boolean;
}) {
  const { ctx, attemptStatus, startAt, now, hasActiveBooking } = params;
  const result = canBook({
    attempt: {
      status: attemptStatus,
      not_before: ctx.attempt.not_before,
      reschedule_count: ctx.attempt.reschedule_count,
    },
    startAt,
    now,
    hasActiveBooking,
    badge: badgeRecord(ctx),
    studentAwards: ctx.awards,
    trackBadges: ctx.trackBadges,
  });
  if (result.ok) return;

  const map: Record<string, [ErrorCode, string?]> = {
    NOT_ELIGIBLE: ["NOT_ELIGIBLE"],
    PREREQUISITE_NOT_MET: [
      "NOT_ELIGIBLE",
      "You need the previous badge in this track before you can book this one.",
    ],
    ALREADY_BOOKED: [
      "ALREADY_BOOKED",
      "You already have an interview booked. Cancel or reschedule it first.",
    ],
    COOLDOWN_ACTIVE: [
      "COOLDOWN_ACTIVE",
      `Booking for this attempt opens on ${formatDate(ctx.attempt.not_before)}.`,
    ],
    WRONG_STATUS: ["INVALID_TRANSITION"],
    SLOT_TOO_SOON: [
      "VALIDATION",
      `Interviews can be booked from ${BOOK_MIN_LEAD_HOURS} hours ahead, up to ${BOOK_MAX_DAYS} days ahead.`,
    ],
    SLOT_TOO_FAR: [
      "VALIDATION",
      `Interviews can be booked from ${BOOK_MIN_LEAD_HOURS} hours ahead, up to ${BOOK_MAX_DAYS} days ahead.`,
    ],
  };
  const [code, message] = map[result.code] ?? ["UNKNOWN"];
  throw new ActionError(code, message);
}

/**
 * Books the first free slot that starts at `startAt` (slots are pooled, A-04).
 * Each insert runs in a savepoint, so losing a race on one slot (unique
 * violation) lets us try the next interviewer's slot without aborting the
 * whole transaction. No slot left → SLOT_TAKEN.
 */
async function insertBookingOnOpenSlot(
  tx: Tx,
  params: { attemptId: string; studentId: string; startAt: Date },
): Promise<{ bookingId: string; meetingUrl: string; interviewerName: string }> {
  const { attemptId, studentId, startAt } = params;

  const candidates = await tx
    .select({ id: availabilitySlots.id, interviewerId: availabilitySlots.interviewer_id })
    .from(availabilitySlots)
    .where(
      and(
        eq(availabilitySlots.start_at, startAt),
        eq(availabilitySlots.status, "open"),
        notExists(
          tx
            .select({ one: sql`1` })
            .from(bookings)
            .where(and(eq(bookings.slot_id, availabilitySlots.id), eq(bookings.status, "active"))),
        ),
      ),
    )
    .orderBy(asc(availabilitySlots.interviewer_id));

  for (const slot of candidates) {
    const bookingId = crypto.randomUUID();
    // A-17: displayed only; the prototype never launches or verifies calls.
    const meetingUrl = `https://meet.jit.si/GRIT-${bookingId.slice(0, 8)}`;
    try {
      await tx.transaction(async (savepoint) => {
        await savepoint.insert(bookings).values({
          id: bookingId,
          attempt_id: attemptId,
          slot_id: slot.id,
          student_id: studentId,
          interviewer_id: slot.interviewerId,
          status: "active",
          meeting_url: meetingUrl,
        });
      });
    } catch (err) {
      const pg = pgError(err);
      if (pg.code === "23505" && pg.constraint === "bookings_slot_active_unique") continue;
      if (pg.code === "23505" && pg.constraint === "bookings_student_active_unique") {
        throw new ActionError(
          "ALREADY_BOOKED",
          "You already have an interview booked. Cancel or reschedule it first.",
        );
      }
      throw err;
    }

    const [interviewer] = await tx
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, slot.interviewerId));
    return { bookingId, meetingUrl, interviewerName: interviewer?.name ?? "your interviewer" };
  }

  throw new ActionError("SLOT_TAKEN");
}

async function insertNotification(
  tx: Tx,
  params: { userId: string; attemptId: string; key: MessageKey; message: MessageOutput },
) {
  const { userId, attemptId, key, message } = params;
  await tx.insert(notifications).values({
    user_id: userId,
    attempt_id: attemptId,
    template_key: key,
    title: message.title,
    body: message.body,
    cta_label: message.ctaLabel ?? null,
    cta_href: message.ctaHref ?? null,
  });
}

// ---------------------------------------------------------------------------
// bookSlot (F1; T2 and T6)
// ---------------------------------------------------------------------------

const bookSchema = z.object({ attemptId: z.guid(), startAt: z.iso.datetime() });

export async function bookSlot(input: {
  attemptId: string;
  startAt: string;
}): Promise<Result<{ bookingId: string }>> {
  try {
    const actor = await requireRole(UserRole.STUDENT);
    const parsed = bookSchema.safeParse(input);
    if (!parsed.success) return toFailure(new ActionError("VALIDATION"));
    const startAt = new Date(parsed.data.startAt);

    const data = await db.transaction(async (tx) => {
      const now = new Date();
      const ctx = await lockAttempt(tx, parsed.data.attemptId, actor.id);
      await assertEligible(tx, ctx.attempt.eligibility_id);

      const [existing] = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(eq(bookings.student_id, actor.id), eq(bookings.status, "active")));

      assertCanBook({
        ctx,
        attemptStatus: ctx.attempt.status as AttemptStatus,
        startAt,
        now,
        hasActiveBooking: Boolean(existing),
      });

      const booking = await insertBookingOnOpenSlot(tx, {
        attemptId: ctx.attempt.id,
        studentId: actor.id,
        startAt,
      });

      // T2 / T6. A rebook after an interviewer withdrawal doesn't touch reschedule_count.
      const moved = await tx
        .update(interviewAttempts)
        .set({ status: "booked", updated_at: now })
        .where(
          and(
            eq(interviewAttempts.id, ctx.attempt.id),
            inArray(interviewAttempts.status, ["awaiting_booking", "reschedule_required"]),
          ),
        )
        .returning({ id: interviewAttempts.id });
      if (moved.length === 0) throw new ActionError("INVALID_TRANSITION");

      await insertNotification(tx, {
        userId: actor.id,
        attemptId: ctx.attempt.id,
        key: MessageKey.BOOKING_CONFIRMED,
        message: bookingConfirmedMessage({
          badgeName: badgeLabel(ctx.badge.level),
          startAt,
          interviewerName: booking.interviewerName,
          meetingUrl: booking.meetingUrl,
        }),
      });

      return { bookingId: booking.bookingId };
    });

    revalidateAffected();
    return ok(data);
  } catch (err) {
    return toFailure(err);
  }
}

// ---------------------------------------------------------------------------
// rescheduleBooking (F1b; T3)
// ---------------------------------------------------------------------------

const rescheduleSchema = z.object({ bookingId: z.guid(), startAt: z.iso.datetime() });

/** Loads the student's active booking and the start of its slot (no lock). */
async function findOwnActiveBooking(tx: Tx, bookingId: string, actorId: string) {
  const [row] = await tx
    .select({
      id: bookings.id,
      attemptId: bookings.attempt_id,
      studentId: bookings.student_id,
      status: bookings.status,
      meetingUrl: bookings.meeting_url,
      startAt: availabilitySlots.start_at,
    })
    .from(bookings)
    .innerJoin(availabilitySlots, eq(availabilitySlots.id, bookings.slot_id))
    .where(eq(bookings.id, bookingId));
  if (!row || row.studentId !== actorId) throw new ActionError("NOT_FOUND");
  return row;
}

export async function rescheduleBooking(input: {
  bookingId: string;
  startAt: string;
}): Promise<Result<{ bookingId: string }>> {
  try {
    const actor = await requireRole(UserRole.STUDENT);
    const parsed = rescheduleSchema.safeParse(input);
    if (!parsed.success) return toFailure(new ActionError("VALIDATION"));
    const newStartAt = new Date(parsed.data.startAt);

    const data = await db.transaction(async (tx) => {
      const now = new Date();

      // Find the attempt first, then lock it, then re-read the booking under the lock.
      const peek = await findOwnActiveBooking(tx, parsed.data.bookingId, actor.id);
      const ctx = await lockAttempt(tx, peek.attemptId, actor.id);
      const old = await findOwnActiveBooking(tx, parsed.data.bookingId, actor.id);

      if (old.status !== "active" || ctx.attempt.status !== "booked") {
        throw new ActionError("INVALID_TRANSITION");
      }
      await assertEligible(tx, ctx.attempt.eligibility_id);

      const allowed = canReschedule({
        booking: { start_at: old.startAt, status: old.status },
        rescheduleCount: ctx.attempt.reschedule_count,
        now,
      });
      if (!allowed.ok) {
        throw new ActionError(
          allowed.code,
          allowed.code === "CUTOFF_PASSED"
            ? cutoffMessage(old.startAt)
            : `You've used all ${MAX_RESCHEDULES} reschedules for this attempt.`,
        );
      }

      if (newStartAt.getTime() === old.startAt.getTime()) {
        throw new ActionError("VALIDATION", "That is your current interview time. Pick a different one.");
      }

      // 1. Free the student's one-active-booking slot FIRST…
      const cancelled = await tx
        .update(bookings)
        .set({ status: "cancelled_by_student", ended_at: now })
        .where(and(eq(bookings.id, old.id), eq(bookings.status, "active")))
        .returning({ id: bookings.id });
      if (cancelled.length === 0) throw new ActionError("INVALID_TRANSITION");

      // 2. …validate the new time as a fresh booking (window, prerequisite)…
      assertCanBook({
        ctx,
        attemptStatus: AttemptStatus.AWAITING_BOOKING,
        startAt: newStartAt,
        now,
        hasActiveBooking: false,
      });

      // 3. …then take the new slot. No slot → SLOT_TAKEN → everything rolls
      // back, so the original booking stands.
      const booking = await insertBookingOnOpenSlot(tx, {
        attemptId: ctx.attempt.id,
        studentId: actor.id,
        startAt: newStartAt,
      });

      const counted = await tx
        .update(interviewAttempts)
        .set({
          reschedule_count: sql`${interviewAttempts.reschedule_count} + 1`,
          updated_at: now,
        })
        .where(
          and(eq(interviewAttempts.id, ctx.attempt.id), eq(interviewAttempts.status, "booked")),
        )
        .returning({ id: interviewAttempts.id });
      if (counted.length === 0) throw new ActionError("INVALID_TRANSITION");

      await insertNotification(tx, {
        userId: actor.id,
        attemptId: ctx.attempt.id,
        key: MessageKey.BOOKING_RESCHEDULED,
        message: bookingRescheduledMessage({
          badgeName: badgeLabel(ctx.badge.level),
          previousStartAt: old.startAt,
          newStartAt,
          meetingUrl: booking.meetingUrl,
        }),
      });

      return { bookingId: booking.bookingId };
    });

    revalidateAffected();
    return ok(data);
  } catch (err) {
    return toFailure(err);
  }
}

// ---------------------------------------------------------------------------
// cancelBooking (T4)
// ---------------------------------------------------------------------------

const cancelSchema = z.object({ bookingId: z.guid() });

export async function cancelBooking(input: { bookingId: string }): Promise<Result<null>> {
  try {
    const actor = await requireRole(UserRole.STUDENT);
    const parsed = cancelSchema.safeParse(input);
    if (!parsed.success) return toFailure(new ActionError("VALIDATION"));

    await db.transaction(async (tx) => {
      const now = new Date();

      const peek = await findOwnActiveBooking(tx, parsed.data.bookingId, actor.id);
      const ctx = await lockAttempt(tx, peek.attemptId, actor.id);
      const booking = await findOwnActiveBooking(tx, parsed.data.bookingId, actor.id);

      if (booking.status !== "active" || ctx.attempt.status !== "booked") {
        throw new ActionError("INVALID_TRANSITION");
      }

      const allowed = canCancel({
        booking: { start_at: booking.startAt, status: booking.status },
        now,
      });
      if (!allowed.ok) throw new ActionError("CUTOFF_PASSED", cutoffMessage(booking.startAt));

      const cancelled = await tx
        .update(bookings)
        .set({ status: "cancelled_by_student", ended_at: now })
        .where(and(eq(bookings.id, booking.id), eq(bookings.status, "active")))
        .returning({ id: bookings.id });
      if (cancelled.length === 0) throw new ActionError("INVALID_TRANSITION");

      const reopened = await tx
        .update(interviewAttempts)
        .set({ status: "awaiting_booking", updated_at: now })
        .where(
          and(eq(interviewAttempts.id, ctx.attempt.id), eq(interviewAttempts.status, "booked")),
        )
        .returning({ id: interviewAttempts.id });
      if (reopened.length === 0) throw new ActionError("INVALID_TRANSITION");

      await insertNotification(tx, {
        userId: actor.id,
        attemptId: ctx.attempt.id,
        key: MessageKey.BOOKING_CANCELLED,
        message: bookingCancelledMessage({
          badgeName: badgeLabel(ctx.badge.level),
          cancelledStartAt: booking.startAt,
          attemptId: ctx.attempt.id,
        }),
      });
    });

    revalidateAffected();
    return ok(null);
  } catch (err) {
    return toFailure(err);
  }
}
