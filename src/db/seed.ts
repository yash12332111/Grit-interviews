// src/db/seed.ts
// Idempotent database seeder per architecture §8.4.
// Re-seeded on demand or when stale (> 6 hours).

import { sql } from "drizzle-orm";
import type { AppDatabase } from "./client";
import {
  users,
  tracks,
  badges,
  eligibilities,
  interviewAttempts,
  availabilitySlots,
  bookings,
  badgeAwards,
  notifications,
  demoMeta,
} from "./schema";
import {
  bookingConfirmedMessage,
  interviewerCancelledMessage,
  resultPassedMessage,
  resultFailedMessage,
  resultRetakeMessage,
  badgeNullifiedMessage,
} from "../domain/messages";

// ---------------------------------------------------------------------------
// Fixed UUID Constants
// ---------------------------------------------------------------------------
export const SEED_IDS = {
  track: "00000000-0000-0000-0000-000000000001",
  badges: {
    novice: "00000000-0000-0000-0000-000000000011",
    specialist: "00000000-0000-0000-0000-000000000012",
  },
  interviewers: {
    i1: "00000000-0000-0000-0000-000000000101",
    i2: "00000000-0000-0000-0000-000000000102",
    i3: "00000000-0000-0000-0000-000000000103",
  },
  admin: "00000000-0000-0000-0000-000000000201",
  students: {
    s1: "00000000-0000-0000-0000-000000000301",
    s2: "00000000-0000-0000-0000-000000000302",
    s3: "00000000-0000-0000-0000-000000000303",
    s4: "00000000-0000-0000-0000-000000000304",
    s5: "00000000-0000-0000-0000-000000000305",
    s6: "00000000-0000-0000-0000-000000000306",
    s7: "00000000-0000-0000-0000-000000000307",
    s8: "00000000-0000-0000-0000-000000000308",
    s9: "00000000-0000-0000-0000-000000000309",
    s10: "00000000-0000-0000-0000-000000000310",
    s11: "00000000-0000-0000-0000-000000000311",
  },
} as const;

function roundDownToSlot(date: Date): Date {
  const ms = date.getTime();
  const thirtyMinsMs = 30 * 60 * 1000;
  return new Date(Math.floor(ms / thirtyMinsMs) * thirtyMinsMs);
}

function addHours(d: Date, h: number): Date {
  return new Date(d.getTime() + h * 60 * 60 * 1000);
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

function getMeetingUrl(bookingId: string): string {
  return `https://meet.jit.si/GRIT-${bookingId.substring(0, 8)}`;
}

export async function seed(db: AppDatabase): Promise<void> {
  const now = new Date();
  const T0 = roundDownToSlot(now);

  // 1. Truncate all tables cascade
  await db.execute(sql`
    TRUNCATE TABLE 
      notifications,
      badge_awards,
      bookings,
      availability_slots,
      interview_attempts,
      eligibilities,
      badges,
      tracks,
      users,
      demo_meta
    CASCADE;
  `);

  // 2. Insert Users
  await db.insert(users).values([
    // Interviewers
    {
      id: SEED_IDS.interviewers.i1,
      name: "Priya Sharma",
      email: "priya.sharma@grit.niatindia.com",
      role: "interviewer",
    },
    {
      id: SEED_IDS.interviewers.i2,
      name: "Rahul Verma",
      email: "rahul.verma@grit.niatindia.com",
      role: "interviewer",
    },
    {
      id: SEED_IDS.interviewers.i3,
      name: "Ananya Sen",
      email: "ananya.sen@grit.niatindia.com",
      role: "interviewer",
    },
    // Admin
    {
      id: SEED_IDS.admin,
      name: "Vikram Malhotra",
      email: "vikram.admin@grit.niatindia.com",
      role: "team_admin",
    },
    // Students S1 - S11
    {
      id: SEED_IDS.students.s1,
      name: "Aarav Patel",
      email: "aarav.patel@student.grit.niatindia.com",
      role: "student",
    },
    {
      id: SEED_IDS.students.s2,
      name: "Diya Reddy",
      email: "diya.reddy@student.grit.niatindia.com",
      role: "student",
    },
    {
      id: SEED_IDS.students.s3,
      name: "Rohan Gupta",
      email: "rohan.gupta@student.grit.niatindia.com",
      role: "student",
    },
    {
      id: SEED_IDS.students.s4,
      name: "Meera Nair",
      email: "meera.nair@student.grit.niatindia.com",
      role: "student",
    },
    {
      id: SEED_IDS.students.s5,
      name: "Kabir Joshi",
      email: "kabir.joshi@student.grit.niatindia.com",
      role: "student",
    },
    {
      id: SEED_IDS.students.s6,
      name: "Tanvi Shah",
      email: "tanvi.shah@student.grit.niatindia.com",
      role: "student",
    },
    {
      id: SEED_IDS.students.s7,
      name: "Siddharth Rao",
      email: "siddharth.rao@student.grit.niatindia.com",
      role: "student",
    },
    {
      id: SEED_IDS.students.s8,
      name: "Ishaan Verma",
      email: "ishaan.verma@student.grit.niatindia.com",
      role: "student",
    },
    {
      id: SEED_IDS.students.s9,
      name: "Riya Kapoor",
      email: "riya.kapoor@student.grit.niatindia.com",
      role: "student",
    },
    {
      id: SEED_IDS.students.s10,
      name: "Aditya Kulkarni",
      email: "aditya.kulkarni@student.grit.niatindia.com",
      role: "student",
    },
    {
      id: SEED_IDS.students.s11,
      name: "Pooja Iyer",
      email: "pooja.iyer@student.grit.niatindia.com",
      role: "student",
    },
  ]);

  // 3. Track and Badges
  await db.insert(tracks).values({
    id: SEED_IDS.track,
    name: "AI Product Mastery",
  });

  await db.insert(badges).values([
    {
      id: SEED_IDS.badges.novice,
      track_id: SEED_IDS.track,
      level: "novice",
      level_rank: 1,
      bonus_miles: 150,
    },
    {
      id: SEED_IDS.badges.specialist,
      track_id: SEED_IDS.track,
      level: "specialist",
      level_rank: 2,
      bonus_miles: 250,
    },
  ]);

  // 4. Eligibilities
  const eligNoviceIds = {
    s1: "10000000-0000-0000-0000-000000000001",
    s2: "10000000-0000-0000-0000-000000000002",
    s3: "10000000-0000-0000-0000-000000000003",
    s4: "10000000-0000-0000-0000-000000000004",
    s5: "10000000-0000-0000-0000-000000000005",
    s6: "10000000-0000-0000-0000-000000000006",
    s7: "10000000-0000-0000-0000-000000000007",
    s8: "10000000-0000-0000-0000-000000000008",
    s9: "10000000-0000-0000-0000-000000000009",
    s10: "10000000-0000-0000-0000-000000000010",
    s11: "10000000-0000-0000-0000-000000000011",
  };
  const eligSpecialistS9Id = "10000000-0000-0000-0000-000000000099";

  await db.insert(eligibilities).values([
    {
      id: eligNoviceIds.s1,
      student_id: SEED_IDS.students.s1,
      badge_id: SEED_IDS.badges.novice,
      granted_at: addDays(T0, -2),
    },
    {
      id: eligNoviceIds.s2,
      student_id: SEED_IDS.students.s2,
      badge_id: SEED_IDS.badges.novice,
      granted_at: addDays(T0, -5),
    },
    {
      id: eligNoviceIds.s3,
      student_id: SEED_IDS.students.s3,
      badge_id: SEED_IDS.badges.novice,
      granted_at: addDays(T0, -4),
    },
    {
      id: eligNoviceIds.s4,
      student_id: SEED_IDS.students.s4,
      badge_id: SEED_IDS.badges.novice,
      granted_at: addDays(T0, -8),
    },
    {
      id: eligNoviceIds.s5,
      student_id: SEED_IDS.students.s5,
      badge_id: SEED_IDS.badges.novice,
      granted_at: addDays(T0, -10),
    },
    {
      id: eligNoviceIds.s6,
      student_id: SEED_IDS.students.s6,
      badge_id: SEED_IDS.badges.novice,
      granted_at: addDays(T0, -15),
    },
    {
      id: eligNoviceIds.s7,
      student_id: SEED_IDS.students.s7,
      badge_id: SEED_IDS.badges.novice,
      granted_at: addDays(T0, -6),
    },
    {
      id: eligNoviceIds.s8,
      student_id: SEED_IDS.students.s8,
      badge_id: SEED_IDS.badges.novice,
      granted_at: addDays(T0, -12),
    },
    {
      id: eligNoviceIds.s9,
      student_id: SEED_IDS.students.s9,
      badge_id: SEED_IDS.badges.novice,
      granted_at: addDays(T0, -20),
    },
    {
      id: eligSpecialistS9Id,
      student_id: SEED_IDS.students.s9,
      badge_id: SEED_IDS.badges.specialist,
      granted_at: addDays(T0, -2),
    },
    {
      id: eligNoviceIds.s10,
      student_id: SEED_IDS.students.s10,
      badge_id: SEED_IDS.badges.novice,
      granted_at: addDays(T0, -18),
    },
    {
      id: eligNoviceIds.s11,
      student_id: SEED_IDS.students.s11,
      badge_id: SEED_IDS.badges.novice,
      granted_at: addDays(T0, -14),
      revoked_at: addDays(T0, -4),
      revoke_reason: "interview_failed",
    },
  ]);

  // 5. Booked & Past Slots + Attempts + Bookings
  // Track used (interviewer_id, start_at) to avoid collision when creating open slots
  const usedSlots = new Set<string>();
  const markUsed = (interviewerId: string, d: Date) => {
    usedSlots.add(`${interviewerId}:${d.toISOString()}`);
  };

  // Attempt IDs
  const attempts = {
    s1: "20000000-0000-0000-0000-000000000001",
    s2: "20000000-0000-0000-0000-000000000002",
    s3: "20000000-0000-0000-0000-000000000003",
    s4: "20000000-0000-0000-0000-000000000004",
    s5: "20000000-0000-0000-0000-000000000005",
    s6: "20000000-0000-0000-0000-000000000006",
    s7: "20000000-0000-0000-0000-000000000007",
    s8_1: "20000000-0000-0000-0000-000000000081",
    s8_2: "20000000-0000-0000-0000-000000000082",
    s9_novice: "20000000-0000-0000-0000-000000000091",
    s9_spec: "20000000-0000-0000-0000-000000000092",
    s10: "20000000-0000-0000-0000-000000000010",
    s11: "20000000-0000-0000-0000-000000000011",
  };

  // Slot IDs for booked & past
  const slotIds = {
    s2: "30000000-0000-0000-0000-000000000002",
    s3: "30000000-0000-0000-0000-000000000003",
    s4: "30000000-0000-0000-0000-000000000004",
    s5: "30000000-0000-0000-0000-000000000005",
    s6: "30000000-0000-0000-0000-000000000006",
    s7: "30000000-0000-0000-0000-000000000007",
    s8: "30000000-0000-0000-0000-000000000008",
    s9: "30000000-0000-0000-0000-000000000009",
    s10: "30000000-0000-0000-0000-000000000010",
    s11: "30000000-0000-0000-0000-000000000011",
  };

  // Booking IDs
  const bookingIds = {
    s2: "40000000-0000-0000-0000-000000000002",
    s3: "40000000-0000-0000-0000-000000000003",
    s4: "40000000-0000-0000-0000-000000000004",
    s5: "40000000-0000-0000-0000-000000000005",
    s6: "40000000-0000-0000-0000-000000000006",
    s7: "40000000-0000-0000-0000-000000000007",
    s8: "40000000-0000-0000-0000-000000000008",
    s9: "40000000-0000-0000-0000-000000000009",
    s10: "40000000-0000-0000-0000-000000000010",
    s11: "40000000-0000-0000-0000-000000000011",
  };

  // Slot start times per §8.4:
  // S2: T0 + 3 days (e.g. 11:00 IST)
  const timeS2 = addDays(T0, 3);
  // S3: T0 + 8h (inside 12h cutoff) with I1
  const timeS3 = addHours(T0, 8);
  // S4: T0 - 1h with I1
  const timeS4 = addHours(T0, -1);
  // S5: T0 - 2h with I1
  const timeS5 = addHours(T0, -2);
  // S6: T0 - 26h with I1 (overdue)
  const timeS6 = addHours(T0, -26);
  // S7: T0 + 2 days (withdrawn slot)
  const timeS7 = addDays(T0, 2);
  // S8: T0 - 2 days (attempt 1 retake_later)
  const timeS8 = addDays(T0, -2);
  // S9: T0 - 3 days (attempt 1 passed)
  const timeS9 = addDays(T0, -3);
  // S10: T0 - 10 days (attempt 1 nullified)
  const timeS10 = addDays(T0, -10);
  // S11: T0 - 4 days (attempt 1 failed)
  const timeS11 = addDays(T0, -4);

  // Mark all used slots
  markUsed(SEED_IDS.interviewers.i2, timeS2);
  markUsed(SEED_IDS.interviewers.i1, timeS3);
  markUsed(SEED_IDS.interviewers.i1, timeS4);
  markUsed(SEED_IDS.interviewers.i1, timeS5);
  markUsed(SEED_IDS.interviewers.i1, timeS6);
  markUsed(SEED_IDS.interviewers.i3, timeS7);
  markUsed(SEED_IDS.interviewers.i2, timeS8);
  markUsed(SEED_IDS.interviewers.i1, timeS9);
  markUsed(SEED_IDS.interviewers.i2, timeS10);
  markUsed(SEED_IDS.interviewers.i3, timeS11);

  // Insert Slots
  await db.insert(availabilitySlots).values([
    {
      id: slotIds.s2,
      interviewer_id: SEED_IDS.interviewers.i2,
      start_at: timeS2,
      end_at: addHours(timeS2, 0.5),
      status: "open",
    },
    {
      id: slotIds.s3,
      interviewer_id: SEED_IDS.interviewers.i1,
      start_at: timeS3,
      end_at: addHours(timeS3, 0.5),
      status: "open",
    },
    {
      id: slotIds.s4,
      interviewer_id: SEED_IDS.interviewers.i1,
      start_at: timeS4,
      end_at: addHours(timeS4, 0.5),
      status: "open",
    },
    {
      id: slotIds.s5,
      interviewer_id: SEED_IDS.interviewers.i1,
      start_at: timeS5,
      end_at: addHours(timeS5, 0.5),
      status: "open",
    },
    {
      id: slotIds.s6,
      interviewer_id: SEED_IDS.interviewers.i1,
      start_at: timeS6,
      end_at: addHours(timeS6, 0.5),
      status: "open",
    },
    {
      id: slotIds.s7,
      interviewer_id: SEED_IDS.interviewers.i3,
      start_at: timeS7,
      end_at: addHours(timeS7, 0.5),
      status: "withdrawn", // slot withdrawn by interviewer
    },
    {
      id: slotIds.s8,
      interviewer_id: SEED_IDS.interviewers.i2,
      start_at: timeS8,
      end_at: addHours(timeS8, 0.5),
      status: "open",
    },
    {
      id: slotIds.s9,
      interviewer_id: SEED_IDS.interviewers.i1,
      start_at: timeS9,
      end_at: addHours(timeS9, 0.5),
      status: "open",
    },
    {
      id: slotIds.s10,
      interviewer_id: SEED_IDS.interviewers.i2,
      start_at: timeS10,
      end_at: addHours(timeS10, 0.5),
      status: "open",
    },
    {
      id: slotIds.s11,
      interviewer_id: SEED_IDS.interviewers.i3,
      start_at: timeS11,
      end_at: addHours(timeS11, 0.5),
      status: "open",
    },
  ]);

  // Insert Attempts
  await db.insert(interviewAttempts).values([
    // S1: READY_TO_BOOK
    {
      id: attempts.s1,
      student_id: SEED_IDS.students.s1,
      badge_id: SEED_IDS.badges.novice,
      eligibility_id: eligNoviceIds.s1,
      attempt_no: 1,
      status: "awaiting_booking",
      not_before: addDays(T0, -2),
    },
    // S2: BOOKED
    {
      id: attempts.s2,
      student_id: SEED_IDS.students.s2,
      badge_id: SEED_IDS.badges.novice,
      eligibility_id: eligNoviceIds.s2,
      attempt_no: 1,
      status: "booked",
      not_before: addDays(T0, -5),
    },
    // S3: BOOKED
    {
      id: attempts.s3,
      student_id: SEED_IDS.students.s3,
      badge_id: SEED_IDS.badges.novice,
      eligibility_id: eligNoviceIds.s3,
      attempt_no: 1,
      status: "booked",
      not_before: addDays(T0, -4),
    },
    // S4: AWAITING_RESULT
    {
      id: attempts.s4,
      student_id: SEED_IDS.students.s4,
      badge_id: SEED_IDS.badges.novice,
      eligibility_id: eligNoviceIds.s4,
      attempt_no: 1,
      status: "booked",
      not_before: addDays(T0, -8),
    },
    // S5: AWAITING_RESULT
    {
      id: attempts.s5,
      student_id: SEED_IDS.students.s5,
      badge_id: SEED_IDS.badges.novice,
      eligibility_id: eligNoviceIds.s5,
      attempt_no: 1,
      status: "booked",
      not_before: addDays(T0, -10),
    },
    // S6: AWAITING_RESULT (overdue)
    {
      id: attempts.s6,
      student_id: SEED_IDS.students.s6,
      badge_id: SEED_IDS.badges.novice,
      eligibility_id: eligNoviceIds.s6,
      attempt_no: 1,
      status: "booked",
      not_before: addDays(T0, -15),
    },
    // S7: RESCHEDULE_REQUIRED
    {
      id: attempts.s7,
      student_id: SEED_IDS.students.s7,
      badge_id: SEED_IDS.badges.novice,
      eligibility_id: eligNoviceIds.s7,
      attempt_no: 1,
      status: "reschedule_required",
      not_before: addDays(T0, -6),
    },
    // S8: Attempt 1 (retake_later) + Attempt 2 (awaiting_booking, cooldown)
    {
      id: attempts.s8_1,
      student_id: SEED_IDS.students.s8,
      badge_id: SEED_IDS.badges.novice,
      eligibility_id: eligNoviceIds.s8,
      attempt_no: 1,
      status: "retake_later",
      not_before: addDays(T0, -12),
      outcome_reason: "Needs concept revision",
      outcome_notes: "Strong basics, needs more depth on system workflows.",
      outcome_recorded_by: SEED_IDS.interviewers.i2,
      outcome_recorded_at: timeS8,
    },
    {
      id: attempts.s8_2,
      student_id: SEED_IDS.students.s8,
      badge_id: SEED_IDS.badges.novice,
      eligibility_id: eligNoviceIds.s8,
      attempt_no: 2,
      status: "awaiting_booking",
      not_before: addDays(T0, 5), // cooldown ends in 5 days
    },
    // S9: Novice (passed) + Specialist (awaiting_booking)
    {
      id: attempts.s9_novice,
      student_id: SEED_IDS.students.s9,
      badge_id: SEED_IDS.badges.novice,
      eligibility_id: eligNoviceIds.s9,
      attempt_no: 1,
      status: "passed",
      not_before: addDays(T0, -20),
      outcome_notes: "Excellent command over fundamentals.",
      outcome_recorded_by: SEED_IDS.interviewers.i1,
      outcome_recorded_at: timeS9,
    },
    {
      id: attempts.s9_spec,
      student_id: SEED_IDS.students.s9,
      badge_id: SEED_IDS.badges.specialist,
      eligibility_id: eligSpecialistS9Id,
      attempt_no: 1,
      status: "awaiting_booking",
      not_before: addDays(T0, -2),
    },
    // S10: Novice (passed, but award nullified)
    {
      id: attempts.s10,
      student_id: SEED_IDS.students.s10,
      badge_id: SEED_IDS.badges.novice,
      eligibility_id: eligNoviceIds.s10,
      attempt_no: 1,
      status: "passed",
      not_before: addDays(T0, -18),
      outcome_notes: "Completed standard evaluation.",
      outcome_recorded_by: SEED_IDS.interviewers.i2,
      outcome_recorded_at: timeS10,
    },
    // S11: Novice (failed)
    {
      id: attempts.s11,
      student_id: SEED_IDS.students.s11,
      badge_id: SEED_IDS.badges.novice,
      eligibility_id: eligNoviceIds.s11,
      attempt_no: 1,
      status: "failed",
      not_before: addDays(T0, -14),
      outcome_reason: "Skill mismatch",
      outcome_notes: "Did not meet prerequisite knowledge requirements.",
      outcome_recorded_by: SEED_IDS.interviewers.i3,
      outcome_recorded_at: timeS11,
    },
  ]);

  // Insert Bookings
  await db.insert(bookings).values([
    // S2
    {
      id: bookingIds.s2,
      attempt_id: attempts.s2,
      slot_id: slotIds.s2,
      student_id: SEED_IDS.students.s2,
      interviewer_id: SEED_IDS.interviewers.i2,
      status: "active",
      meeting_url: getMeetingUrl(bookingIds.s2),
      created_at: addDays(T0, -5),
    },
    // S3
    {
      id: bookingIds.s3,
      attempt_id: attempts.s3,
      slot_id: slotIds.s3,
      student_id: SEED_IDS.students.s3,
      interviewer_id: SEED_IDS.interviewers.i1,
      status: "active",
      meeting_url: getMeetingUrl(bookingIds.s3),
      created_at: addDays(T0, -4),
    },
    // S4
    {
      id: bookingIds.s4,
      attempt_id: attempts.s4,
      slot_id: slotIds.s4,
      student_id: SEED_IDS.students.s4,
      interviewer_id: SEED_IDS.interviewers.i1,
      status: "active",
      meeting_url: getMeetingUrl(bookingIds.s4),
      created_at: addDays(T0, -8),
    },
    // S5
    {
      id: bookingIds.s5,
      attempt_id: attempts.s5,
      slot_id: slotIds.s5,
      student_id: SEED_IDS.students.s5,
      interviewer_id: SEED_IDS.interviewers.i1,
      status: "active",
      meeting_url: getMeetingUrl(bookingIds.s5),
      created_at: addDays(T0, -10),
    },
    // S6
    {
      id: bookingIds.s6,
      attempt_id: attempts.s6,
      slot_id: slotIds.s6,
      student_id: SEED_IDS.students.s6,
      interviewer_id: SEED_IDS.interviewers.i1,
      status: "active",
      meeting_url: getMeetingUrl(bookingIds.s6),
      created_at: addDays(T0, -15),
    },
    // S7 (cancelled by interviewer)
    {
      id: bookingIds.s7,
      attempt_id: attempts.s7,
      slot_id: slotIds.s7,
      student_id: SEED_IDS.students.s7,
      interviewer_id: SEED_IDS.interviewers.i3,
      status: "cancelled_by_interviewer",
      cancel_reason: "Urgent organizational duty",
      meeting_url: getMeetingUrl(bookingIds.s7),
      created_at: addDays(T0, -6),
      ended_at: addDays(T0, -1),
    },
    // S8
    {
      id: bookingIds.s8,
      attempt_id: attempts.s8_1,
      slot_id: slotIds.s8,
      student_id: SEED_IDS.students.s8,
      interviewer_id: SEED_IDS.interviewers.i2,
      status: "completed",
      meeting_url: getMeetingUrl(bookingIds.s8),
      created_at: addDays(T0, -12),
      ended_at: timeS8,
    },
    // S9
    {
      id: bookingIds.s9,
      attempt_id: attempts.s9_novice,
      slot_id: slotIds.s9,
      student_id: SEED_IDS.students.s9,
      interviewer_id: SEED_IDS.interviewers.i1,
      status: "completed",
      meeting_url: getMeetingUrl(bookingIds.s9),
      created_at: addDays(T0, -20),
      ended_at: timeS9,
    },
    // S10
    {
      id: bookingIds.s10,
      attempt_id: attempts.s10,
      slot_id: slotIds.s10,
      student_id: SEED_IDS.students.s10,
      interviewer_id: SEED_IDS.interviewers.i2,
      status: "completed",
      meeting_url: getMeetingUrl(bookingIds.s10),
      created_at: addDays(T0, -18),
      ended_at: timeS10,
    },
    // S11
    {
      id: bookingIds.s11,
      attempt_id: attempts.s11,
      slot_id: slotIds.s11,
      student_id: SEED_IDS.students.s11,
      interviewer_id: SEED_IDS.interviewers.i3,
      status: "completed",
      meeting_url: getMeetingUrl(bookingIds.s11),
      created_at: addDays(T0, -14),
      ended_at: timeS11,
    },
  ]);

  // Insert Badge Awards
  const awardS9Id = "50000000-0000-0000-0000-000000000009";
  const awardS10Id = "50000000-0000-0000-0000-000000000010";

  await db.insert(badgeAwards).values([
    // S9: active award
    {
      id: awardS9Id,
      student_id: SEED_IDS.students.s9,
      badge_id: SEED_IDS.badges.novice,
      attempt_id: attempts.s9_novice,
      awarded_at: timeS9,
      status: "active",
    },
    // S10: nullified award
    {
      id: awardS10Id,
      student_id: SEED_IDS.students.s10,
      badge_id: SEED_IDS.badges.novice,
      attempt_id: attempts.s10,
      awarded_at: timeS10,
      status: "nullified",
      nullified_at: addDays(T0, -2),
      nullified_by: SEED_IDS.admin,
      nullification_reason: "Flagged for external assistance during code challenge",
    },
  ]);

  // 6. Generate Open Slots for Next 7 Days
  // Working hours IST: 10:00 to 13:00 and 15:00 to 18:00
  // Note: 10:00 IST is 04:30 UTC. 15:00 IST is 09:30 UTC.
  const openSlotsToInsert = [];
  const interviewersList = [
    SEED_IDS.interviewers.i1,
    SEED_IDS.interviewers.i2,
    SEED_IDS.interviewers.i3,
  ];

  // For next 7 days starting from today (in IST)
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const baseDay = addDays(T0, dayOffset);
    // Determine the calendar date in IST
    const istFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = istFormatter.formatToParts(baseDay);
    const year = parseInt(parts.find((p) => p.type === "year")!.value, 10);
    const month = parseInt(parts.find((p) => p.type === "month")!.value, 10);
    const day = parseInt(parts.find((p) => p.type === "day")!.value, 10);

    // IST working hours: [10..12] and [15..17] for :00 and :30
    const workingHours = [10, 11, 12, 15, 16, 17];
    const minutes = [0, 30];

    for (const hr of workingHours) {
      for (const min of minutes) {
        // Construct UTC date corresponding to this IST time
        // IST is UTC+5:30 -> UTC = IST - 5h30m
        const utcMs = Date.UTC(year, month - 1, day, hr, min) - (5 * 60 + 30) * 60 * 1000;
        const slotStart = new Date(utcMs);
        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

        for (const interviewerId of interviewersList) {
          const key = `${interviewerId}:${slotStart.toISOString()}`;
          if (!usedSlots.has(key)) {
            usedSlots.add(key);
            openSlotsToInsert.push({
              interviewer_id: interviewerId,
              start_at: slotStart,
              end_at: slotEnd,
              status: "open" as const,
            });
          }
        }
      }
    }
  }

  if (openSlotsToInsert.length > 0) {
    // Insert in batches of 100 to stay well under query limits
    for (let i = 0; i < openSlotsToInsert.length; i += 100) {
      await db.insert(availabilitySlots).values(openSlotsToInsert.slice(i, i + 100));
    }
  }

  // 7. Insert Notifications per §8.4
  // S2 BOOKING_CONFIRMED, S7 INTERVIEWER_CANCELLED, S8 RESULT_RETAKE, S9 RESULT_PASSED, S10 BADGE_NULLIFIED, S11 RESULT_FAILED
  const msgS2 = bookingConfirmedMessage({
    badgeName: "Novice",
    startAt: timeS2,
    interviewerName: "Rahul Verma",
    meetingUrl: getMeetingUrl(bookingIds.s2),
  });

  const msgS7 = interviewerCancelledMessage({
    badgeName: "Novice",
    reason: "Urgent organizational duty",
    attemptId: attempts.s7,
  });

  const msgS8 = resultRetakeMessage({
    badgeName: "Novice",
    reopenDate: addDays(T0, 5),
    attemptNumber: 2,
  });

  const msgS9 = resultPassedMessage({
    badgeName: "Novice",
    bonusMiles: 150,
    nextBadgeName: "Specialist",
  });

  const msgS10 = badgeNullifiedMessage({
    badgeName: "Novice",
    reason: "Flagged for external assistance during code challenge",
  });

  const msgS11 = resultFailedMessage({
    badgeName: "Novice",
    feedbackNotes: "Did not meet prerequisite knowledge requirements.",
  });

  await db.insert(notifications).values([
    {
      user_id: SEED_IDS.students.s2,
      attempt_id: attempts.s2,
      template_key: "BOOKING_CONFIRMED",
      title: msgS2.title,
      body: msgS2.body,
      cta_label: msgS2.ctaLabel,
      cta_href: msgS2.ctaHref,
      created_at: addDays(T0, -5),
    },
    {
      user_id: SEED_IDS.students.s7,
      attempt_id: attempts.s7,
      template_key: "INTERVIEWER_CANCELLED",
      title: msgS7.title,
      body: msgS7.body,
      cta_label: msgS7.ctaLabel,
      cta_href: msgS7.ctaHref,
      created_at: addDays(T0, -1),
    },
    {
      user_id: SEED_IDS.students.s8,
      attempt_id: attempts.s8_1,
      template_key: "RESULT_RETAKE",
      title: msgS8.title,
      body: msgS8.body,
      cta_label: msgS8.ctaLabel,
      cta_href: msgS8.ctaHref,
      created_at: timeS8,
    },
    {
      user_id: SEED_IDS.students.s9,
      attempt_id: attempts.s9_novice,
      template_key: "RESULT_PASSED",
      title: msgS9.title,
      body: msgS9.body,
      cta_label: msgS9.ctaLabel,
      cta_href: msgS9.ctaHref,
      created_at: timeS9,
    },
    {
      user_id: SEED_IDS.students.s10,
      attempt_id: attempts.s10,
      template_key: "BADGE_NULLIFIED",
      title: msgS10.title,
      body: msgS10.body,
      cta_label: msgS10.ctaLabel,
      cta_href: msgS10.ctaHref,
      created_at: addDays(T0, -2),
    },
    {
      user_id: SEED_IDS.students.s11,
      attempt_id: attempts.s11,
      template_key: "RESULT_FAILED",
      title: msgS11.title,
      body: msgS11.body,
      cta_label: msgS11.ctaLabel,
      cta_href: msgS11.ctaHref,
      created_at: timeS11,
    },
  ]);

  // 8. Demo Meta
  await db.insert(demoMeta).values({
    id: 1,
    seeded_at: now,
  });
}
