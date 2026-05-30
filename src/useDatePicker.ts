import { useCallback, useMemo, useState } from "react";
import { buildMonthGrid, isAfter, isBefore, startOfDay } from "./date-utils";
import { makeKeyHandler, useCalendarNav } from "./internal";
import type { DayCell, MonthView, WeekStart } from "./types";

export interface DatePickerOptions {
  /** Controlled value. Omit for uncontrolled usage. */
  value?: Date | null;
  defaultValue?: Date | null;
  onChange?: (date: Date) => void;
  /** Earliest selectable day (inclusive). */
  min?: Date;
  /** Latest selectable day (inclusive). */
  max?: Date;
  /** BCP-47 locale for labels, e.g. `"en-US"`, `"fr-FR"`. */
  locale?: string;
  /** 0 = Sunday (default) … 6 = Saturday. */
  weekStartsOn?: WeekStart;
}

/**
 * Headless single-date picker. Returns state plus ARIA prop-getters you spread
 * onto your own elements. The hook never renders DOM.
 */
export function useDatePicker(options: DatePickerOptions = {}) {
  const { value: controlled, defaultValue = null, onChange, min, max, locale, weekStartsOn = 0 } = options;

  const [internal, setInternal] = useState<Date | null>(defaultValue);
  const value = controlled !== undefined ? controlled : internal;

  const nav = useCalendarNav(value ?? new Date());
  const dayLabelFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "full" }),
    [locale]
  );

  const isDisabled = useCallback(
    (d: Date) => (!!min && isBefore(d, min)) || (!!max && isAfter(d, max)),
    [min, max]
  );

  const select = useCallback(
    (d: Date) => {
      if (isDisabled(d)) return;
      const day = startOfDay(d);
      if (controlled === undefined) setInternal(day);
      onChange?.(day);
    },
    [controlled, isDisabled, onChange]
  );

  const month: MonthView = buildMonthGrid({
    viewDate: nav.viewDate,
    focusedDate: nav.focusedDate,
    today: new Date(),
    weekStartsOn,
    locale,
    selection: { type: "single", value },
    isDisabled,
  });

  const onKeyDown = makeKeyHandler(nav.focusedDate, nav.moveFocus, select, weekStartsOn);

  return {
    value,
    setValue: select,
    month,
    goToNextMonth: nav.goToNextMonth,
    goToPrevMonth: nav.goToPrevMonth,
    getGridProps: () => ({ role: "grid" as const, "aria-label": month.label, onKeyDown }),
    getDayProps: (day: DayCell) => ({
      role: "gridcell" as const,
      type: "button" as const,
      "aria-label": dayLabelFmt.format(day.date),
      "aria-selected": day.isSelected,
      "aria-current": day.isToday ? ("date" as const) : undefined,
      "aria-disabled": day.isDisabled || undefined,
      disabled: day.isDisabled,
      tabIndex: day.isFocused ? 0 : -1,
      ref: (el: HTMLElement | null) => {
        if (day.isFocused) nav.focusedRef.current = el;
      },
      onClick: () => select(day.date),
    }),
    prevButtonProps: { type: "button" as const, "aria-label": "Previous month", onClick: nav.goToPrevMonth },
    nextButtonProps: { type: "button" as const, "aria-label": "Next month", onClick: nav.goToNextMonth },
  };
}
