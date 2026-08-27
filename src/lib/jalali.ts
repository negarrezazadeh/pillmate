import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from 'date-fns-jalali';

/** Saturday. date-fns counts from Sunday = 0. */
const WEEK_STARTS_ON = 6;

export const JALALI_WEEKDAY_LABELS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export function getJalaliWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
}

export function getJalaliMonthStart(date: Date): Date {
  return startOfMonth(date);
}

export function getJalaliWeek(date: Date): Date[] {
  return eachDayOfInterval({
    start: getJalaliWeekStart(date),
    end: endOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }),
  });
}

/** Includes leading and trailing days, so always a multiple of seven. */
export function getJalaliMonthGrid(date: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(date), { weekStartsOn: WEEK_STARTS_ON }),
    end: endOfWeek(endOfMonth(date), { weekStartsOn: WEEK_STARTS_ON }),
  });
}
