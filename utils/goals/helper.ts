import { startOfWeek, startOfMonth, addWeeks, addMonths, isWithinInterval } from "date-fns";

// 📆 Prüft, ob ein Datum in der nächsten Woche liegt
export function isNextWeek(date: Date): boolean {
  const nextWeekStart = startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 });
  const nextWeekEnd = startOfWeek(addWeeks(new Date(), 2), { weekStartsOn: 1 });
  return isWithinInterval(date, { start: nextWeekStart, end: nextWeekEnd });
}

// 📅 Prüft, ob ein Datum im nächsten Monat liegt
export function isNextMonth(date: Date): boolean {
  const nextMonthStart = startOfMonth(addMonths(new Date(), 1));
  const nextMonthEnd = startOfMonth(addMonths(new Date(), 2));
  return isWithinInterval(date, { start: nextMonthStart, end: nextMonthEnd });
}
