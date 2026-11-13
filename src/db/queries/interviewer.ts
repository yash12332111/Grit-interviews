// src/db/queries/interviewer.ts
// Read-only queries for the interviewer area.

import { connection } from "next/server";
import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { availabilitySlots, bookings, users } from "@/db/schema";
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
