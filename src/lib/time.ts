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
