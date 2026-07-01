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
  const [hh, mm, ss] = deadlineTime.split(":").map(Number);

  const mondayZoned = toZonedTime(`${weekStart}T00:00:00`, timeZone);
  const deadlineZoned = new Date(mondayZoned);
  deadlineZoned.setDate(deadlineZoned.getDate() + dayOffset);
  deadlineZoned.setHours(hh, mm, ss || 0, 0);

  return fromZonedTime(deadlineZoned, timeZone);
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
