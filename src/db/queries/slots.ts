// src/db/queries/slots.ts
// Read-only: the pooled open times students can book (architecture A-04, A-06).

import { connection } from "next/server";
import { withReadRetry } from "@/db/read";
import { and, asc, eq, gte, lte, notExists, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { availabilitySlots, bookings } from "@/db/schema";
import { BOOK_MAX_DAYS, BOOK_MIN_LEAD_HOURS } from "@/domain/config";
import { formatDate, formatTime, istDayKey } from "@/lib/time";

export type OpenTimesDay = {
  /** "YYYY-MM-DD" in IST. */
  key: string;
  label: string;
  times: { iso: string; label: string }[];
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Distinct open start times inside the booking window, grouped by IST date.
 * A time is open when at least one non-withdrawn slot starts then and has no
 * active booking, however many interviewers offer it.
 */
async function getOpenTimesOnce(): Promise<OpenTimesDay[]> {
  await connection();
  const now = Date.now();
  const from = new Date(now + BOOK_MIN_LEAD_HOURS * HOUR_MS);
  const to = new Date(now + BOOK_MAX_DAYS * DAY_MS);

  const rows = await db
    .selectDistinct({ startAt: availabilitySlots.start_at })
    .from(availabilitySlots)
    .where(
      and(
        eq(availabilitySlots.status, "open"),
        gte(availabilitySlots.start_at, from),
        lte(availabilitySlots.start_at, to),
        notExists(
          db
            .select({ one: sql`1` })
            .from(bookings)
            .where(and(eq(bookings.slot_id, availabilitySlots.id), eq(bookings.status, "active"))),
        ),
      ),
    )
    .orderBy(asc(availabilitySlots.start_at));

  const days: OpenTimesDay[] = [];
  for (const { startAt } of rows) {
    const key = istDayKey(startAt);
    let day = days[days.length - 1];
    if (!day || day.key !== key) {
      day = { key, label: formatDate(startAt), times: [] };
      days.push(day);
    }
    day.times.push({ iso: startAt.toISOString(), label: formatTime(startAt) });
  }
  return days;
}

// Reads retry once on a connection error (see src/db/read.ts).
export const getOpenTimes = withReadRetry(getOpenTimesOnce);
