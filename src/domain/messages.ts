// src/domain/messages.ts
// Message templates for all 8 events in architecture §6.4.
// Pure functions returning { title, body, ctaLabel?, ctaHref? }.
// Copy is written in warm, encouraging Indian English. No placeholders or unresolved tokens.

import { TZ } from "./config";

export interface MessageOutput {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface BookingConfirmedContext {
  badgeName: string;
  startAt: Date;
  interviewerName: string;
  meetingUrl: string;
}

export interface BookingRescheduledContext {
  badgeName: string;
  previousStartAt: Date;
  newStartAt: Date;
  meetingUrl: string;
}

export interface BookingCancelledContext {
  badgeName: string;
  cancelledStartAt: Date;
  attemptId: string;
}

export interface InterviewerCancelledContext {
  badgeName: string;
  reason?: string;
  attemptId: string;
}

export interface ResultPassedContext {
  badgeName: string;
  bonusMiles: number;
  nextBadgeName?: string;
}

export interface ResultFailedContext {
  badgeName: string;
  feedbackNotes?: string;
}

export interface ResultRetakeContext {
  badgeName: string;
  reopenDate: Date;
  attemptNumber: number;
}

export interface BadgeNullifiedContext {
  badgeName: string;
  reason: string;
}

/** Formats a date into Indian Standard Time format (e.g. "Thu, 14 Nov, 3:30 PM IST") */
export function formatIST(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${formatter.format(date)} IST`;
}

/** Formats date only (e.g. "21 Nov 2026") */
export function formatDateOnlyIST(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return formatter.format(date);
}

// ---------------------------------------------------------------------------
// 1. BOOKING_CONFIRMED (Top-3 ★)
// ---------------------------------------------------------------------------
export function bookingConfirmedMessage(ctx: BookingConfirmedContext): MessageOutput {
  const timeStr = formatIST(ctx.startAt);
  return {
    title: `Interview Confirmed: ${ctx.badgeName} Badge`,
    body: `Great going! Your ${ctx.badgeName} evaluation is locked in for ${timeStr} with ${ctx.interviewerName}. Please join 5 minutes early in a quiet space with your webcam on. All the very best!`,
    ctaLabel: "View Meeting Link",
    ctaHref: ctx.meetingUrl,
  };
}

// ---------------------------------------------------------------------------
// 2. BOOKING_RESCHEDULED
// ---------------------------------------------------------------------------
export function bookingRescheduledMessage(ctx: BookingRescheduledContext): MessageOutput {
  const newTimeStr = formatIST(ctx.newStartAt);
  return {
    title: `Interview Rescheduled: ${ctx.badgeName} Badge`,
    body: `Your interview has been successfully moved to ${newTimeStr}. We've updated your schedule accordingly. Make sure to prepare well and join on time!`,
    ctaLabel: "Join Meeting",
    ctaHref: ctx.meetingUrl,
  };
}

// ---------------------------------------------------------------------------
// 3. BOOKING_CANCELLED
// ---------------------------------------------------------------------------
export function bookingCancelledMessage(ctx: BookingCancelledContext): MessageOutput {
  const cancelledTimeStr = formatIST(ctx.cancelledStartAt);
  return {
    title: `Slot Cancelled: ${ctx.badgeName} Badge`,
    body: `Your interview on ${cancelledTimeStr} was cancelled. Whenever you feel ready, pick another available slot within the 14-day window to continue your journey.`,
    ctaLabel: "Pick New Slot",
    ctaHref: `/student/book/${ctx.attemptId}`,
  };
}

// ---------------------------------------------------------------------------
// 4. INTERVIEWER_CANCELLED
// ---------------------------------------------------------------------------
export function interviewerCancelledMessage(ctx: InterviewerCancelledContext): MessageOutput {
  const reasonText = ctx.reason ? ` Reason provided: "${ctx.reason}".` : "";
  return {
    title: `Slot Reschedule Required: ${ctx.badgeName}`,
    body: `Your interviewer had to reschedule your upcoming evaluation due to an unavoidable conflict.${reasonText} Don't worry, this does not count against your reschedule limit. Please select a fresh slot at your convenience.`,
    ctaLabel: "Rebook Slot",
    ctaHref: `/student/book/${ctx.attemptId}?mode=reschedule`,
  };
}

// ---------------------------------------------------------------------------
// 5. RESULT_PASSED (Top-3 ★)
// ---------------------------------------------------------------------------
export function resultPassedMessage(ctx: ResultPassedContext): MessageOutput {
  const nextStep = ctx.nextBadgeName
    ? ` You are now eligible to begin your journey towards the ${ctx.nextBadgeName} badge.`
    : ` You have achieved the highest badge in this track!`;
  return {
    title: `Congratulations! You Cleared ${ctx.badgeName}!`,
    body: `Outstanding effort! You successfully demonstrated your technical proficiency and cleared the ${ctx.badgeName} interview. We have credited +${ctx.bonusMiles} bonus miles to your GRIT profile.${nextStep}`,
    ctaLabel: "View Badge Shelf",
    ctaHref: "/student/badges",
  };
}

// ---------------------------------------------------------------------------
// 6. RESULT_FAILED
// ---------------------------------------------------------------------------
export function resultFailedMessage(ctx: ResultFailedContext): MessageOutput {
  const feedback = ctx.feedbackNotes ? ` Evaluator notes: "${ctx.feedbackNotes}".` : "";
  return {
    title: `Interview Result: ${ctx.badgeName}`,
    body: `Thank you for completing the ${ctx.badgeName} interview. While you didn't clear this attempt, treat this as valuable feedback to strengthen your concepts.${feedback} Once you re-qualify through the skill contests, your booking window will reopen automatically. Keep at it!`,
    ctaLabel: "View Track Progress",
    ctaHref: "/student/badges",
  };
}

// ---------------------------------------------------------------------------
// 7. RESULT_RETAKE (Top-3 ★)
// ---------------------------------------------------------------------------
export function resultRetakeMessage(ctx: ResultRetakeContext): MessageOutput {
  const reopenStr = formatDateOnlyIST(ctx.reopenDate);
  return {
    title: `Retake Recommended: ${ctx.badgeName}`,
    body: `You are very close! The interviewer felt you have a solid grasp of the core concepts but need a little more polish on specific areas. You do not need to re-clear your upstream skills. Take a quick 7-day cooldown to revise, and rebooking will open on ${reopenStr} for Attempt #${ctx.attemptNumber}.`,
    ctaLabel: "Check Dashboard",
    ctaHref: "/student",
  };
}

// ---------------------------------------------------------------------------
// 8. BADGE_NULLIFIED
// ---------------------------------------------------------------------------
export function badgeNullifiedMessage(ctx: BadgeNullifiedContext): MessageOutput {
  return {
    title: `Badge Status Update: ${ctx.badgeName} Revoked`,
    body: `Following an internal review, your ${ctx.badgeName} badge award was nullified due to: "${ctx.reason}". Any dependent higher-level badges or upcoming interview bookings in this track have been locked accordingly.`,
    ctaLabel: "Review Badges",
    ctaHref: "/student/badges",
  };
}

