// Time helpers.
//
// Design decision for v1: the studio runs in a single timezone, so we treat all
// booking times as "wall clock" times and store them as the matching UTC
// instant (e.g. a 6pm slot on 2026-07-02 is stored as 2026-07-02T18:00:00Z).
// This keeps slot maths simple and avoids DST edge cases. Everyone — owner and
// client — sees the same studio-local clock. Document this if you later add
// multiple locations / timezones.

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// "2026-07-02" + 1080 (minutes) -> Date(2026-07-02T18:00:00Z)
export function dateAndMinutesToUtc(dateStr: string, minutes: number): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) + minutes * 60_000);
}

// Day of week (0=Sun..6=Sat) for a YYYY-MM-DD date string, in studio wall clock.
export function dayOfWeekForDate(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// 540 -> "09:00"
export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// "09:00" -> 540. Returns null when invalid.
export function hhmmToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

// Format a stored UTC instant back to studio wall-clock "18:00".
export function formatTime(date: Date): string {
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(
    date.getUTCMinutes(),
  ).padStart(2, "0")}`;
}

// Format a stored UTC instant to "Thu 2 Jul 2026".
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(date: Date): string {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

// Today's date as YYYY-MM-DD (studio wall clock ≈ server clock for v1).
export function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// YYYY-MM-DD for `daysFromToday` ahead.
export function dateStrOffset(daysFromToday: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}
