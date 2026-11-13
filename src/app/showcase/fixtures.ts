// src/app/showcase/fixtures.ts
// Fixed data for /showcase. No database, no clock: the page is static and the
// same every time. The components that render it are the live ones.

import type { JourneyView, NotificationView } from "@/db/queries/student";
import {
  badgeNullifiedMessage,
  bookingConfirmedMessage,
  resultFailedMessage,
  resultPassedMessage,
  resultRetakeMessage,
  type MessageOutput,
} from "@/domain/messages";
import { JourneyState } from "@/domain/states";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** 13 Nov 2026, 11:00 am IST. */
export const FIXTURE_NOW = new Date("2026-11-13T05:30:00.000Z");

const NOVICE = { id: "fixture-novice", level: "novice", label: "Novice", rank: 1, bonusMiles: 150 };
const SPECIALIST = {
  id: "fixture-specialist",
  level: "specialist",
  label: "Specialist",
  rank: 2,
  bonusMiles: 250,
};

const BLANK: Omit<JourneyView, "badge" | "state"> = {
  attempt: null,
  booking: null,
  interviewerCancelReason: null,
  award: null,
  lastResult: null,
};

const lockedSpecialist: JourneyView = {
  ...BLANK,
  badge: SPECIALIST,
  state: JourneyState.NOT_ELIGIBLE,
};

const NOTES = {
  pass: "Excellent command over fundamentals.",
  retake: "Strong basics, needs more depth on system workflows.",
  fail: "Did not meet prerequisite knowledge requirements.",
  nullified: "Answers were supplied by a third party during the interview.",
};

/** The student home as it looks before the result: interview time reached, no outcome yet. */
const awaitingResult: JourneyView = {
  ...BLANK,
  badge: NOVICE,
  state: JourneyState.AWAITING_RESULT,
  attempt: {
    id: "fixture-attempt-1",
    attemptNo: 1,
    status: "booked",
    notBefore: new Date(FIXTURE_NOW.getTime() - 5 * DAY),
    rescheduleCount: 0,
  },
  booking: {
    id: "fixture-booking",
    startAt: new Date(FIXTURE_NOW.getTime() - HOUR),
    endAt: new Date(FIXTURE_NOW.getTime() - HOUR / 2),
    meetingUrl: "https://meet.jit.si/GRIT-4a7c91e2",
    interviewerFirstName: "Priya",
  },
};

function asNotification(id: string, m: MessageOutput): NotificationView {
  return {
    id,
    title: m.title,
    body: m.body,
    ctaLabel: m.ctaLabel ?? null,
    ctaHref: m.ctaHref ?? null,
  };
}

export type HomeFixture = {
  /** Journeys shown as cards on the home screen. */
  journeys: JourneyView[];
  /** One journey per badge in the track, for the badge shelf. */
  allJourneys: JourneyView[];
  notification: NotificationView | null;
};

export type Scenario = {
  key: "pass" | "retake" | "fail" | "nullified";
  title: string;
  caption: string;
  before: HomeFixture;
  after: HomeFixture;
};

const BEFORE: HomeFixture = {
  journeys: [awaitingResult],
  allJourneys: [awaitingResult, lockedSpecialist],
  notification: null,
};

function after(novice: JourneyView, message: MessageOutput, id: string): HomeFixture {
  return {
    journeys: [novice],
    allJourneys: [novice, lockedSpecialist],
    notification: asNotification(id, message),
  };
}

const passMessage = resultPassedMessage({
  badgeName: "Novice",
  bonusMiles: NOVICE.bonusMiles,
  nextBadgeName: "Specialist",
});
const retakeReopen = new Date(FIXTURE_NOW.getTime() + 7 * DAY);
const retakeMessage = resultRetakeMessage({
  badgeName: "Novice",
  reopenDate: retakeReopen,
  attemptNumber: 2,
});
const failMessage = resultFailedMessage({ badgeName: "Novice", feedbackNotes: NOTES.fail });
const nullifiedMessage = badgeNullifiedMessage({ badgeName: "Novice", reason: NOTES.nullified });

export const SCENARIOS: Scenario[] = [
  {
    key: "pass",
    title: "Pass",
    caption: "The badge is earned: bonus miles, Qualiflyer chip, and the Passed message.",
    before: BEFORE,
    after: after(
      {
        ...BLANK,
        badge: NOVICE,
        state: JourneyState.PASSED,
        attempt: { ...awaitingResult.attempt!, status: "passed" },
        award: {
          id: "fixture-award",
          status: "active",
          awardedAt: FIXTURE_NOW,
          nullifiedAt: null,
          nullificationReason: null,
        },
        lastResult: { status: "passed", notes: NOTES.pass, noShow: false },
      },
      passMessage,
      "fixture-pass",
    ),
  },
  {
    key: "retake",
    title: "Retake later",
    caption: "Close but not yet: a 7-day cooldown, then rebooking reopens.",
    before: BEFORE,
    after: after(
      {
        ...BLANK,
        badge: NOVICE,
        state: JourneyState.RETAKE_COOLDOWN,
        attempt: {
          id: "fixture-attempt-2",
          attemptNo: 2,
          status: "awaiting_booking",
          notBefore: retakeReopen,
          rescheduleCount: 0,
        },
        lastResult: { status: "retake_later", notes: NOTES.retake, noShow: false },
      },
      retakeMessage,
      "fixture-retake",
    ),
  },
  {
    key: "fail",
    title: "Fail",
    caption: "Not cleared: re-qualifying through skill contests reopens booking.",
    before: BEFORE,
    after: after(
      {
        ...BLANK,
        badge: NOVICE,
        state: JourneyState.FAILED,
        attempt: { ...awaitingResult.attempt!, status: "failed" },
        lastResult: { status: "failed", notes: NOTES.fail, noShow: false },
      },
      failMessage,
      "fixture-fail",
    ),
  },
  {
    key: "nullified",
    title: "Nullified",
    caption: "A passed badge revoked after malpractice: struck through, chip back to Pre-Qualiflyer.",
    before: BEFORE,
    after: after(
      {
        ...BLANK,
        badge: NOVICE,
        state: JourneyState.BADGE_NULLIFIED,
        attempt: { ...awaitingResult.attempt!, status: "passed" },
        award: {
          id: "fixture-award-nullified",
          status: "nullified",
          awardedAt: new Date(FIXTURE_NOW.getTime() - 3 * DAY),
          nullifiedAt: FIXTURE_NOW,
          nullificationReason: NOTES.nullified,
        },
        lastResult: { status: "passed", notes: NOTES.pass, noShow: false },
      },
      nullifiedMessage,
      "fixture-nullified",
    ),
  },
];

/** Fixed context for the three most important student messages (decision D-02). */
export const SHOWCASE_MESSAGE_CONTEXTS = {
  bookingConfirmed: {
    badgeName: "Novice",
    startAt: new Date("2026-11-16T05:30:00.000Z"),
    interviewerName: "Priya Sharma",
    meetingUrl: "https://meet.jit.si/GRIT-4a7c91e2",
  },
  resultPassed: {
    badgeName: "Novice",
    bonusMiles: NOVICE.bonusMiles,
    nextBadgeName: "Specialist",
  },
  resultRetake: {
    badgeName: "Novice",
    reopenDate: retakeReopen,
    attemptNumber: 2,
  },
};

/** The three messages, built by the same templates the app uses when it sends them. */
export function getShowcaseMessages() {
  return {
    bookingConfirmed: bookingConfirmedMessage(SHOWCASE_MESSAGE_CONTEXTS.bookingConfirmed),
    resultPassed: resultPassedMessage(SHOWCASE_MESSAGE_CONTEXTS.resultPassed),
    resultRetake: resultRetakeMessage(SHOWCASE_MESSAGE_CONTEXTS.resultRetake),
  };
}
