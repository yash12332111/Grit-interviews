"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, isNull } from "drizzle-orm";
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
import { RETAKE_COOLDOWN_DAYS } from "@/domain/config";
import {
  badgeLabel,
  resultFailedMessage,
  resultPassedMessage,
  resultRetakeMessage,
  type MessageOutput,
} from "@/domain/messages";
import { canRecordOutcome } from "@/domain/rules";
import { MessageKey, Outcome, UserRole } from "@/domain/states";
import { ActionError, ok, toFailure, type Result } from "@/lib/result";
import { requireRole } from "@/lib/session";
import { formatDateTime } from "@/lib/time";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOTES_MAX = 1000;

const recordOutcomeSchema = z.object({
  bookingId: z.guid(),
  outcome: z.enum([Outcome.PASS, Outcome.FAIL, Outcome.RETAKE_LATER]),
  // The only reason the UI sends: the student never joined (A-11).
  reason: z.literal("no_show").optional(),
  notes: z.string().trim().max(NOTES_MAX, `Keep the notes under ${NOTES_MAX} characters.`).optional(),
});

function revalidateAffected() {
  revalidatePath("/interviewer/schedule");
  revalidatePath("/student");
  revalidatePath("/student/badges");
  revalidatePath("/team");
}

/**
 * Records the interview result for one of the acting interviewer's own
 * bookings (F2; T8–T10) and applies exactly the §6.3 side effects in one
 * transaction. A second submit finds the booking no longer active and gets
 * INVALID_TRANSITION.
 */
export async function recordOutcome(input: {
  bookingId: string;
  outcome: "pass" | "fail" | "retake_later";
  reason?: "no_show";
  notes?: string;
}): Promise<Result<{ outcome: "pass" | "fail" | "retake_later"; studentName: string }>> {
  try {
    const actor = await requireRole(UserRole.INTERVIEWER);

    const parsed = recordOutcomeSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = String(issue?.path[0] ?? "");
      return toFailure(
        new ActionError("VALIDATION", issue?.message ?? "Check the details and try again.", {
          [field || "form"]: issue?.message ?? "Invalid value.",
        }),
      );
    }
    const { bookingId, outcome } = parsed.data;
    const noShow = parsed.data.reason === "no_show";
    if (noShow && outcome !== Outcome.RETAKE_LATER) {
      throw new ActionError("VALIDATION", "A no-show can only be recorded as Retake later.");
    }
    const notes = parsed.data.notes || null;

    const data = await db.transaction(async (tx) => {
      const now = new Date();

      // Find the attempt, lock it, then read the booking under the lock. A
      // concurrent duplicate submit waits here and then sees the new status.
      const [peek] = await tx
        .select({ attemptId: bookings.attempt_id })
        .from(bookings)
        .where(eq(bookings.id, bookingId));
      if (!peek) throw new ActionError("NOT_FOUND");

      const [attempt] = await tx
        .select()
        .from(interviewAttempts)
        .where(eq(interviewAttempts.id, peek.attemptId))
        .for("update");
      if (!attempt) throw new ActionError("NOT_FOUND");

      const [booking] = await tx
        .select({
          id: bookings.id,
          status: bookings.status,
          interviewerId: bookings.interviewer_id,
          studentId: bookings.student_id,
          startAt: availabilitySlots.start_at,
        })
        .from(bookings)
        .innerJoin(availabilitySlots, eq(availabilitySlots.id, bookings.slot_id))
        .where(eq(bookings.id, bookingId));
      if (!booking) throw new ActionError("NOT_FOUND");

      const allowed = canRecordOutcome({
        booking: { start_at: booking.startAt, status: booking.status },
        now,
        actorId: actor.id,
        interviewerId: booking.interviewerId,
      });
      if (!allowed.ok) {
        if (allowed.code === "FORBIDDEN") throw new ActionError("FORBIDDEN");
        if (allowed.code === "SLOT_NOT_STARTED") {
          throw new ActionError(
            "INVALID_TRANSITION",
            `This interview hasn't started yet. You can record the outcome from ${formatDateTime(booking.startAt)}.`,
          );
        }
        throw new ActionError("INVALID_TRANSITION"); // already recorded
      }

      const [badge] = await tx.select().from(badges).where(eq(badges.id, attempt.badge_id));
      const [student] = await tx
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, booking.studentId));
      const badgeName = badgeLabel(badge.level);

      const attemptStatus =
        outcome === Outcome.PASS ? "passed" : outcome === Outcome.FAIL ? "failed" : "retake_later";

      // The booking closes in every case.
      const closed = await tx
        .update(bookings)
        .set({ status: noShow ? "no_show_student" : "completed", ended_at: now })
        .where(and(eq(bookings.id, booking.id), eq(bookings.status, "active")))
        .returning({ id: bookings.id });
      if (closed.length === 0) throw new ActionError("INVALID_TRANSITION");

      // Conditional update: the attempt must still be `booked`.
      const recorded = await tx
        .update(interviewAttempts)
        .set({
          status: attemptStatus,
          outcome_reason: noShow ? "no_show" : null,
          outcome_notes: notes,
          outcome_recorded_by: actor.id,
          outcome_recorded_at: now,
          updated_at: now,
        })
        .where(and(eq(interviewAttempts.id, attempt.id), eq(interviewAttempts.status, "booked")))
        .returning({ id: interviewAttempts.id });
      if (recorded.length === 0) throw new ActionError("INVALID_TRANSITION");

      let message: MessageOutput;
      let templateKey: MessageKey;

      if (outcome === Outcome.PASS) {
        // Award the badge (a duplicate active award is refused by the unique index).
        await tx.insert(badgeAwards).values({
          student_id: booking.studentId,
          badge_id: attempt.badge_id,
          attempt_id: attempt.id,
          status: "active",
        });
        const trackBadges = await tx
          .select()
          .from(badges)
          .where(eq(badges.track_id, badge.track_id))
          .orderBy(asc(badges.level_rank));
        const next = trackBadges.find((b) => b.level_rank > badge.level_rank);
        templateKey = MessageKey.RESULT_PASSED;
        message = resultPassedMessage({
          badgeName,
          bonusMiles: badge.bonus_miles,
          nextBadgeName: next ? badgeLabel(next.level) : undefined,
        });
      } else if (outcome === Outcome.FAIL) {
        // Eligibility is revoked; the student re-qualifies upstream (A-10).
        const revoked = await tx
          .update(eligibilities)
          .set({ revoked_at: now, revoke_reason: "interview_failed" })
          .where(and(eq(eligibilities.id, attempt.eligibility_id), isNull(eligibilities.revoked_at)))
          .returning({ id: eligibilities.id });
        if (revoked.length === 0) throw new ActionError("INVALID_TRANSITION");
        templateKey = MessageKey.RESULT_FAILED;
        message = resultFailedMessage({ badgeName, feedbackNotes: notes ?? undefined });
      } else {
        // Retake later: a fresh attempt opens after the cooldown (A-09).
        const reopenAt = new Date(now.getTime() + RETAKE_COOLDOWN_DAYS * DAY_MS);
        const nextNo = attempt.attempt_no + 1;
        await tx.insert(interviewAttempts).values({
          student_id: booking.studentId,
          badge_id: attempt.badge_id,
          eligibility_id: attempt.eligibility_id,
          attempt_no: nextNo,
          status: "awaiting_booking",
          not_before: reopenAt,
        });
        templateKey = MessageKey.RESULT_RETAKE;
        message = resultRetakeMessage({ badgeName, reopenDate: reopenAt, attemptNumber: nextNo });
      }

      await tx.insert(notifications).values({
        user_id: booking.studentId,
        attempt_id: attempt.id,
        template_key: templateKey,
        title: message.title,
        body: message.body,
        cta_label: message.ctaLabel ?? null,
        cta_href: message.ctaHref ?? null,
      });

      return { outcome, studentName: student?.name ?? "The student" };
    });

    revalidateAffected();
    return ok(data);
  } catch (err) {
    // A duplicate award / attempt (unique violation) is mapped to
    // INVALID_TRANSITION by toFailure: it was already recorded.
    return toFailure(err);
  }
}
