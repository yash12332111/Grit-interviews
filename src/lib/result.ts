// src/lib/result.ts
// Result<T> and the error code union from architecture §12.

export const ERROR_CODES = [
  "VALIDATION",
  "FORBIDDEN",
  "NOT_FOUND",
  "INVALID_TRANSITION",
  "SLOT_TAKEN",
  "ALREADY_BOOKED",
  "CUTOFF_PASSED",
  "RESCHEDULE_LIMIT",
  "COOLDOWN_ACTIVE",
  "NOT_ELIGIBLE",
  "SLOT_STARTED",
  "DB_UNAVAILABLE",
  "UNKNOWN",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type Failure = {
  ok: false;
  error: { code: ErrorCode; message: string };
};

export type Success<T> = { ok: true; data: T };

export type Result<T> = Success<T> | Failure;

/** Default user-facing copy per code (architecture §12 "UX" column). */
const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION: "Please check the highlighted fields and try again.",
  FORBIDDEN: "You don't have access to that. Pick the right persona to continue.",
  NOT_FOUND: "We couldn't find that. It may have been removed or reset.",
  INVALID_TRANSITION: "This has already been updated. Refreshing the latest status.",
  SLOT_TAKEN: "That time was just taken. Please pick another time.",
  ALREADY_BOOKED: "You already have an active interview booked.",
  CUTOFF_PASSED: "It's too close to the interview to change this now.",
  RESCHEDULE_LIMIT: "You've used all your reschedules for this attempt.",
  COOLDOWN_ACTIVE: "Booking for this attempt isn't open yet.",
  NOT_ELIGIBLE: "You're not currently eligible to book this interview.",
  SLOT_STARTED: "That slot has already started.",
  DB_UNAVAILABLE: "We couldn't reach the database. Please try again.",
  UNKNOWN: "Something went wrong. Please try again.",
};

export function defaultMessage(code: ErrorCode): string {
  return DEFAULT_MESSAGES[code];
}

export function ok<T>(data: T): Success<T> {
  return { ok: true, data };
}

export function fail(code: ErrorCode, message?: string): Failure {
  return { ok: false, error: { code, message: message ?? DEFAULT_MESSAGES[code] } };
}

/**
 * Thrown inside actions/guards (e.g. requireRole) and converted to a
 * Failure by `toFailure`. Carries only a code and a safe message.
 */
export class ActionError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message?: string) {
    super(message ?? DEFAULT_MESSAGES[code]);
    this.name = "ActionError";
    this.code = code;
  }
}

/**
 * Converts anything thrown into a Failure. Raw database/driver errors are
 * logged on the server and never shown to the user (architecture §12 rule 3).
 */
export function toFailure(err: unknown): Failure {
  if (err instanceof ActionError) return fail(err.code, err.message);
  console.error("[action] unexpected error:", err);
  return fail("UNKNOWN");
}
