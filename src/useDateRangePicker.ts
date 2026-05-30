import { useCallback, useMemo, useState } from "react";
import { addDays, addMonths, buildMonthGrid, isAfter, isBefore, startOfDay, startOfMonth } from "./date-utils";
import { makeKeyHandler, useCalendarNav } from "./internal";
import type { DayCell, MonthView, WeekStart } from "./types";

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export interface RangePreset {
  key: string;
  label: string;
  getValue: (today: Date) => DateRange;
}

const day = (t: Date) => startOfDay(t);

/** Ready-made presets you can reference by key or extend with your own. */
export const builtinPresets: Record<string, RangePreset> = {
  today: { key: "today", label: "Today", getValue: (t) => ({ start: day(t), end: day(t) }) },
  last7: { key: "last7", label: "Last 7 days", getValue: (t) => ({ start: addDays(t, -6), end: day(t) }) },
  last30: { key: "last30", label: "Last 30 days", getValue: (t) => ({ start: addDays(t, -29), end: day(t) }) },
  thisWeek: {
    key: "thisWeek",
    label: "This week",
    getValue: (t) => ({ start: addDays(t, -t.getDay()), end: addDays(t, 6 - t.getDay()) }),
  },
  thisMonth: {
    key: "thisMonth",
    label: "This month",
    getValue: (t) => ({ start: startOfMonth(t), end: addDays(addMonths(t, 1), -1) }),
  },
  thisYear: {
    key: "thisYear",
    label: "This year",
    getValue: (t) => ({ start: new Date(t.getFullYear(), 0, 1), end: new Date(t.getFullYear(), 11, 31) }),
  },
};

export interface DateRangePickerOptions {
  value?: DateRange;
  defaultValue?: DateRange;
  onChange?: (range: DateRange) => void;
  min?: Date;
  max?: Date;
  locale?: string;
  weekStartsOn?: WeekStart;
  /** Presets to expose: built-in keys, custom objects, or a mix. */
  presets?: (keyof typeof builtinPresets | RangePreset)[];
}

const EMPTY: DateRange = { start: null, end: null };

/**
 * Headless date-range picker with hover/keyboard range preview and presets.
 * Returns state plus ARIA prop-getters; renders no DOM of its own.
 */
export function useDateRangePicker(options: DateRangePickerOptions = {}) {
  const { value: controlled, defaultValue = EMPTY, onChange, min, max, locale, weekStartsOn = 0, presets } = options;

  const [internal, setInternal] = useState<DateRange>(defaultValue);
  const range = controlled ?? internal;
  const [hovered, setHovered] = useState<Date | null>(null);

  const nav = useCalendarNav(range.start ?? new Date());
  const dayLabelFmt = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "full" }), [locale]);

  const isDisabled = useCallback(
    (d: Date) => (!!min && isBefore(d, min)) || (!!max && isAfter(d, max)),
    [min, max]
  );

  const commit = useCallback(
    (next: DateRange) => {
      if (controlled === undefined) setInternal(next);
      onChange?.(next);
    },
    [controlled, onChange]
  );

  const select = useCallback(
    (d: Date) => {
      if (isDisabled(d)) return;
      const picked = startOfDay(d);
      if (!range.start || range.end) {
        commit({ start: picked, end: null });
      } else {
        const [start, end] = isBefore(picked, range.start) ? [picked, range.start] : [range.start, picked];
        commit({ start, end });
        setHovered(null);
      }
    },
    [commit, isDisabled, range]
  );

  const resolved = useMemo<RangePreset[]>(
    () =>
      (presets ?? ["today", "last7", "last30", "thisMonth"])
        .map((p) => (typeof p === "string" ? builtinPresets[p] : p))
        .filter(Boolean) as RangePreset[],
    [presets]
  );

  const applyPreset = useCallback(
    (key: string) => {
      const preset = resolved.find((p) => p.key === key);
      if (!preset) return;
      const v = preset.getValue(startOfDay(new Date()));
      commit(v);
      if (v.start) nav.moveFocus(v.start);
    },
    [resolved, commit, nav]
  );

  // While picking the second endpoint, preview follows the mouse or keyboard focus.
  const preview = range.start && !range.end ? hovered ?? nav.focusedDate : null;

  const month: MonthView = buildMonthGrid({
    viewDate: nav.viewDate,
    focusedDate: nav.focusedDate,
    today: new Date(),
    weekStartsOn,
    locale,
    selection: { type: "range", start: range.start, end: range.end, preview },
    isDisabled,
  });

  const onKeyDown = makeKeyHandler(nav.focusedDate, nav.moveFocus, select, weekStartsOn);

  return {
    range,
    setRange: commit,
    presets: resolved.map(({ key, label }) => ({ key, label })),
    applyPreset,
    month,
    goToNextMonth: nav.goToNextMonth,
    goToPrevMonth: nav.goToPrevMonth,
    getGridProps: () => ({
      role: "grid" as const,
      "aria-label": month.label,
      "aria-multiselectable": true,
      onKeyDown,
      onMouseLeave: () => setHovered(null),
    }),
    getDayProps: (d: DayCell) => ({
      role: "gridcell" as const,
      type: "button" as const,
      "aria-label": dayLabelFmt.format(d.date),
      "aria-selected": d.isSelected || d.isInRange,
      "aria-current": d.isToday ? ("date" as const) : undefined,
      "aria-disabled": d.isDisabled || undefined,
      disabled: d.isDisabled,
      tabIndex: d.isFocused ? 0 : -1,
      ref: (el: HTMLElement | null) => {
        if (d.isFocused) nav.focusedRef.current = el;
      },
      onClick: () => select(d.date),
      onMouseEnter: () => {
        if (range.start && !range.end) setHovered(d.date);
      },
    }),
    prevButtonProps: { type: "button" as const, "aria-label": "Previous month", onClick: nav.goToPrevMonth },
    nextButtonProps: { type: "button" as const, "aria-label": "Next month", onClick: nav.goToNextMonth },
  };
}
