"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { fail, toFailure, type Result } from "@/lib/result";
import { ROLE_HOME, setPersonaCookie } from "@/lib/session";
import type { UserRole } from "@/domain/states";

const selectPersonaSchema = z.object({ userId: z.guid() });

/**
 * Picks a demo persona (no real login, assumption A-14) and lands on that
 * role's home. Returns a Failure only when the persona can't be found;
 * on success it redirects.
 */
export async function selectPersona(userId: string): Promise<Result<never>> {
  let destination: string;
  try {
    const parsed = selectPersonaSchema.safeParse({ userId });
    if (!parsed.success) return fail("VALIDATION");

    const [user] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, parsed.data.userId))
      .limit(1);
    if (!user) return fail("NOT_FOUND");

    await setPersonaCookie(user.id);
    destination = ROLE_HOME[user.role as UserRole];
  } catch (err) {
    return toFailure(err);
  }
  // redirect() works by throwing, so it must stay outside the try/catch.
  redirect(destination);
}
