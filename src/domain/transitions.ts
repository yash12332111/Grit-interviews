// src/domain/transitions.ts
// The §6.2 transition table. Pure — no I/O.
// canTransition(from, trigger) → true if the pair is in the allowed set.

import { JourneyState, Trigger } from "./states";

// Allowed (state, trigger) pairs from architecture §6.2
// T1 and T12 are upstream-only (seed creates them); included for completeness.
// T7 and T11 are time-derived; included as documentation.
const ALLOWED: ReadonlySet<string> = new Set([
  // T1 – NOT_ELIGIBLE → READY_TO_BOOK via ELIGIBILITY_GRANTED (seed/upstream)
  `${JourneyState.NOT_ELIGIBLE}:${Trigger.ELIGIBILITY_GRANTED}`,
  // T2 – READY_TO_BOOK → BOOKED via BOOK
  `${JourneyState.READY_TO_BOOK}:${Trigger.BOOK}`,
  // T3 – BOOKED → BOOKED via RESCHEDULE
  `${JourneyState.BOOKED}:${Trigger.RESCHEDULE}`,
  // T4 – BOOKED → READY_TO_BOOK via CANCEL
  `${JourneyState.BOOKED}:${Trigger.CANCEL}`,
  // T5 – BOOKED → RESCHEDULE_REQUIRED via INTERVIEWER_WITHDRAWS
  `${JourneyState.BOOKED}:${Trigger.INTERVIEWER_WITHDRAWS}`,
  // T6 – RESCHEDULE_REQUIRED → BOOKED via REBOOK
  `${JourneyState.RESCHEDULE_REQUIRED}:${Trigger.REBOOK}`,
  // T7 – BOOKED → AWAITING_RESULT via TIME_PASSES (derived)
  `${JourneyState.BOOKED}:${Trigger.TIME_PASSES}`,
  // T8 – AWAITING_RESULT → PASSED via OUTCOME_PASS
  `${JourneyState.AWAITING_RESULT}:${Trigger.OUTCOME_PASS}`,
  // T9 – AWAITING_RESULT → FAILED via OUTCOME_FAIL
  `${JourneyState.AWAITING_RESULT}:${Trigger.OUTCOME_FAIL}`,
  // T10 – AWAITING_RESULT → RETAKE_COOLDOWN via OUTCOME_RETAKE
  `${JourneyState.AWAITING_RESULT}:${Trigger.OUTCOME_RETAKE}`,
  // T11 – RETAKE_COOLDOWN → READY_TO_BOOK via COOLDOWN_ENDS (derived)
  `${JourneyState.RETAKE_COOLDOWN}:${Trigger.COOLDOWN_ENDS}`,
  // T12 – FAILED → READY_TO_BOOK via ELIGIBILITY_REGRANTED (upstream)
  `${JourneyState.FAILED}:${Trigger.ELIGIBILITY_REGRANTED}`,
  // T13 – PASSED → BADGE_NULLIFIED via MALPRACTICE_FLAGGED
  `${JourneyState.PASSED}:${Trigger.MALPRACTICE_FLAGGED}`,
  // T14 – AWAITING_RESULT → RESCHEDULE_REQUIRED via INTERVIEWER_NOSHOW (documented only)
  `${JourneyState.AWAITING_RESULT}:${Trigger.INTERVIEWER_NOSHOW}`,
  // T15 – higher-badge open states → NOT_ELIGIBLE via PREREQUISITE_NULLIFIED (cascade)
  `${JourneyState.READY_TO_BOOK}:${Trigger.PREREQUISITE_NULLIFIED}`,
  `${JourneyState.RETAKE_COOLDOWN}:${Trigger.PREREQUISITE_NULLIFIED}`,
  `${JourneyState.BOOKED}:${Trigger.PREREQUISITE_NULLIFIED}`,
  `${JourneyState.AWAITING_RESULT}:${Trigger.PREREQUISITE_NULLIFIED}`,
  `${JourneyState.RESCHEDULE_REQUIRED}:${Trigger.PREREQUISITE_NULLIFIED}`,
]);

/**
 * Returns true if the (from, trigger) pair is an allowed transition.
 * Any other pair must be rejected with INVALID_TRANSITION.
 */
export function canTransition(from: JourneyState, trigger: Trigger): boolean {
  return ALLOWED.has(`${from}:${trigger}`);
}

export { ALLOWED as ALLOWED_TRANSITIONS };

