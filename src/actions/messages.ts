"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { notifications } from "@/db/schema";
import { UserRole } from "@/domain/states";
import { ActionError, fail, ok, toFailure, type Result } from "@/lib/result";
import { requireRole } from "@/lib/session";

const dismissSchema = z.object({ notificationId: z.guid() });

/** Marks the student's own notification as read so the home banner stops showing it. */
export async function dismissMessage(input: { notificationId: string }): Promise<Result<null>> {
  try {
    const actor = await requireRole(UserRole.STUDENT);
    const parsed = dismissSchema.safeParse(input);
    if (!parsed.success) return fail("VALIDATION");

    await db.transaction(async (tx) => {
      const updated = await tx
        .update(notifications)
        .set({ read_at: new Date() })
        .where(
          and(
            eq(notifications.id, parsed.data.notificationId),
            eq(notifications.user_id, actor.id),
            isNull(notifications.read_at),
          ),
        )
        .returning({ id: notifications.id });
      if (updated.length > 0) return;

      // Already dismissed (double-click) is fine; someone else's or missing is not.
      const [existing] = await tx
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.id, parsed.data.notificationId),
            eq(notifications.user_id, actor.id),
          ),
        );
      if (!existing) throw new ActionError("NOT_FOUND");
    });

    revalidatePath("/student");
    return ok(null);
  } catch (err) {
    return toFailure(err);
  }
}
