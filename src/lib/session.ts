// src/lib/session.ts
// Demo-grade persona session (assumption A-14): a plain cookie holds the
// chosen user id. There is no real authentication.

import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { withReadRetry } from "@/db/read";
import { users } from "@/db/schema";
import { ActionError } from "@/lib/result";
import type { UserRole } from "@/domain/states";

export const PERSONA_COOKIE = "grit_persona";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export type Actor = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

const uuidSchema = z.guid();

/** The persona lookup is a read, so it retries once on a connection error. */
const findUser = withReadRetry(async (id: string) => {
  // Keep the lookup out of any prerender (including prefetch renders, where
  // cookies() can resolve): opening a database connection there is aborted.
  await connection();
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return row ?? null;
});

/** Where each role lands after picking a persona. */
export const ROLE_HOME: Record<UserRole, string> = {
  student: "/student",
  interviewer: "/interviewer/schedule",
  team_admin: "/team",
};

/** Plural role names for user-facing copy. */
const ROLE_LABEL: Record<UserRole, string> = {
  student: "students",
  interviewer: "interviewers",
  team_admin: "the interview team",
};
export function roleLabel(role: UserRole): string {
  return ROLE_LABEL[role];
}

export async function setPersonaCookie(userId: string): Promise<void> {
  const store = await cookies();
  store.set(PERSONA_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}

/**
 * Cookies can only be written in Server Actions / Route Handlers. During a
 * plain render this throws, which we deliberately ignore: the stale cookie is
 * simply treated as "no persona" and replaced on the next selectPersona.
 */
export async function clearPersonaCookie(): Promise<void> {
  try {
    const store = await cookies();
    store.delete(PERSONA_COOKIE);
  } catch {
    /* render context: read-only cookies */
  }
}

/**
 * The current persona, or null when there is no cookie or it points to a user
 * that no longer exists (e.g. after a manual DB wipe). Seeded users have fixed
 * UUIDs, so cookies survive demo resets.
 */
export async function getActor(): Promise<Actor | null> {
  const store = await cookies();
  const raw = store.get(PERSONA_COOKIE)?.value;
  if (!raw || !uuidSchema.safeParse(raw).success) return null;

  const row = await findUser(raw);

  if (!row) {
    await clearPersonaCookie();
    return null;
  }
  return row as Actor;
}

/**
 * For Server Actions: returns the actor if they hold `role`, otherwise throws
 * an ActionError("FORBIDDEN") that the action converts with `toFailure`.
 */
export async function requireRole(role: UserRole): Promise<Actor> {
  const actor = await getActor();
  if (!actor || actor.role !== role) throw new ActionError("FORBIDDEN");
  return actor;
}

/**
 * For role-guarded layouts: redirects to `/` (with a notice that the landing
 * page turns into a toast) when the persona is missing or has the wrong role.
 */
export async function guardRole(role: UserRole): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/?notice=pick-persona");
  if (actor.role !== role) redirect("/?notice=wrong-role");
  return actor;
}
