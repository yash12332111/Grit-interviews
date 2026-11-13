import {
  pgTable,
  uuid,
  text,
  timestamp,
  smallint,
  pgEnum,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const userRoleEnum = pgEnum("user_role", [
  "student",
  "interviewer",
  "team_admin",
]);

export const badgeLevelEnum = pgEnum("badge_level", [
  "novice",
  "specialist",
  "expert",
  "master",
  "grand_master",
]);

export const attemptStatusEnum = pgEnum("attempt_status", [
  "awaiting_booking",
  "booked",
  "reschedule_required",
  "passed",
  "failed",
  "retake_later",
  "withdrawn",
]);

export const slotStatusEnum = pgEnum("slot_status", [
  "open",
  "withdrawn",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "active",
  "completed",
  "cancelled_by_student",
  "cancelled_by_interviewer",
  "cancelled_by_system",
  "no_show_student",
]);

export const awardStatusEnum = pgEnum("award_status", [
  "active",
  "nullified",
]);

// ---------------------------------------------------------------------------
// 1. Users
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---------------------------------------------------------------------------
// 2. Tracks
// ---------------------------------------------------------------------------
export const tracks = pgTable("tracks", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
});

// ---------------------------------------------------------------------------
// 3. Badges
// ---------------------------------------------------------------------------
export const badges = pgTable(
  "badges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    track_id: uuid("track_id")
      .references(() => tracks.id, { onDelete: "cascade" })
      .notNull(),
    level: badgeLevelEnum("level").notNull(),
    level_rank: smallint("level_rank").notNull(),
    bonus_miles: smallint("bonus_miles").notNull(),
  },
  (table) => [
    uniqueIndex("badges_track_level_unique").on(table.track_id, table.level),
  ]
);

// ---------------------------------------------------------------------------
// 4. Eligibilities
// ---------------------------------------------------------------------------
export const eligibilities = pgTable(
  "eligibilities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    student_id: uuid("student_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    badge_id: uuid("badge_id")
      .references(() => badges.id, { onDelete: "cascade" })
      .notNull(),
    granted_at: timestamp("granted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    revoked_at: timestamp("revoked_at", { withTimezone: true }),
    revoke_reason: text("revoke_reason"),
  },
  (table) => [
    uniqueIndex("eligibilities_active_unique")
      .on(table.student_id, table.badge_id)
      .where(sql`revoked_at IS NULL`),
  ]
);

// ---------------------------------------------------------------------------
// 5. Interview Attempts
// ---------------------------------------------------------------------------
export const interviewAttempts = pgTable(
  "interview_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    student_id: uuid("student_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    badge_id: uuid("badge_id")
      .references(() => badges.id, { onDelete: "cascade" })
      .notNull(),
    eligibility_id: uuid("eligibility_id")
      .references(() => eligibilities.id, { onDelete: "cascade" })
      .notNull(),
    attempt_no: smallint("attempt_no").notNull(),
    status: attemptStatusEnum("status").notNull(),
    not_before: timestamp("not_before", { withTimezone: true })
      .defaultNow()
      .notNull(),
    reschedule_count: smallint("reschedule_count").default(0).notNull(),
    outcome_reason: text("outcome_reason"),
    outcome_notes: text("outcome_notes"),
    outcome_recorded_by: uuid("outcome_recorded_by").references(() => users.id),
    outcome_recorded_at: timestamp("outcome_recorded_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("attempts_student_badge_attempt_no_unique").on(
      table.student_id,
      table.badge_id,
      table.attempt_no
    ),
    uniqueIndex("attempts_student_badge_open_unique")
      .on(table.student_id, table.badge_id)
      .where(
        sql`status IN ('awaiting_booking', 'booked', 'reschedule_required')`
      ),
    check(
      "attempts_outcome_recorded_check",
      sql`status NOT IN ('passed', 'failed', 'retake_later') OR outcome_recorded_at IS NOT NULL`
    ),
    index("attempts_status_badge_idx").on(table.status, table.badge_id),
  ]
);

// ---------------------------------------------------------------------------
// 6. Availability Slots
// ---------------------------------------------------------------------------
export const availabilitySlots = pgTable(
  "availability_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    interviewer_id: uuid("interviewer_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    start_at: timestamp("start_at", { withTimezone: true }).notNull(),
    end_at: timestamp("end_at", { withTimezone: true }).notNull(),
    status: slotStatusEnum("status").default("open").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("slots_interviewer_start_unique").on(
      table.interviewer_id,
      table.start_at
    ),
    check("slots_end_after_start_check", sql`end_at > start_at`),
    index("slots_open_start_idx")
      .on(table.start_at)
      .where(sql`status = 'open'`),
  ]
);

// ---------------------------------------------------------------------------
// 7. Bookings
// ---------------------------------------------------------------------------
export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attempt_id: uuid("attempt_id")
      .references(() => interviewAttempts.id, { onDelete: "cascade" })
      .notNull(),
    slot_id: uuid("slot_id")
      .references(() => availabilitySlots.id, { onDelete: "cascade" })
      .notNull(),
    student_id: uuid("student_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    interviewer_id: uuid("interviewer_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    status: bookingStatusEnum("status").default("active").notNull(),
    meeting_url: text("meeting_url").notNull(),
    cancel_reason: text("cancel_reason"),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    ended_at: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("bookings_slot_active_unique")
      .on(table.slot_id)
      .where(sql`status = 'active'`),
    uniqueIndex("bookings_student_active_unique")
      .on(table.student_id)
      .where(sql`status = 'active'`),
    index("bookings_interviewer_status_idx").on(
      table.interviewer_id,
      table.status
    ),
  ]
);

// ---------------------------------------------------------------------------
// 8. Badge Awards
// ---------------------------------------------------------------------------
export const badgeAwards = pgTable(
  "badge_awards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    student_id: uuid("student_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    badge_id: uuid("badge_id")
      .references(() => badges.id, { onDelete: "cascade" })
      .notNull(),
    attempt_id: uuid("attempt_id")
      .references(() => interviewAttempts.id, { onDelete: "cascade" })
      .unique()
      .notNull(),
    awarded_at: timestamp("awarded_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    status: awardStatusEnum("status").default("active").notNull(),
    nullified_at: timestamp("nullified_at", { withTimezone: true }),
    nullified_by: uuid("nullified_by").references(() => users.id),
    nullification_reason: text("nullification_reason"),
  },
  (table) => [
    uniqueIndex("awards_student_badge_active_unique")
      .on(table.student_id, table.badge_id)
      .where(sql`status = 'active'`),
    check(
      "awards_nullified_fields_check",
      sql`status = 'active' OR (nullified_at IS NOT NULL AND nullification_reason IS NOT NULL)`
    ),
  ]
);

// ---------------------------------------------------------------------------
// 9. Notifications
// ---------------------------------------------------------------------------
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    attempt_id: uuid("attempt_id").references(() => interviewAttempts.id, {
      onDelete: "set null",
    }),
    template_key: text("template_key").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    cta_label: text("cta_label"),
    cta_href: text("cta_href"),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    read_at: timestamp("read_at", { withTimezone: true }),
  },
  (table) => [
    index("notifications_user_created_idx").on(
      table.user_id,
      table.created_at.desc()
    ),
  ]
);

// ---------------------------------------------------------------------------
// 10. Demo Meta (infrastructure only)
// ---------------------------------------------------------------------------
export const demoMeta = pgTable("demo_meta", {
  id: smallint("id").primaryKey().default(1),
  seeded_at: timestamp("seeded_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
