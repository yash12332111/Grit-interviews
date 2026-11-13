// src/domain/rules.ts
// Guard functions for every transition.
// Pure — no I/O. `now` is always a parameter.

import {
  BOOK_MIN_LEAD_HOURS,
  BOOK_MAX_DAYS,
  CHANGE_CUTOFF_HOURS,
  MAX_RESCHEDULES,
  SLOT_MINUTES,
} from "./config";
import { AttemptStatus, AwardStatus, BadgeLevel } from "./states";

// ---------------------------------------------------------------------------
// Shared time helpers (pure)
// ---------------------------------------------------------------------------

function addHours(date: Date, h: number): Date {
  return new Date(date.getTime() + h * 60 * 60 * 1000);
}

function addDays(date: Date, d: number): Date {
  return new Date(date.getTime() + d * 24 * 60 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Types used by guards (minimal shapes; full DB types live in schema.ts)
// ---------------------------------------------------------------------------

export interface AttemptRecord {
  status: AttemptStatus;
  not_before: Date;
  reschedule_count: number;
}

export interface BookingRecord {
  start_at: Date;
  status: string;
}

export interface AwardRecord {
  badge_id: string;
  status: AwardStatus;
}

export interface BadgeRecord {
  id: string;
  level: BadgeLevel;
  level_rank: number;
  track_id: string;
}

// ---------------------------------------------------------------------------
// canBook — T2 (READY_TO_BOOK) and T6 (RESCHEDULE_REQUIRED)
// Architecture §5.3 F1 + A-21 prerequisite check
// ---------------------------------------------------------------------------

export interface CanBookParams {
  attempt: AttemptRecord;
  startAt: Date;
  now: Date;
  hasActiveBooking: boolean;
  badge: BadgeRecord;
  /** All badge awards for the student, across all tracks */
  studentAwards: AwardRecord[];
  /** All badges in the same track, ordered by level_rank */
  trackBadges: BadgeRecord[];
}

export type CanBookResult =
  | { ok: true }
  | { ok: false; code: "NOT_ELIGIBLE" | "ALREADY_BOOKED" | "SLOT_TOO_SOON" | "SLOT_TOO_FAR" | "COOLDOWN_ACTIVE" | "WRONG_STATUS" | "PREREQUISITE_NOT_MET" };

export function canBook(params: CanBookParams): CanBookResult {
  const { attempt, startAt, now, hasActiveBooking, badge, studentAwards, trackBadges } = params;

  // Attempt must be in a bookable status
  if (
    attempt.status !== AttemptStatus.AWAITING_BOOKING &&
    attempt.status !== AttemptStatus.RESCHEDULE_REQUIRED
  ) {
    return { ok: false, code: "WRONG_STATUS" };
  }

  // Cooldown: not_before must have passed
  if (attempt.not_before > now) {
    return { ok: false, code: "COOLDOWN_ACTIVE" };
  }

  // A student can only have one active booking at a time (A-03)
  if (hasActiveBooking) {
    return { ok: false, code: "ALREADY_BOOKED" };
  }

  // Booking window: startAt must be >= BOOK_MIN_LEAD_HOURS from now
  if (startAt < addHours(now, BOOK_MIN_LEAD_HOURS)) {
    return { ok: false, code: "SLOT_TOO_SOON" };
  }

  // Booking window: startAt must be <= BOOK_MAX_DAYS from now
  if (startAt > addDays(now, BOOK_MAX_DAYS)) {
    return { ok: false, code: "SLOT_TOO_FAR" };
  }

  // A-21: Booking level N requires an active award at level N-1
  const sortedBadges = [...trackBadges].sort((a, b) => a.level_rank - b.level_rank);
  const badgeIndex = sortedBadges.findIndex((b) => b.id === badge.id);

  if (badgeIndex > 0) {
    const prerequisiteBadge = sortedBadges[badgeIndex - 1];
    const hasPrerequisite = studentAwards.some(
      (a) => a.badge_id === prerequisiteBadge.id && a.status === AwardStatus.ACTIVE
    );
    if (!hasPrerequisite) {
      return { ok: false, code: "PREREQUISITE_NOT_MET" };
    }
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// canReschedule — T3
// ---------------------------------------------------------------------------

export interface CanRescheduleParams {
  booking: BookingRecord;
  rescheduleCount: number;
  now: Date;
}

export type CanRescheduleResult =
  | { ok: true }
  | { ok: false; code: "CUTOFF_PASSED" | "RESCHEDULE_LIMIT" };

export function canReschedule(params: CanRescheduleParams): CanRescheduleResult {
  const { booking, rescheduleCount, now } = params;

  // Must be before the cutoff
  if (booking.start_at <= addHours(now, CHANGE_CUTOFF_HOURS)) {
    return { ok: false, code: "CUTOFF_PASSED" };
  }

  // Must not have reached the reschedule limit
  if (rescheduleCount >= MAX_RESCHEDULES) {
    return { ok: false, code: "RESCHEDULE_LIMIT" };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// canCancel — T4
// ---------------------------------------------------------------------------

export interface CanCancelParams {
  booking: BookingRecord;
  now: Date;
}

export type CanCancelResult =
  | { ok: true }
  | { ok: false; code: "CUTOFF_PASSED" };

export function canCancel(params: CanCancelParams): CanCancelResult {
  const { booking, now } = params;

  if (booking.start_at <= addHours(now, CHANGE_CUTOFF_HOURS)) {
    return { ok: false, code: "CUTOFF_PASSED" };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// canRecordOutcome — T8, T9, T10
// ---------------------------------------------------------------------------

export interface CanRecordOutcomeParams {
  booking: BookingRecord;
  now: Date;
  actorId: string;
  interviewerId: string;
}

export type CanRecordOutcomeResult =
  | { ok: true }
  | { ok: false; code: "FORBIDDEN" | "SLOT_NOT_STARTED" | "WRONG_STATUS" };

export function canRecordOutcome(params: CanRecordOutcomeParams): CanRecordOutcomeResult {
  const { booking, now, actorId, interviewerId } = params;

  // Only the interviewer who owns the booking records the outcome
  if (actorId !== interviewerId) {
    return { ok: false, code: "FORBIDDEN" };
  }

  // Booking must be active
  if (booking.status !== "active") {
    return { ok: false, code: "WRONG_STATUS" };
  }

  // Interview must have started (now >= start_at)
  if (now < booking.start_at) {
    return { ok: false, code: "SLOT_NOT_STARTED" };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// canFlag — T13
// ---------------------------------------------------------------------------

export interface CanFlagParams {
  awardStatus: AwardStatus;
}

export type CanFlagResult =
  | { ok: true }
  | { ok: false; code: "INVALID_TRANSITION" };

export function canFlag(params: CanFlagParams): CanFlagResult {
  if (params.awardStatus !== AwardStatus.ACTIVE) {
    return { ok: false, code: "INVALID_TRANSITION" };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// canWithdraw — F5
// ---------------------------------------------------------------------------

export interface CanWithdrawParams {
  slot: { start_at: Date; status: string };
  now: Date;
  actorId: string;
  interviewerId: string;
}

export type CanWithdrawResult =
  | { ok: true }
  | { ok: false; code: "FORBIDDEN" | "SLOT_STARTED" };

export function canWithdraw(params: CanWithdrawParams): CanWithdrawResult {
  const { slot, now, actorId, interviewerId } = params;

  if (actorId !== interviewerId) {
    return { ok: false, code: "FORBIDDEN" };
  }

  // Cannot withdraw after the slot has started
  if (slot.start_at <= now) {
    return { ok: false, code: "SLOT_STARTED" };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// higherBadgesToLock — T15 cascade
// Architecture §5.3 F3: when badge at level N is nullified, lock every badge
// at level > N in the same track.
// ---------------------------------------------------------------------------

export function higherBadgesToLock(
  nullifiedBadge: BadgeRecord,
  trackBadges: BadgeRecord[]
): BadgeRecord[] {
  return trackBadges.filter(
    (b) =>
      b.track_id === nullifiedBadge.track_id &&
      b.level_rank > nullifiedBadge.level_rank
  );
}

// ---------------------------------------------------------------------------
// Slot alignment helper (used by addSlots action)
// ---------------------------------------------------------------------------

/** Returns true if the timestamp is aligned to SLOT_MINUTES */
export function isAligned(date: Date): boolean {
  const mins = date.getUTCMinutes();
  return mins % SLOT_MINUTES === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0;
}

