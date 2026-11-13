"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import {
  availabilitySlots,
  badges,
  bookings,
  interviewAttempts,
  notifications,
  users,
} from "@/db/schema";
import { SLOT_MINUTES } from "@/domain/config";
import { interviewerCancelledMessage } from "@/domain/messages";
import { canWithdraw } from "@/domain/rules";
import { MessageKey, UserRole } from "@/domain/states";
import { ActionError, fail, ok, toFailure, type Result } from "@/lib/result";
import { requireRole } from "@/lib/session";
import { istInstant } from "@/lib/time";

const MINUTES_PER_DAY = 24 * 60;

function revalidateAffected() {
  revalidatePath("/interviewer/availability");
  revalidatePath("/interviewer/schedule");
  revalidatePath("/student");
  revalidatePath("/team");
}

// ---------------------------------------------------------------------------
// addSlots
// ---------------------------------------------------------------------------

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/;

const addSlotsSchema = z.object({
  date: z.string().regex(DATE_RE, "Pick a date."),
  from: z.string().regex(TIME_RE, "Enter a start time."),
  to: z.string().regex(TIME_RE, "Enter an end time."),
});

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Creates aligned 30-minute slots across [from, to) on one IST day for the
 * acting interviewer, skipping any start time they already have.
 */
export async function addSlots(input: {
  date: string;
  from: string;
  to: string;
}): Promise<Result<{ created: number; skipped: number }>> {
  try {
    const actor = await requireRole(UserRole.INTERVIEWER);

    const parsed = addSlotsSchema.safeParse(input);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        fields[key] ??= issue.message;
      }
      return fail("VALIDATION", "Please fix the highlighted fields.", fields);
    }

    const { date, from, to } = parsed.data;
    const fromMin = toMinutes(from);
    const toMin = toMinutes(to);
    const fields: Record<string, string> = {};

    if (fromMin % SLOT_MINUTES !== 0) {
      fields.from = `Start time must be on the hour or half hour (every ${SLOT_MINUTES} minutes).`;
    }
    if (toMin % SLOT_MINUTES !== 0) {
      fields.to = `End time must be on the hour or half hour (every ${SLOT_MINUTES} minutes).`;
    }
    if (!fields.from && !fields.to && fromMin >= toMin) {
      fields.to = "End time must be after the start time.";
    }

    const rangeStart = istInstant(date, fromMin);
    if (!rangeStart) {
      fields.date = "That isn't a valid date.";
    } else if (!fields.from && rangeStart.getTime() <= Date.now()) {
      fields.date = "That time has already passed. Pick a date and start time in the future.";
    }

    if (Object.keys(fields).length > 0) {
      return fail("VALIDATION", "Please fix the highlighted fields.", fields);
    }

    // Generate every aligned slot start in [from, to).
    const slotMs = SLOT_MINUTES * 60_000;
    const rows: { interviewer_id: string; start_at: Date; end_at: Date }[] = [];
    for (let m = fromMin; m < toMin && m < MINUTES_PER_DAY; m += SLOT_MINUTES) {
      const start = istInstant(date, m)!;
      rows.push({
        interviewer_id: actor.id,
        start_at: start,
        end_at: new Date(start.getTime() + slotMs),
      });
    }

    const created = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(availabilitySlots)
        .values(rows)
        .onConflictDoNothing({
          target: [availabilitySlots.interviewer_id, availabilitySlots.start_at],
        })
        .returning({ id: availabilitySlots.id });
      return inserted.length;
    });

    revalidateAffected();
    return ok({ created, skipped: rows.length - created });
  } catch (err) {
    return toFailure(err);
  }
}

// ---------------------------------------------------------------------------
// withdrawSlot (architecture F5, transition T5)
// ---------------------------------------------------------------------------

const withdrawSlotSchema = z.object({
  slotId: z.guid(),
  reason: z.string().trim().max(500, "Keep the reason under 500 characters.").optional(),
});

function titleCase(level: string): string {
  return level
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Withdraws one of the interviewer's own slots. The slot ALWAYS becomes
 * `withdrawn`. If a student had it booked, the same transaction also cancels
 * that booking, moves their attempt to `reschedule_required` and sends
 * INTERVIEWER_CANCELLED. A reason is required in that case.
 */
export async function withdrawSlot(input: {
  slotId: string;
  reason?: string;
}): Promise<Result<{ hadBooking: boolean; studentName: string | null }>> {
  try {
    const actor = await requireRole(UserRole.INTERVIEWER);

    const parsed = withdrawSlotSchema.safeParse(input);
    if (!parsed.success) {
      return fail("VALIDATION", undefined, {
        reason: parsed.error.issues[0]?.message ?? "Check the reason.",
      });
    }
    const { slotId } = parsed.data;
    const reason = parsed.data.reason || undefined;

    const data = await db.transaction(async (tx) => {
      const now = new Date();

      // Lock the slot so a concurrent booking or withdrawal waits for us.
      const [slot] = await tx
        .select()
        .from(availabilitySlots)
        .where(eq(availabilitySlots.id, slotId))
        .for("update");
      if (!slot) throw new ActionError("NOT_FOUND");

      const check = canWithdraw({
        slot: { start_at: slot.start_at, status: slot.status },
        now,
        actorId: actor.id,
        interviewerId: slot.interviewer_id,
      });
      if (!check.ok) {
        throw new ActionError(
          check.code,
          check.code === "SLOT_STARTED"
            ? "That slot has already started, so it can't be withdrawn."
            : undefined,
        );
      }

      // Double-click / second tab: already withdrawn is a no-op success.
      if (slot.status === "withdrawn") {
        return { hadBooking: false, studentName: null };
      }

      const [booking] = await tx
        .select({
          id: bookings.id,
          attemptId: bookings.attempt_id,
          studentId: bookings.student_id,
        })
        .from(bookings)
        .where(and(eq(bookings.slot_id, slotId), eq(bookings.status, "active")))
        .for("update");

      let studentName: string | null = null;

      if (booking) {
        if (!reason) {
          throw new ActionError(
            "VALIDATION",
            "Please add a reason so the student knows why their interview is moving.",
            { reason: "A reason is required when a student has booked this slot." },
          );
        }

        // T5: booking → cancelled_by_interviewer (conditional).
        const cancelled = await tx
          .update(bookings)
          .set({ status: "cancelled_by_interviewer", cancel_reason: reason, ended_at: now })
          .where(and(eq(bookings.id, booking.id), eq(bookings.status, "active")))
          .returning({ id: bookings.id });
        if (cancelled.length === 0) throw new ActionError("INVALID_TRANSITION");

        // T5: attempt → reschedule_required (conditional).
        const moved = await tx
          .update(interviewAttempts)
          .set({ status: "reschedule_required", updated_at: now })
          .where(
            and(
              eq(interviewAttempts.id, booking.attemptId),
              eq(interviewAttempts.status, "booked"),
            ),
          )
          .returning({ badgeId: interviewAttempts.badge_id });
        if (moved.length === 0) throw new ActionError("INVALID_TRANSITION");

        const [badge] = await tx
          .select({ level: badges.level })
          .from(badges)
          .where(eq(badges.id, moved[0].badgeId));
        const [student] = await tx
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, booking.studentId));
        studentName = student?.name ?? null;

        const msg = interviewerCancelledMessage({
          badgeName: badge ? titleCase(badge.level) : "your",
          reason,
          attemptId: booking.attemptId,
        });
        await tx.insert(notifications).values({
          user_id: booking.studentId,
          attempt_id: booking.attemptId,
          template_key: MessageKey.INTERVIEWER_CANCELLED,
          title: msg.title,
          body: msg.body,
          cta_label: msg.ctaLabel ?? null,
          cta_href: msg.ctaHref ?? null,
        });
      }

      // Every withdrawal retires the slot, so it never reappears for students.
      const withdrawn = await tx
        .update(availabilitySlots)
        .set({ status: "withdrawn" })
        .where(and(eq(availabilitySlots.id, slotId), eq(availabilitySlots.status, "open")))
        .returning({ id: availabilitySlots.id });
      if (withdrawn.length === 0) throw new ActionError("INVALID_TRANSITION");

      return { hadBooking: Boolean(booking), studentName };
    });

    revalidateAffected();
    return ok(data);
  } catch (err) {
    return toFailure(err);
  }
}
