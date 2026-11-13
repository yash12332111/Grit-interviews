import { describe, it, expect } from "vitest";
import { JourneyState, Trigger } from "@/domain/states";
import { canTransition, ALLOWED_TRANSITIONS } from "@/domain/transitions";

describe("Transition Matrix (architecture §6.2)", () => {
  // Explicitly verify each required transition ID from architecture §6.2
  const requiredTransitions = [
    { id: "T1", from: JourneyState.NOT_ELIGIBLE, trigger: Trigger.ELIGIBILITY_GRANTED },
    { id: "T2", from: JourneyState.READY_TO_BOOK, trigger: Trigger.BOOK },
    { id: "T3", from: JourneyState.BOOKED, trigger: Trigger.RESCHEDULE },
    { id: "T4", from: JourneyState.BOOKED, trigger: Trigger.CANCEL },
    { id: "T5", from: JourneyState.BOOKED, trigger: Trigger.INTERVIEWER_WITHDRAWS },
    { id: "T6", from: JourneyState.RESCHEDULE_REQUIRED, trigger: Trigger.REBOOK },
    { id: "T7", from: JourneyState.BOOKED, trigger: Trigger.TIME_PASSES },
    { id: "T8", from: JourneyState.AWAITING_RESULT, trigger: Trigger.OUTCOME_PASS },
    { id: "T9", from: JourneyState.AWAITING_RESULT, trigger: Trigger.OUTCOME_FAIL },
    { id: "T10", from: JourneyState.AWAITING_RESULT, trigger: Trigger.OUTCOME_RETAKE },
    { id: "T11", from: JourneyState.RETAKE_COOLDOWN, trigger: Trigger.COOLDOWN_ENDS },
    { id: "T12", from: JourneyState.FAILED, trigger: Trigger.ELIGIBILITY_REGRANTED },
    { id: "T13", from: JourneyState.PASSED, trigger: Trigger.MALPRACTICE_FLAGGED },
    { id: "T14", from: JourneyState.AWAITING_RESULT, trigger: Trigger.INTERVIEWER_NOSHOW },
    // T15: higher-badge open states -> PREREQUISITE_NULLIFIED
    { id: "T15a", from: JourneyState.READY_TO_BOOK, trigger: Trigger.PREREQUISITE_NULLIFIED },
    { id: "T15b", from: JourneyState.RETAKE_COOLDOWN, trigger: Trigger.PREREQUISITE_NULLIFIED },
    { id: "T15c", from: JourneyState.BOOKED, trigger: Trigger.PREREQUISITE_NULLIFIED },
    { id: "T15d", from: JourneyState.AWAITING_RESULT, trigger: Trigger.PREREQUISITE_NULLIFIED },
    { id: "T15e", from: JourneyState.RESCHEDULE_REQUIRED, trigger: Trigger.PREREQUISITE_NULLIFIED },
  ];

  for (const { id, from, trigger } of requiredTransitions) {
    it(`allows ${id}: ${from} + ${trigger}`, () => {
      expect(canTransition(from, trigger)).toBe(true);
    });
  }

  it("exhaustive rejection test: every unlisted (state, trigger) pair returns false", () => {
    const allStates = Object.values(JourneyState);
    const allTriggers = Object.values(Trigger);

    let testedCount = 0;
    let allowedCount = 0;
    let rejectedCount = 0;

    for (const state of allStates) {
      for (const trigger of allTriggers) {
        testedCount++;
        const key = `${state}:${trigger}`;
        const allowed = canTransition(state, trigger);
        if (ALLOWED_TRANSITIONS.has(key)) {
          expect(allowed).toBe(true);
          allowedCount++;
        } else {
          expect(allowed).toBe(false);
          rejectedCount++;
        }
      }
    }

    expect(allowedCount).toBe(ALLOWED_TRANSITIONS.size);
    expect(testedCount).toBe(allStates.length * allTriggers.length);
    expect(rejectedCount).toBe(testedCount - allowedCount);
  });
});
