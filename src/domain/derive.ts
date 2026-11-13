// src/domain/derive.ts
// deriveJourneyState and deriveTier — pure functions; `now` is always a parameter.
// Derivation precedence per architecture §6.1.

import { JourneyState, AttemptStatus, AwardStatus, Tier } from "./states";

// ---------------------------------------------------------------------------
// Minimal record shapes (full DB rows passed in; we only need these fields)
// ---------------------------------------------------------------------------

export interface DeriveAwardRecord {
  status: AwardStatus;
  badge_id: string;
}

export interface DeriveAttemptRecord {
  status: AttemptStatus;
  not_before: Date;
}

export interface DeriveBookingRecord {
  start_at: Date;
  status: string;
}

export interface DeriveJourneyInput {
  /** All awards for this (student, badge) — may be empty */
  awards: DeriveAwardRecord[];
  /** The single open attempt (status in awaiting_booking|booked|reschedule_required), if any */
  openAttempt: DeriveAttemptRecord | null;
  /** The active booking on the open attempt, if any */
  activeBooking: DeriveBookingRecord | null;
  /** The latest attempt overall (may be the open one or a closed one) */
  latestAttempt: DeriveAttemptRecord | null;
}

/**
 * Returns the journey state for one (student, badge) pair.
 * Precedence (first match wins, per architecture §6.1):
 *  1. nullified award  → BADGE_NULLIFIED
 *  2. active award     → PASSED
 *  3. open attempt     → RESCHEDULE_REQUIRED / BOOKED / AWAITING_RESULT / RETAKE_COOLDOWN / READY_TO_BOOK
 *  4. latest attempt is failed → FAILED
 *  5. otherwise → NOT_ELIGIBLE
 */
export function deriveJourneyState(input: DeriveJourneyInput, now: Date): JourneyState {
  const { awards, openAttempt, activeBooking, latestAttempt } = input;

  // 1. Nullified award wins over everything
  if (awards.some((a) => a.status === AwardStatus.NULLIFIED)) {
    return JourneyState.BADGE_NULLIFIED;
  }

  // 2. Active award
  if (awards.some((a) => a.status === AwardStatus.ACTIVE)) {
    return JourneyState.PASSED;
  }

  // 3. Open attempt
  if (openAttempt) {
    if (openAttempt.status === AttemptStatus.RESCHEDULE_REQUIRED) {
      return JourneyState.RESCHEDULE_REQUIRED;
    }

    if (openAttempt.status === AttemptStatus.BOOKED && activeBooking) {
      // AWAITING_RESULT if start_at has passed (now >= start_at)
      if (now >= activeBooking.start_at) {
        return JourneyState.AWAITING_RESULT;
      }
      return JourneyState.BOOKED;
    }

    if (openAttempt.status === AttemptStatus.AWAITING_BOOKING) {
      // RETAKE_COOLDOWN if not_before is in the future
      if (openAttempt.not_before > now) {
        return JourneyState.RETAKE_COOLDOWN;
      }
      return JourneyState.READY_TO_BOOK;
    }
  }

  // 4. Latest attempt is failed
  if (latestAttempt && latestAttempt.status === AttemptStatus.FAILED) {
    return JourneyState.FAILED;
  }

  // 5. Default
  return JourneyState.NOT_ELIGIBLE;
}

/**
 * Returns the student's tier based on their active badge awards.
 * QUALIFLYER: at least one active award.
 * PRE_QUALIFLYER: no active award.
 */
export function deriveTier(awards: DeriveAwardRecord[]): Tier {
  if (awards.some((a) => a.status === AwardStatus.ACTIVE)) {
    return Tier.QUALIFLYER;
  }
  return Tier.PRE_QUALIFLYER;
}

