import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSunday } from "date-fns";

export function getSundaysInMonth(year: number, month: number): string[] {
  const start = startOfMonth(new Date(year, month));
  const end = endOfMonth(new Date(year, month));
  return eachDayOfInterval({ start, end })
    .filter(isSunday)
    .map((d) => format(d, "yyyy-MM-dd"));
}

export function formatDate(dateStr: string) {
  if (!dateStr) return "";
  return format(new Date(dateStr + "T00:00:00"), "dd MMM yyyy");
}

export function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

export function currentMonthStr() {
  return format(new Date(), "yyyy-MM");
}
