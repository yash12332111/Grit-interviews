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
  /** `fields` carries per-input messages for inline form errors (VALIDATION). */
  error: { code: ErrorCode; message: string; fields?: Record<string, string> };
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

export function fail(
  code: ErrorCode,
  message?: string,
  fields?: Record<string, string>,
): Failure {
  return {
    ok: false,
    error: { code, message: message ?? DEFAULT_MESSAGES[code], ...(fields ? { fields } : {}) },
  };
}

/**
 * Thrown inside actions/guards (e.g. requireRole) and converted to a
 * Failure by `toFailure`. Carries only a code and a safe message.
 */
export class ActionError extends Error {
  readonly code: ErrorCode;
  readonly fields?: Record<string, string>;
  constructor(code: ErrorCode, message?: string, fields?: Record<string, string>) {
    super(message ?? DEFAULT_MESSAGES[code]);
    this.name = "ActionError";
    this.code = code;
    this.fields = fields;
  }
}

type ErrorLike = { code?: unknown; constraint?: unknown; message?: unknown; cause?: unknown };

/** Walks an error and its `cause` chain (drivers and ORMs wrap the original error). */
function errorChain(err: unknown): ErrorLike[] {
  const chain: ErrorLike[] = [];
  let e = err as ErrorLike | undefined;
  for (let i = 0; i < 5 && e && typeof e === "object"; i++) {
    chain.push(e);
    e = e.cause as ErrorLike | undefined;
  }
  return chain;
}

const CONNECTION_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EPIPE",
  "57P01", // admin shutdown
  "57P02", // crash shutdown
  "57P03", // cannot connect now
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
]);
const CONNECTION_MESSAGE =
  /connection terminated|connection timeout|timeout exceeded|unable to connect|socket hang up|terminating connection|control plane|websocket/i;

/** True when the database could not be reached (as opposed to rejecting a query). */
export function isConnectionError(err: unknown): boolean {
  return errorChain(err).some(
    (e) =>
      (typeof e.code === "string" && CONNECTION_CODES.has(e.code)) ||
      (typeof e.message === "string" && CONNECTION_MESSAGE.test(e.message)) ||
      // The Neon WebSocket driver reports a dropped socket as a bare
      // ErrorEvent: no code, no message, just type "error".
      e.constructor?.name === "ErrorEvent",
  );
}

/** Which unique constraint a Postgres 23505 violation hit, or null if it isn't one. */
function uniqueViolation(err: unknown): { constraint: string | null } | null {
  for (const e of errorChain(err)) {
    if (e.code === "23505") {
      return { constraint: typeof e.constraint === "string" ? e.constraint : null };
    }
  }
  return null;
}

/**
 * Converts anything thrown into a Failure. Raw database/driver errors are
 * logged on the server and never shown to the user (architecture §12 rule 3):
 * unique violations become specific codes, unreachable databases become
 * DB_UNAVAILABLE, everything else UNKNOWN.
 */
export function toFailure(err: unknown): Failure {
  if (err instanceof ActionError) return fail(err.code, err.message, err.fields);

  const unique = uniqueViolation(err);
  if (unique) {
    if (unique.constraint === "bookings_slot_active_unique") return fail("SLOT_TAKEN");
    if (unique.constraint === "bookings_student_active_unique") return fail("ALREADY_BOOKED");
    // Any other unique index (one active award, one open attempt…) means the
    // thing was already done by someone else a moment ago.
    return fail("INVALID_TRANSITION");
  }

  if (isConnectionError(err)) {
    console.error("[action] database unavailable:", err);
    return fail("DB_UNAVAILABLE");
  }

  console.error("[action] unexpected error:", err);
  return fail("UNKNOWN");
}
