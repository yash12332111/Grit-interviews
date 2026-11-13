import { describe, it, expect } from "vitest";
import {
  bookingConfirmedMessage,
  bookingRescheduledMessage,
  bookingCancelledMessage,
  interviewerCancelledMessage,
  resultPassedMessage,
  resultFailedMessage,
  resultRetakeMessage,
  badgeNullifiedMessage,
  formatIST,
  formatDateOnlyIST,
} from "@/domain/messages";
import { SHOWCASE_MESSAGE_CONTEXTS, getShowcaseMessages } from "@/app/showcase/fixtures";

describe("Message Templates (architecture §6.4)", () => {
  const testDate = new Date("2026-11-14T05:30:00.000Z"); // 11:00 AM IST

  const allOutputs = [
    bookingConfirmedMessage({
      badgeName: "Novice",
      startAt: testDate,
      interviewerName: "Rahul Verma",
      meetingUrl: "https://meet.jit.si/GRIT-40000000",
    }),
    bookingRescheduledMessage({
      badgeName: "Novice",
      previousStartAt: testDate,
      newStartAt: new Date(testDate.getTime() + 86400000),
      meetingUrl: "https://meet.jit.si/GRIT-40000000",
    }),
    bookingCancelledMessage({
      badgeName: "Novice",
      cancelledStartAt: testDate,
      attemptId: "20000000-0000-0000-0000-000000000001",
    }),
    interviewerCancelledMessage({
      badgeName: "Novice",
      reason: "Unavoidable schedule conflict",
      attemptId: "20000000-0000-0000-0000-000000000001",
    }),
    interviewerCancelledMessage({
      badgeName: "Novice",
      attemptId: "20000000-0000-0000-0000-000000000001",
    }),
    resultPassedMessage({
      badgeName: "Novice",
      bonusMiles: 150,
      nextBadgeName: "Specialist",
    }),
    resultPassedMessage({
      badgeName: "Grand Master",
      bonusMiles: 500,
    }),
    resultFailedMessage({
      badgeName: "Novice",
      feedbackNotes: "Needs practice on data structures.",
    }),
    resultFailedMessage({
      badgeName: "Novice",
    }),
    resultRetakeMessage({
      badgeName: "Novice",
      reopenDate: new Date(testDate.getTime() + 7 * 86400000),
      attemptNumber: 2,
    }),
    badgeNullifiedMessage({
      badgeName: "Novice",
      reason: "Suspected external assistance during assessment",
    }),
  ];

  it("ensures no message output contains unresolved tokens: 'undefined', 'null', '{', or '}'", () => {
    // Check for unresolved literal placeholders or raw JS null/undefined
    const unresolvedPattern = /\bundefined\b|\bnull\b|[{}]/;

    for (const msg of allOutputs) {
      expect(msg.title).toBeDefined();
      expect(msg.title).not.toMatch(unresolvedPattern);

      expect(msg.body).toBeDefined();
      expect(msg.body).not.toMatch(unresolvedPattern);

      if (msg.ctaLabel) {
        expect(msg.ctaLabel).not.toMatch(unresolvedPattern);
      }
      if (msg.ctaHref) {
        expect(msg.ctaHref).not.toMatch(unresolvedPattern);
      }
    }
  });

  it("formats dates in IST properly with time zone indicator", () => {
    const istString = formatIST(testDate);
    expect(istString).toContain("IST");
    expect(istString).toContain("11:00");
  });

  it("formats date only in IST properly", () => {
    const dateOnly = formatDateOnlyIST(testDate);
    expect(dateOnly).toMatch(/14 Nov 2026/);
  });
});

describe("Showcase messages match the real templates (brief #5: exactly as they appear)", () => {
  const shown = getShowcaseMessages();
  const ctx = SHOWCASE_MESSAGE_CONTEXTS;

  it("Booking confirmed is the template output for the same context", () => {
    expect(shown.bookingConfirmed).toEqual(bookingConfirmedMessage(ctx.bookingConfirmed));
  });

  it("Result: Passed is the template output for the same context", () => {
    expect(shown.resultPassed).toEqual(resultPassedMessage(ctx.resultPassed));
  });

  it("Result: Retake later is the template output for the same context", () => {
    expect(shown.resultRetake).toEqual(resultRetakeMessage(ctx.resultRetake));
  });

  it("the three showcase messages are complete (no placeholders, title and body present)", () => {
    for (const m of Object.values(shown)) {
      expect(m.title.length).toBeGreaterThan(0);
      expect(m.body.length).toBeGreaterThan(0);
      for (const bad of ["undefined", "null", "{", "}"]) {
        expect(`${m.title} ${m.body} ${m.ctaLabel ?? ""}`).not.toContain(bad);
      }
    }
  });
});
