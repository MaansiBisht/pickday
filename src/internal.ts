import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { addDays, addMonths, addMonthsKeepDay, startOfDay, startOfMonth } from "./date-utils";
import type { WeekStart } from "./types";

/** Manages the visible month, the roving-focus date, and focus restoration. */
export function useCalendarNav(initial: Date) {
  const [viewDate, setViewDate] = useState(() => startOfMonth(initial));
  const [focusedDate, setFocusedDate] = useState(() => startOfDay(initial));
  const focusedRef = useRef<HTMLElement | null>(null);
  const pendingFocus = useRef(false);

  useEffect(() => {
    if (pendingFocus.current && focusedRef.current) {
      focusedRef.current.focus();
      pendingFocus.current = false;
    }
  });

  const moveFocus = useCallback((date: Date) => {
    pendingFocus.current = true;
    setFocusedDate(startOfDay(date));
    setViewDate((v) =>
      v.getMonth() === date.getMonth() && v.getFullYear() === date.getFullYear()
        ? v
        : startOfMonth(date)
    );
  }, []);

  const goToNextMonth = useCallback(() => setViewDate((v) => addMonths(v, 1)), []);
  const goToPrevMonth = useCallback(() => setViewDate((v) => addMonths(v, -1)), []);

  return { viewDate, focusedDate, moveFocus, focusedRef, goToNextMonth, goToPrevMonth };
}

/** Builds the WAI-ARIA grid keyboard handler shared by both pickers. */
export function makeKeyHandler(
  focusedDate: Date,
  moveFocus: (d: Date) => void,
  onSelect: (d: Date) => void,
  weekStartsOn: WeekStart
) {
  const colOffset = (focusedDate.getDay() - weekStartsOn + 7) % 7;
  return (e: KeyboardEvent) => {
    let next: Date | null = null;
    switch (e.key) {
      case "ArrowLeft": next = addDays(focusedDate, -1); break;
      case "ArrowRight": next = addDays(focusedDate, 1); break;
      case "ArrowUp": next = addDays(focusedDate, -7); break;
      case "ArrowDown": next = addDays(focusedDate, 7); break;
      case "Home": next = addDays(focusedDate, -colOffset); break;
      case "End": next = addDays(focusedDate, 6 - colOffset); break;
      case "PageUp": next = addMonthsKeepDay(focusedDate, -1); break;
      case "PageDown": next = addMonthsKeepDay(focusedDate, 1); break;
      case "Enter":
      case " ":
        e.preventDefault();
        onSelect(focusedDate);
        return;
      default:
        return;
    }
    e.preventDefault();
    moveFocus(next);
  };
}
