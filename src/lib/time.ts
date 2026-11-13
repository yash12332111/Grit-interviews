// src/lib/time.ts
// All times are stored in UTC and displayed in Asia/Kolkata (assumption A-13).

import { TZ } from "@/domain/config";

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
});

const dateLongFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: TZ,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const ymdFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "Fri, 14 Nov" */
export function formatDate(d: Date): string {
  return dateFmt.format(d);
}

/** "Friday, 14 November 2026" */
export function formatDateLong(d: Date): string {
  return dateLongFmt.format(d);
}

/** "3:30 pm" */
export function formatTime(d: Date): string {
  return timeFmt.format(d).toLowerCase();
}

/** "Fri, 14 Nov, 3:30 pm IST" */
export function formatDateTime(d: Date): string {
  return `${formatDate(d)}, ${formatTime(d)} IST`;
}

/** "2026-11-14" — the IST calendar day of an instant. */
export function istDayKey(d: Date): string {
  return ymdFmt.format(d);
}

function dayNumber(key: string): number {
  const [y, m, day] = key.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, day) / 86_400_000);
}

/** "Today" / "Tomorrow" / "Yesterday" / "Fri, 14 Nov" — relative to `now` in IST. */
export function relativeDayLabel(d: Date, now: Date): string {
  const diff = dayNumber(istDayKey(d)) - dayNumber(istDayKey(now));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatDate(d);
}

const IST_OFFSET = "+05:30";
const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

/** Midnight (start) of the IST calendar day that contains `d`, as a UTC instant. */
export function istDayStart(d: Date): Date {
  return new Date(`${istDayKey(d)}T00:00:00${IST_OFFSET}`);
}

/** The instant at `minutesOfDay` past midnight IST on the day `dayKey` ("YYYY-MM-DD"). Null if the date is invalid. */
export function istInstant(dayKey: string, minutesOfDay: number): Date | null {
  const midnight = new Date(`${dayKey}T00:00:00${IST_OFFSET}`);
  if (Number.isNaN(midnight.getTime()) || istDayKey(midnight) !== dayKey) return null;
  return new Date(midnight.getTime() + minutesOfDay * MS_PER_MINUTE);
}

/** `n` whole IST days after `d` (IST has no daylight saving, so a day is always 24h). */
export function addIstDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * MS_PER_DAY);
}
