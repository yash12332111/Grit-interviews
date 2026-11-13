// src/db/queries/personas.ts
// Read-only: personas grouped by role, with a LIVE journey-state hint for each
// student (derived with deriveJourneyState, never stored).

import { connection } from "next/server";
import { withReadRetry } from "@/db/read";
import { eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users,
  badges,
  eligibilities,
  interviewAttempts,
  bookings,
  badgeAwards,
  availabilitySlots,
} from "@/db/schema";
import { deriveJourneyState } from "@/domain/derive";
import type { DeriveJourneyInput } from "@/domain/derive";
import {
  AttemptStatus,
  AwardStatus,
  BookingStatus,
  JOURNEY_STATE_LABEL,
  JourneyState,
} from "@/domain/states";
import type { UserRole } from "@/domain/states";

export type PersonaGroups = {
  students: Persona[];
  interviewers: Persona[];
  teamAdmins: Persona[];
};

export type Persona = {
  id: string;
  name: string;
  role: UserRole;
  /** Live state hint, e.g. "Ready to book · Novice". Students only. */
  hint: string | null;
  /** Journey state behind the hint, for styling. Students only. */
  hintState: JourneyState | null;
};


/**
 * When a student has several journeys, show the most actionable one first.
 * Lower index = more relevant.
 */
const RELEVANCE: JourneyState[] = [
  JourneyState.AWAITING_RESULT,
  JourneyState.RESCHEDULE_REQUIRED,
  JourneyState.BOOKED,
  JourneyState.READY_TO_BOOK,
  JourneyState.RETAKE_COOLDOWN,
  JourneyState.BADGE_NULLIFIED,
  JourneyState.PASSED,
  JourneyState.FAILED,
  JourneyState.NOT_ELIGIBLE,
];

function titleCase(level: string): string {
  return level
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function listPersonasOnce(): Promise<PersonaGroups> {
  // The Neon driver isn't visible to Next's prerenderer, so opt out explicitly.
  await connection();
  const [
    userRows,
    badgeRows,
    activeEligibilities,
    attemptRows,
    activeBookings,
    awardRows,
  ] = await Promise.all([
    db.select().from(users).orderBy(users.name),
    db.select().from(badges).orderBy(badges.level_rank),
    db.select().from(eligibilities).where(isNull(eligibilities.revoked_at)),
    db.select().from(interviewAttempts),
    db
      .select({
        attempt_id: bookings.attempt_id,
        status: bookings.status,
        start_at: availabilitySlots.start_at,
      })
      .from(bookings)
      .innerJoin(availabilitySlots, eq(bookings.slot_id, availabilitySlots.id))
      .where(eq(bookings.status, BookingStatus.ACTIVE)),
    db.select().from(badgeAwards),
  ]);

  // Read the clock only after the first awaited query (Cache Components rule).
  const now = new Date();

  const OPEN: string[] = [
    AttemptStatus.AWAITING_BOOKING,
    AttemptStatus.BOOKED,
    AttemptStatus.RESCHEDULE_REQUIRED,
  ];

  const hintFor = (studentId: string): Pick<Persona, "hint" | "hintState"> => {
    const badgeIds = new Set<string>();
    for (const e of activeEligibilities) if (e.student_id === studentId) badgeIds.add(e.badge_id);
    for (const a of attemptRows) if (a.student_id === studentId) badgeIds.add(a.badge_id);
    for (const w of awardRows) if (w.student_id === studentId) badgeIds.add(w.badge_id);

    const journeys: { badgeId: string; state: JourneyState }[] = [];
    for (const badgeId of badgeIds) {
      const attempts = attemptRows
        .filter((a) => a.student_id === studentId && a.badge_id === badgeId)
        .sort((a, b) => b.attempt_no - a.attempt_no);
      const open = attempts.find((a) => OPEN.includes(a.status)) ?? null;
      const booking = open
        ? (activeBookings.find((b) => b.attempt_id === open.id) ?? null)
        : null;

      const input: DeriveJourneyInput = {
        awards: awardRows
          .filter((w) => w.student_id === studentId && w.badge_id === badgeId)
          .map((w) => ({ status: w.status as AwardStatus, badge_id: w.badge_id })),
        openAttempt: open
          ? { status: open.status as AttemptStatus, not_before: open.not_before }
          : null,
        activeBooking: booking
          ? { start_at: booking.start_at, status: booking.status }
          : null,
        latestAttempt: attempts[0]
          ? { status: attempts[0].status as AttemptStatus, not_before: attempts[0].not_before }
          : null,
      };
      journeys.push({ badgeId, state: deriveJourneyState(input, now) });
    }

    // A student with no eligibility, attempt or award is NOT_ELIGIBLE for the first badge.
    if (journeys.length === 0) {
      const first = badgeRows[0];
      return {
        hint: first
          ? `${JOURNEY_STATE_LABEL[JourneyState.NOT_ELIGIBLE]} · ${titleCase(first.level)}`
          : null,
        hintState: JourneyState.NOT_ELIGIBLE,
      };
    }

    journeys.sort((a, b) => RELEVANCE.indexOf(a.state) - RELEVANCE.indexOf(b.state));
    const top = journeys[0];
    const badge = badgeRows.find((b) => b.id === top.badgeId);
    return {
      hint: `${JOURNEY_STATE_LABEL[top.state]}${badge ? ` · ${titleCase(badge.level)}` : ""}`,
      hintState: top.state,
    };
  };

  const toPersona = (u: (typeof userRows)[number]): Persona => ({
    id: u.id,
    name: u.name,
    role: u.role as UserRole,
    ...(u.role === "student" ? hintFor(u.id) : { hint: null, hintState: null }),
  });

  // Seeded IDs sort S1..S11 / I1..I3 by their fixed UUID suffix; alphabetical
  // by name would shuffle the persona order, so order by id for a stable list.
  const byId = (a: Persona, b: Persona) => a.id.localeCompare(b.id);
  const all = userRows.map(toPersona);
  return {
    students: all.filter((p) => p.role === "student").sort(byId),
    interviewers: all.filter((p) => p.role === "interviewer").sort(byId),
    teamAdmins: all.filter((p) => p.role === "team_admin").sort(byId),
  };
}

// Reads retry once on a connection error (see src/db/read.ts).
export const listPersonas = withReadRetry(listPersonasOnce);
