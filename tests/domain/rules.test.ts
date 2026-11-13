import { describe, it, expect } from "vitest";
import {
  canBook,
  canReschedule,
  canCancel,
  canRecordOutcome,
  canFlag,
  canWithdraw,
  higherBadgesToLock,
  isAligned,
} from "@/domain/rules";
import { AttemptStatus, AwardStatus, BadgeLevel } from "@/domain/states";
import {
  BOOK_MIN_LEAD_HOURS,
  BOOK_MAX_DAYS,
  CHANGE_CUTOFF_HOURS,
  MAX_RESCHEDULES,
} from "@/domain/config";

describe("Domain Rules & Guards", () => {
  const now = new Date("2026-11-13T10:00:00.000Z");

  const noviceBadge = {
    id: "badge-novice",
    level: BadgeLevel.NOVICE,
    level_rank: 1,
    track_id: "track-1",
  };

  const specialistBadge = {
    id: "badge-spec",
    level: BadgeLevel.SPECIALIST,
    level_rank: 2,
    track_id: "track-1",
  };

  const trackBadges = [noviceBadge, specialistBadge];

  describe("canBook", () => {
    const validAttempt = {
      status: AttemptStatus.AWAITING_BOOKING,
      not_before: new Date("2026-11-12T10:00:00.000Z"),
      reschedule_count: 0,
    };

    it("accepts valid Novice booking within lead window", () => {
      const slotTime = new Date(now.getTime() + (BOOK_MIN_LEAD_HOURS + 2) * 60 * 60 * 1000);
      const res = canBook({
        attempt: validAttempt,
        startAt: slotTime,
        now,
        hasActiveBooking: false,
        badge: noviceBadge,
        studentAwards: [],
        trackBadges,
      });
      expect(res.ok).toBe(true);
    });

    it("rejects booking if student already has an active booking (A-03)", () => {
      const slotTime = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const res = canBook({
        attempt: validAttempt,
        startAt: slotTime,
        now,
        hasActiveBooking: true,
        badge: noviceBadge,
        studentAwards: [],
        trackBadges,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("ALREADY_BOOKED");
    });

    it("rejects booking if slot is sooner than BOOK_MIN_LEAD_HOURS (24h)", () => {
      const slotTime = new Date(now.getTime() + 23 * 60 * 60 * 1000);
      const res = canBook({
        attempt: validAttempt,
        startAt: slotTime,
        now,
        hasActiveBooking: false,
        badge: noviceBadge,
        studentAwards: [],
        trackBadges,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("SLOT_TOO_SOON");
    });

    it("allows booking at exactly BOOK_MIN_LEAD_HOURS boundary", () => {
      const exactBoundary = new Date(now.getTime() + BOOK_MIN_LEAD_HOURS * 60 * 60 * 1000);
      const res = canBook({
        attempt: validAttempt,
        startAt: exactBoundary,
        now,
        hasActiveBooking: false,
        badge: noviceBadge,
        studentAwards: [],
        trackBadges,
      });
      expect(res.ok).toBe(true);
    });

    it("rejects booking beyond BOOK_MAX_DAYS (14d)", () => {
      const slotTime = new Date(now.getTime() + (BOOK_MAX_DAYS + 1) * 24 * 60 * 60 * 1000);
      const res = canBook({
        attempt: validAttempt,
        startAt: slotTime,
        now,
        hasActiveBooking: false,
        badge: noviceBadge,
        studentAwards: [],
        trackBadges,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("SLOT_TOO_FAR");
    });

    it("cooldown test: rejects booking before not_before has arrived", () => {
      const slotTime = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const cooldownAttempt = {
        ...validAttempt,
        not_before: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // future
      };
      const res = canBook({
        attempt: cooldownAttempt,
        startAt: slotTime,
        now,
        hasActiveBooking: false,
        badge: noviceBadge,
        studentAwards: [],
        trackBadges,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("COOLDOWN_ACTIVE");
    });

    it("allows booking at exactly not_before boundary (now === not_before)", () => {
      const slotTime = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const boundaryAttempt = {
        ...validAttempt,
        not_before: now, // exact boundary
      };
      const res = canBook({
        attempt: boundaryAttempt,
        startAt: slotTime,
        now,
        hasActiveBooking: false,
        badge: noviceBadge,
        studentAwards: [],
        trackBadges,
      });
      expect(res.ok).toBe(true);
    });

    it("prerequisite test: canBook rejects Specialist without active Novice award (A-21)", () => {
      const slotTime = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const res = canBook({
        attempt: validAttempt,
        startAt: slotTime,
        now,
        hasActiveBooking: false,
        badge: specialistBadge,
        studentAwards: [], // No active Novice award
        trackBadges,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("PREREQUISITE_NOT_MET");
    });

    it("prerequisite test: allows Specialist when active Novice award exists", () => {
      const slotTime = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const res = canBook({
        attempt: validAttempt,
        startAt: slotTime,
        now,
        hasActiveBooking: false,
        badge: specialistBadge,
        studentAwards: [{ badge_id: noviceBadge.id, status: AwardStatus.ACTIVE }],
        trackBadges,
      });
      expect(res.ok).toBe(true);
    });

    it("prerequisite test: rejects Specialist if Novice award is nullified", () => {
      const slotTime = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const res = canBook({
        attempt: validAttempt,
        startAt: slotTime,
        now,
        hasActiveBooking: false,
        badge: specialistBadge,
        studentAwards: [{ badge_id: noviceBadge.id, status: AwardStatus.NULLIFIED }],
        trackBadges,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("PREREQUISITE_NOT_MET");
    });
  });

  describe("canReschedule & canCancel (Change Cutoff & Reschedule Limit)", () => {
    it("allows reschedule when outside cutoff (< MAX_RESCHEDULES)", () => {
      const booking = {
        start_at: new Date(now.getTime() + (CHANGE_CUTOFF_HOURS + 1) * 60 * 60 * 1000),
        status: "active",
      };
      const res = canReschedule({ booking, rescheduleCount: 1, now });
      expect(res.ok).toBe(true);
    });

    it("rejects reschedule when inside cutoff (<= 12 hours)", () => {
      const booking = {
        start_at: new Date(now.getTime() + (CHANGE_CUTOFF_HOURS - 1) * 60 * 60 * 1000),
        status: "active",
      };
      const res = canReschedule({ booking, rescheduleCount: 0, now });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("CUTOFF_PASSED");
    });

    it("rejects reschedule at exactly the cutoff boundary", () => {
      const booking = {
        start_at: new Date(now.getTime() + CHANGE_CUTOFF_HOURS * 60 * 60 * 1000),
        status: "active",
      };
      const res = canReschedule({ booking, rescheduleCount: 0, now });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("CUTOFF_PASSED");
    });

    it("rejects reschedule when MAX_RESCHEDULES (2) is reached", () => {
      const booking = {
        start_at: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        status: "active",
      };
      const res = canReschedule({ booking, rescheduleCount: MAX_RESCHEDULES, now });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("RESCHEDULE_LIMIT");
    });

    it("rejects cancel when inside cutoff", () => {
      const booking = {
        start_at: new Date(now.getTime() + 8 * 60 * 60 * 1000), // 8h < 12h
        status: "active",
      };
      const res = canCancel({ booking, now });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("CUTOFF_PASSED");
    });
  });

  describe("canRecordOutcome", () => {
    it("allows recording outcome when now >= start_at and owned by actor", () => {
      const booking = {
        start_at: new Date(now.getTime() - 30 * 60 * 1000), // 30m in past
        status: "active",
      };
      const res = canRecordOutcome({
        booking,
        now,
        actorId: "interviewer-1",
        interviewerId: "interviewer-1",
      });
      expect(res.ok).toBe(true);
    });

    it("allows recording outcome at exact start_at boundary (now === start_at)", () => {
      const booking = {
        start_at: now, // exactly started
        status: "active",
      };
      const res = canRecordOutcome({
        booking,
        now,
        actorId: "interviewer-1",
        interviewerId: "interviewer-1",
      });
      expect(res.ok).toBe(true);
    });

    it("rejects recording outcome if slot has not started (now < start_at)", () => {
      const booking = {
        start_at: new Date(now.getTime() + 10 * 60 * 1000), // 10m in future
        status: "active",
      };
      const res = canRecordOutcome({
        booking,
        now,
        actorId: "interviewer-1",
        interviewerId: "interviewer-1",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("SLOT_NOT_STARTED");
    });

    it("rejects recording outcome if actor is not the booking's interviewer", () => {
      const booking = {
        start_at: new Date(now.getTime() - 30 * 60 * 1000),
        status: "active",
      };
      const res = canRecordOutcome({
        booking,
        now,
        actorId: "interviewer-2",
        interviewerId: "interviewer-1",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("FORBIDDEN");
    });
  });

  describe("canWithdraw & canFlag", () => {
    it("canWithdraw rejects if slot has already started", () => {
      const slot = {
        start_at: new Date(now.getTime() - 1000),
        status: "open",
      };
      const res = canWithdraw({
        slot,
        now,
        actorId: "i1",
        interviewerId: "i1",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("SLOT_STARTED");
    });

    it("canWithdraw rejects if not the owning interviewer", () => {
      const slot = {
        start_at: new Date(now.getTime() + 3600000),
        status: "open",
      };
      const res = canWithdraw({
        slot,
        now,
        actorId: "i2",
        interviewerId: "i1",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("FORBIDDEN");
    });

    it("canFlag allows active award and rejects nullified award", () => {
      expect(canFlag({ awardStatus: AwardStatus.ACTIVE }).ok).toBe(true);
      expect(canFlag({ awardStatus: AwardStatus.NULLIFIED }).ok).toBe(false);
    });
  });

  describe("higherBadgesToLock (T15 cascade)", () => {
    it("returns Specialist when Novice is nullified", () => {
      const higher = higherBadgesToLock(noviceBadge, trackBadges);
      expect(higher).toHaveLength(1);
      expect(higher[0].id).toBe(specialistBadge.id);
      expect(higher[0].level).toBe(BadgeLevel.SPECIALIST);
    });

    it("returns empty array when highest badge is nullified", () => {
      const higher = higherBadgesToLock(specialistBadge, trackBadges);
      expect(higher).toHaveLength(0);
    });
  });

  describe("isAligned helper", () => {
    it("correctly identifies 30-minute aligned dates", () => {
      expect(isAligned(new Date("2026-11-13T10:00:00.000Z"))).toBe(true);
      expect(isAligned(new Date("2026-11-13T10:30:00.000Z"))).toBe(true);
      expect(isAligned(new Date("2026-11-13T10:15:00.000Z"))).toBe(false);
      expect(isAligned(new Date("2026-11-13T10:30:05.000Z"))).toBe(false);
    });
  });
});
