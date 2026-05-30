export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** A single day cell in the calendar grid, with all selection/state flags resolved. */
export interface DayCell {
  /** The date this cell represents (local midnight). */
  date: Date;
  /** Day-of-month number, 1–31. */
  label: number;
  /** Stable ISO key, `YYYY-MM-DD`. Great for React keys. */
  key: string;
  /** Whether the day belongs to the currently displayed month. */
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isInRange: boolean;
  isDisabled: boolean;
  /** The roving-tabindex target. Exactly one cell is focused at a time. */
  isFocused: boolean;
}

/** A fully built month view: label, weekday headers and a stable 6×7 grid. */
export interface MonthView {
  /** Localized month + year, e.g. `"May 2026"`. */
  label: string;
  /** First day of the visible month. */
  date: Date;
  /** Always 6 rows × 7 days for layout stability. */
  weeks: DayCell[][];
  /** Localized weekday headers in display order. */
  weekdays: string[];
}
