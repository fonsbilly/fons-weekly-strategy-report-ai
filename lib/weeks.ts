import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { startOfWeek, format } from "date-fns";

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

// Monday (YYYY-MM-DD) of the week containing `now`, in the org's timezone. Directors submit
// by Thursday of this same week, recapping what happened during it.
export function getWeekStart(now: Date, timeZone: string): string {
  const zoned = toZonedTime(now, timeZone);
  const monday = startOfWeek(zoned, { weekStartsOn: 1 });
  return format(monday, "yyyy-MM-dd");
}

function computeDeadline(
  weekStart: string,
  deadlineDay: string,
  deadlineTime: string,
  timeZone: string
): Date {
  const dayOffset = DAY_INDEX[deadlineDay.toLowerCase()] - 1; // offset from Monday

  // Date-only arithmetic in UTC to land on the deadline's calendar date (no DST/offset skew).
  const [y, m, d] = weekStart.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + dayOffset);

  const yyyy = base.getUTCFullYear();
  const mo = String(base.getUTCMonth() + 1).padStart(2, "0");
  const da = String(base.getUTCDate()).padStart(2, "0");
  const [hh, mi, ss] = deadlineTime.split(":");

  // Interpret this wall-clock time AS the org's timezone, then get the real UTC instant.
  const wall = `${yyyy}-${mo}-${da}T${(hh ?? "23").padStart(2, "0")}:${(mi ?? "59").padStart(
    2,
    "0"
  )}:${(ss ?? "00").padStart(2, "0")}`;
  return fromZonedTime(wall, timeZone);
}

export function isLate(
  submittedAt: Date,
  weekStart: string,
  deadlineDay: string,
  deadlineTime: string,
  timeZone: string
): boolean {
  const deadline = computeDeadline(weekStart, deadlineDay, deadlineTime, timeZone);
  return submittedAt.getTime() > deadline.getTime();
}
