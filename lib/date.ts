/**
 * "YYYY-MM-DD" keys are used everywhere (Firestore doc ids, query bounds)
 * because they sort lexicographically the same as chronologically — that's
 * what lets HistoryView/Calendar do a single range query per month instead
 * of a composite index or per-habit reads.
 */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

/** Grid cells for a month: null = leading blank so day 1 lines up under
 * the correct weekday column (Sunday-first, matching the SwiftUI version). */
export function daysInMonthGrid(month: Date): (Date | null)[] {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstOfMonth = new Date(year, m, 1);
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay(); // 0 = Sunday

  const cells: (Date | null)[] = Array(leadingBlanks).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, m, day));
  }
  return cells;
}
