// src/domain/states.ts
// Enums for all state machine values used across the domain.
// Pure — no I/O.

export enum JourneyState {
  NOT_ELIGIBLE = "NOT_ELIGIBLE",
  READY_TO_BOOK = "READY_TO_BOOK",
  RETAKE_COOLDOWN = "RETAKE_COOLDOWN",
  BOOKED = "BOOKED",
  AWAITING_RESULT = "AWAITING_RESULT",
  RESCHEDULE_REQUIRED = "RESCHEDULE_REQUIRED",
  PASSED = "PASSED",
  FAILED = "FAILED",
  BADGE_NULLIFIED = "BADGE_NULLIFIED",
}

/** Human-readable name of each journey state, for chips and hints. */
export const JOURNEY_STATE_LABEL: Record<JourneyState, string> = {
  [JourneyState.NOT_ELIGIBLE]: "Not eligible",
  [JourneyState.READY_TO_BOOK]: "Ready to book",
  [JourneyState.RETAKE_COOLDOWN]: "Retake cooldown",
  [JourneyState.BOOKED]: "Booked",
  [JourneyState.AWAITING_RESULT]: "Awaiting result",
  [JourneyState.RESCHEDULE_REQUIRED]: "Reschedule required",
  [JourneyState.PASSED]: "Passed",
  [JourneyState.FAILED]: "Failed",
  [JourneyState.BADGE_NULLIFIED]: "Badge nullified",
};

export enum AttemptStatus {
  AWAITING_BOOKING = "awaiting_booking",
  BOOKED = "booked",
  RESCHEDULE_REQUIRED = "reschedule_required",
  PASSED = "passed",
  FAILED = "failed",
  RETAKE_LATER = "retake_later",
  WITHDRAWN = "withdrawn",
}

export enum BookingStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  CANCELLED_BY_STUDENT = "cancelled_by_student",
  CANCELLED_BY_INTERVIEWER = "cancelled_by_interviewer",
  CANCELLED_BY_SYSTEM = "cancelled_by_system",
  NO_SHOW_STUDENT = "no_show_student",
}

export enum SlotStatus {
  OPEN = "open",
  WITHDRAWN = "withdrawn",
}

export enum AwardStatus {
  ACTIVE = "active",
  NULLIFIED = "nullified",
}

export enum UserRole {
  STUDENT = "student",
  INTERVIEWER = "interviewer",
  TEAM_ADMIN = "team_admin",
}

export enum BadgeLevel {
  NOVICE = "novice",
  SPECIALIST = "specialist",
  EXPERT = "expert",
  MASTER = "master",
  GRAND_MASTER = "grand_master",
}

export enum Outcome {
  PASS = "pass",
  FAIL = "fail",
  RETAKE_LATER = "retake_later",
}

export enum Tier {
  PRE_QUALIFLYER = "PRE_QUALIFLYER",
  QUALIFLYER = "QUALIFLYER",
}

export enum Trigger {
  ELIGIBILITY_GRANTED = "ELIGIBILITY_GRANTED",
  BOOK = "BOOK",
  RESCHEDULE = "RESCHEDULE",
  CANCEL = "CANCEL",
  INTERVIEWER_WITHDRAWS = "INTERVIEWER_WITHDRAWS",
  REBOOK = "REBOOK",
  TIME_PASSES = "TIME_PASSES",
  OUTCOME_PASS = "OUTCOME_PASS",
  OUTCOME_FAIL = "OUTCOME_FAIL",
  OUTCOME_RETAKE = "OUTCOME_RETAKE",
  COOLDOWN_ENDS = "COOLDOWN_ENDS",
  ELIGIBILITY_REGRANTED = "ELIGIBILITY_REGRANTED",
  MALPRACTICE_FLAGGED = "MALPRACTICE_FLAGGED",
  INTERVIEWER_NOSHOW = "INTERVIEWER_NOSHOW",
  PREREQUISITE_NULLIFIED = "PREREQUISITE_NULLIFIED",
}

export enum MessageKey {
  BOOKING_CONFIRMED = "BOOKING_CONFIRMED",
  BOOKING_RESCHEDULED = "BOOKING_RESCHEDULED",
  BOOKING_CANCELLED = "BOOKING_CANCELLED",
  INTERVIEWER_CANCELLED = "INTERVIEWER_CANCELLED",
  RESULT_PASSED = "RESULT_PASSED",
  RESULT_FAILED = "RESULT_FAILED",
  RESULT_RETAKE = "RESULT_RETAKE",
  BADGE_NULLIFIED = "BADGE_NULLIFIED",
}

