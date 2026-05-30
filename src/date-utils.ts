import type { DayCell, MonthView, WeekStart } from "./types";

export const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Returns the first day of the month `n` months away from `d`. */
export const addMonths = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth() + n, 1);

/** Adds `n` months while preserving the day-of-month (clamped to month length). */
export const addMonthsKeepDay = (d: Date, n: number) => {
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const daysInMonth = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  return new Date(t.getFullYear(), t.getMonth(), Math.min(d.getDate(), daysInMonth));
};

export const startOfMonth = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), 1);

export const isBefore = (a: Date, b: Date) =>
  startOfDay(a).getTime() < startOfDay(b).getTime();

export const isAfter = (a: Date, b: Date) =>
  startOfDay(a).getTime() > startOfDay(b).getTime();

export const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

/** Inclusive range test that tolerates start/end being out of order. */
export const isWithin = (d: Date, start: Date, end: Date) => {
  const t = startOfDay(d).getTime();
  const lo = Math.min(startOfDay(start).getTime(), startOfDay(end).getTime());
  const hi = Math.max(startOfDay(start).getTime(), startOfDay(end).getTime());
  return t >= lo && t <= hi;
};

export function weekdayLabels(
  locale: string | undefined,
  weekStartsOn: WeekStart
): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const base = new Date(2023, 0, 1); // a Sunday
  return Array.from({ length: 7 }, (_, i) =>
    fmt.format(addDays(base, (i + weekStartsOn) % 7))
  );
}

export type Selection =
  | { type: "single"; value: Date | null }
  | { type: "range"; start: Date | null; end: Date | null; preview: Date | null };

export interface GridParams {
  viewDate: Date;
  focusedDate: Date;
  today: Date;
  weekStartsOn: WeekStart;
  locale?: string;
  selection: Selection;
  isDisabled?: (date: Date) => boolean;
}

/** Pure: builds a stable 6×7 month grid with all state flags resolved. */
export function buildMonthGrid(p: GridParams): MonthView {
  const first = startOfMonth(p.viewDate);
  const offset = (first.getDay() - p.weekStartsOn + 7) % 7;
  const gridStart = addDays(first, -offset);

  const weeks: DayCell[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      row.push(decorate(addDays(gridStart, w * 7 + d), first, p));
    }
    weeks.push(row);
  }

  return {
    label: new Intl.DateTimeFormat(p.locale, {
      month: "long",
      year: "numeric",
    }).format(first),
    date: first,
    weeks,
    weekdays: weekdayLabels(p.locale, p.weekStartsOn),
  };
}

function decorate(date: Date, monthStart: Date, p: GridParams): DayCell {
  const s = p.selection;
  let isSelected = false;
  let isRangeStart = false;
  let isRangeEnd = false;
  let isInRange = false;

  if (s.type === "single") {
    isSelected = !!s.value && isSameDay(date, s.value);
  } else {
    const end = s.end ?? s.preview;
    isRangeStart = !!s.start && isSameDay(date, s.start);
    isRangeEnd = !!s.end && isSameDay(date, s.end);
    if (s.start && end) isInRange = isWithin(date, s.start, end);
    isSelected = isRangeStart || isRangeEnd;
  }

  return {
    date,
    label: date.getDate(),
    key: toKey(date),
    isCurrentMonth: date.getMonth() === monthStart.getMonth(),
    isToday: isSameDay(date, p.today),
    isSelected,
    isRangeStart,
    isRangeEnd,
    isInRange,
    isDisabled: p.isDisabled ? p.isDisabled(date) : false,
    isFocused: isSameDay(date, p.focusedDate),
  };
}
