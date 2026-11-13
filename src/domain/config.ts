// src/domain/config.ts
// All constants from architecture §8.3. Every value is illustrative per the brief.
// No magic numbers anywhere else in the codebase — import from here.

export const SLOT_MINUTES = 30;
export const BOOK_MIN_LEAD_HOURS = 24;
export const BOOK_MAX_DAYS = 14;
export const CHANGE_CUTOFF_HOURS = 12;
export const MAX_RESCHEDULES = 2;
export const RETAKE_COOLDOWN_DAYS = 7;
export const OUTCOME_OVERDUE_HOURS = 24;
export const DEMO_STALE_HOURS = 6;
export const TZ = "Asia/Kolkata";

