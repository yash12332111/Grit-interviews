import { describe, it, expect } from "vitest";
import { deriveJourneyState, deriveTier } from "@/domain/derive";
import { JourneyState, AttemptStatus, AwardStatus, Tier } from "@/domain/states";

describe("Journey State Derivation & Precedence (architecture §6.1)", () => {
  const now = new Date("2026-11-13T10:00:00.000Z");

  it("1. BADGE_NULLIFIED: nullified award wins over everything", () => {
    const res = deriveJourneyState(
      {
        awards: [{ badge_id: "b1", status: AwardStatus.NULLIFIED }],
        openAttempt: {
          status: AttemptStatus.BOOKED,
          not_before: now,
        },
        activeBooking: {
          start_at: new Date(now.getTime() + 3600000),
          status: "active",
        },
        latestAttempt: null,
      },
      now
    );
    expect(res).toBe(JourneyState.BADGE_NULLIFIED);
  });

  it("2. PASSED: active award wins over open attempt", () => {
    const res = deriveJourneyState(
      {
        awards: [{ badge_id: "b1", status: AwardStatus.ACTIVE }],
        openAttempt: null,
        activeBooking: null,
        latestAttempt: null,
      },
      now
    );
    expect(res).toBe(JourneyState.PASSED);
  });

  it("3a. RESCHEDULE_REQUIRED: open attempt with status reschedule_required", () => {
    const res = deriveJourneyState(
      {
        awards: [],
        openAttempt: {
          status: AttemptStatus.RESCHEDULE_REQUIRED,
          not_before: now,
        },
        activeBooking: null,
        latestAttempt: null,
      },
      now
    );
    expect(res).toBe(JourneyState.RESCHEDULE_REQUIRED);
  });

  it("3b. BOOKED: open attempt booked and now < start_at", () => {
    const futureStart = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const res = deriveJourneyState(
      {
        awards: [],
        openAttempt: {
          status: AttemptStatus.BOOKED,
          not_before: now,
        },
        activeBooking: {
          start_at: futureStart,
          status: "active",
        },
        latestAttempt: null,
      },
      now
    );
    expect(res).toBe(JourneyState.BOOKED);
  });

  it("3c. AWAITING_RESULT: open attempt booked and now >= start_at", () => {
    const pastStart = new Date(now.getTime() - 30 * 60 * 1000);
    const res = deriveJourneyState(
      {
        awards: [],
        openAttempt: {
          status: AttemptStatus.BOOKED,
          not_before: now,
        },
        activeBooking: {
          start_at: pastStart,
          status: "active",
        },
        latestAttempt: null,
      },
      now
    );
    expect(res).toBe(JourneyState.AWAITING_RESULT);
  });

  it("3c (boundary): AWAITING_RESULT at exact start_at (now === start_at)", () => {
    const res = deriveJourneyState(
      {
        awards: [],
        openAttempt: {
          status: AttemptStatus.BOOKED,
          not_before: now,
        },
        activeBooking: {
          start_at: now,
          status: "active",
        },
        latestAttempt: null,
      },
      now
    );
    expect(res).toBe(JourneyState.AWAITING_RESULT);
  });

  it("3d. RETAKE_COOLDOWN: open attempt awaiting_booking and not_before > now", () => {
    const futureCooldown = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const res = deriveJourneyState(
      {
        awards: [],
        openAttempt: {
          status: AttemptStatus.AWAITING_BOOKING,
          not_before: futureCooldown,
        },
        activeBooking: null,
        latestAttempt: null,
      },
      now
    );
    expect(res).toBe(JourneyState.RETAKE_COOLDOWN);
  });

  it("3e. READY_TO_BOOK: open attempt awaiting_booking and not_before <= now", () => {
    const pastNotBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const res = deriveJourneyState(
      {
        awards: [],
        openAttempt: {
          status: AttemptStatus.AWAITING_BOOKING,
          not_before: pastNotBefore,
        },
        activeBooking: null,
        latestAttempt: null,
      },
      now
    );
    expect(res).toBe(JourneyState.READY_TO_BOOK);
  });

  it("3e (boundary): READY_TO_BOOK at exact not_before boundary (now === not_before)", () => {
    const res = deriveJourneyState(
      {
        awards: [],
        openAttempt: {
          status: AttemptStatus.AWAITING_BOOKING,
          not_before: now,
        },
        activeBooking: null,
        latestAttempt: null,
      },
      now
    );
    expect(res).toBe(JourneyState.READY_TO_BOOK);
  });

  it("4. FAILED: latest attempt is failed and no open attempt (resolves to FAILED not NOT_ELIGIBLE)", () => {
    const res = deriveJourneyState(
      {
        awards: [],
        openAttempt: null,
        activeBooking: null,
        latestAttempt: {
          status: AttemptStatus.FAILED,
          not_before: now,
        },
      },
      now
    );
    expect(res).toBe(JourneyState.FAILED);
  });

  it("5. NOT_ELIGIBLE: no awards, no open attempt, no failed attempt", () => {
    const res = deriveJourneyState(
      {
        awards: [],
        openAttempt: null,
        activeBooking: null,
        latestAttempt: null,
      },
      now
    );
    expect(res).toBe(JourneyState.NOT_ELIGIBLE);
  });
});

describe("Tier Derivation", () => {
  it("returns PRE_QUALIFLYER when student has no active awards", () => {
    expect(deriveTier([])).toBe(Tier.PRE_QUALIFLYER);
    expect(deriveTier([{ badge_id: "b1", status: AwardStatus.NULLIFIED }])).toBe(
      Tier.PRE_QUALIFLYER
    );
  });

  it("returns QUALIFLYER when student has at least one active award", () => {
    expect(deriveTier([{ badge_id: "b1", status: AwardStatus.ACTIVE }])).toBe(
      Tier.QUALIFLYER
    );
  });
});

