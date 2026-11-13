"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import {
  badgeAwards,
  badges,
  bookings,
  eligibilities,
  interviewAttempts,
  notifications,
} from "@/db/schema";
import { badgeLabel, badgeNullifiedMessage } from "@/domain/messages";
import { canFlag, higherBadgesToLock } from "@/domain/rules";
import type { BadgeRecord } from "@/domain/rules";
import { AwardStatus, BadgeLevel, MessageKey, UserRole } from "@/domain/states";
import { ActionError, ok, toFailure, type Result } from "@/lib/result";
import { requireRole } from "@/lib/session";

const REASON_MAX = 500;

const flagSchema = z.object({
  badgeAwardId: z.guid(),
  reason: z
    .string()
    .trim()
    .min(1, "Please give a reason for nullifying this badge.")
    .max(REASON_MAX, `Keep the reason under ${REASON_MAX} characters.`),
});

/**
 * Nullifies a passed badge after malpractice is flagged (F3; T13) and cascades
 * to every higher badge in the same track (T15) in the same transaction:
 * eligibility revoked, open attempt withdrawn, active booking cancelled by the
 * system. The student is notified.
 */
export async function flagMalpractice(input: {
  badgeAwardId: string;
  reason: string;
}): Promise<Result<{ lockedBadges: number }>> {
  try {
    const actor = await requireRole(UserRole.TEAM_ADMIN);

    const parsed = flagSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = String(issue?.path[0] ?? "form");
      return toFailure(
        new ActionError("VALIDATION", issue?.message ?? "Check the details and try again.", {
          [field === "badgeAwardId" ? "form" : field]: issue?.message ?? "Invalid value.",
        }),
      );
    }
    const { badgeAwardId, reason } = parsed.data;

    const data = await db.transaction(async (tx) => {
      const now = new Date();

      const [award] = await tx
        .select()
        .from(badgeAwards)
        .where(eq(badgeAwards.id, badgeAwardId))
        .for("update");
      if (!award) throw new ActionError("NOT_FOUND");

      const flag = canFlag({ awardStatus: award.status as AwardStatus });
      if (!flag.ok) throw new ActionError("INVALID_TRANSITION");

      // T13: conditional update, so a concurrent flag can't nullify twice.
      const nullified = await tx
        .update(badgeAwards)
        .set({
          status: "nullified",
          nullified_at: now,
          nullified_by: actor.id,
          nullification_reason: reason,
        })
        .where(and(eq(badgeAwards.id, award.id), eq(badgeAwards.status, "active")))
        .returning({ id: badgeAwards.id });
      if (nullified.length === 0) throw new ActionError("INVALID_TRANSITION");

      // T15: lock every higher badge in the same track.
      const [awardedBadge] = await tx.select().from(badges).where(eq(badges.id, award.badge_id));
      if (!awardedBadge) throw new ActionError("NOT_FOUND");
      const trackRows = await tx
        .select()
        .from(badges)
        .where(eq(badges.track_id, awardedBadge.track_id))
        .orderBy(asc(badges.level_rank));
      const toRecord = (b: (typeof trackRows)[number]): BadgeRecord => ({
        id: b.id,
        level: b.level as BadgeLevel,
        level_rank: b.level_rank,
        track_id: b.track_id,
      });
      const nullifiedBadge = awardedBadge;
      const higher = higherBadgesToLock(toRecord(nullifiedBadge), trackRows.map(toRecord));

      for (const h of higher) {
        await tx
          .update(eligibilities)
          .set({ revoked_at: now, revoke_reason: "prerequisite_nullified" })
          .where(
            and(
              eq(eligibilities.student_id, award.student_id),
              eq(eligibilities.badge_id, h.id),
              isNull(eligibilities.revoked_at),
            ),
          );

        const openAttempts = await tx
          .update(interviewAttempts)
          .set({ status: "withdrawn", updated_at: now })
          .where(
            and(
              eq(interviewAttempts.student_id, award.student_id),
              eq(interviewAttempts.badge_id, h.id),
              inArray(interviewAttempts.status, [
                "awaiting_booking",
                "booked",
                "reschedule_required",
              ]),
            ),
          )
          .returning({ id: interviewAttempts.id });

        if (openAttempts.length > 0) {
          await tx
            .update(bookings)
            .set({ status: "cancelled_by_system", ended_at: now })
            .where(
              and(
                inArray(
                  bookings.attempt_id,
                  openAttempts.map((a) => a.id),
                ),
                eq(bookings.status, "active"),
              ),
            );
        }
      }

      const message = badgeNullifiedMessage({
        badgeName: badgeLabel(nullifiedBadge.level),
        reason,
      });
      await tx.insert(notifications).values({
        user_id: award.student_id,
        attempt_id: award.attempt_id,
        template_key: MessageKey.BADGE_NULLIFIED,
        title: message.title,
        body: message.body,
        cta_label: message.ctaLabel ?? null,
        cta_href: message.ctaHref ?? null,
      });

      return { lockedBadges: higher.length };
    });

    revalidatePath("/team");
    revalidatePath("/student");
    revalidatePath("/student/badges");
    return ok(data);
  } catch (err) {
    return toFailure(err);
  }
}
