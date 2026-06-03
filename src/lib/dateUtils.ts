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

export function getSundaysInQuarter(year: number, quarter: number): string[] {
  const startMonth = (quarter - 1) * 3;
  const start = startOfMonth(new Date(year, startMonth));
  const end = endOfMonth(new Date(year, startMonth + 2));
  return eachDayOfInterval({ start, end })
    .filter(isSunday)
    .map((d) => format(d, "yyyy-MM-dd"));
}

export function currentQuarter(): { year: number; quarter: number } {
  const now = new Date();
  return { year: now.getFullYear(), quarter: Math.floor(now.getMonth() / 3) + 1 };
}
