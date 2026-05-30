import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonthsKeepDay,
  buildMonthGrid,
  isWithin,
  weekdayLabels,
} from "../src/date-utils";

const mid = (y: number, m: number, d: number) => new Date(y, m, d);

describe("date utils", () => {
  it("addDays crosses month boundaries", () => {
    expect(addDays(mid(2026, 0, 31), 1)).toEqual(mid(2026, 1, 1));
  });

  it("addMonthsKeepDay clamps to month length", () => {
    // Jan 31 + 1 month -> Feb 28 (2026 is not a leap year)
    expect(addMonthsKeepDay(mid(2026, 0, 31), 1)).toEqual(mid(2026, 1, 28));
  });

  it("isWithin is inclusive and order-agnostic", () => {
    expect(isWithin(mid(2026, 4, 10), mid(2026, 4, 5), mid(2026, 4, 15))).toBe(true);
    expect(isWithin(mid(2026, 4, 10), mid(2026, 4, 15), mid(2026, 4, 5))).toBe(true);
    expect(isWithin(mid(2026, 4, 5), mid(2026, 4, 5), mid(2026, 4, 5))).toBe(true);
    expect(isWithin(mid(2026, 4, 16), mid(2026, 4, 5), mid(2026, 4, 15))).toBe(false);
  });

  it("weekdayLabels respects weekStartsOn", () => {
    const sun = weekdayLabels("en-US", 0);
    const mon = weekdayLabels("en-US", 1);
    expect(sun).toHaveLength(7);
    expect(mon[0]).toBe(sun[1]); // Monday-first shifts by one
  });
});

describe("buildMonthGrid", () => {
  const base = {
    viewDate: mid(2026, 4, 15), // May 2026
    focusedDate: mid(2026, 4, 15),
    today: mid(2026, 4, 30),
    weekStartsOn: 0 as const,
    locale: "en-US",
  };

  it("always returns a stable 6×7 grid", () => {
    const m = buildMonthGrid({ ...base, selection: { type: "single", value: null } });
    expect(m.weeks).toHaveLength(6);
    m.weeks.forEach((w) => expect(w).toHaveLength(7));
    expect(m.label).toBe("May 2026");
  });

  it("flags today, focus and current-month membership", () => {
    const m = buildMonthGrid({ ...base, selection: { type: "single", value: null } });
    const flat = m.weeks.flat();
    expect(flat.filter((d) => d.isFocused)).toHaveLength(1);
    expect(flat.find((d) => d.isToday)?.label).toBe(30);
    expect(flat.filter((d) => d.isCurrentMonth)).toHaveLength(31); // May has 31 days
  });

  it("marks single selection", () => {
    const m = buildMonthGrid({
      ...base,
      selection: { type: "single", value: mid(2026, 4, 15) },
    });
    expect(m.weeks.flat().find((d) => d.isSelected)?.label).toBe(15);
  });

  it("marks range with start/end and in-between days", () => {
    const m = buildMonthGrid({
      ...base,
      selection: { type: "range", start: mid(2026, 4, 10), end: mid(2026, 4, 14), preview: null },
    });
    const flat = m.weeks.flat();
    expect(flat.find((d) => d.isRangeStart)?.label).toBe(10);
    expect(flat.find((d) => d.isRangeEnd)?.label).toBe(14);
    expect(flat.filter((d) => d.isInRange && d.isCurrentMonth)).toHaveLength(5); // 10..14
  });

  it("previews the range while picking the second endpoint", () => {
    const m = buildMonthGrid({
      ...base,
      selection: { type: "range", start: mid(2026, 4, 10), end: null, preview: mid(2026, 4, 12) },
    });
    expect(m.weeks.flat().filter((d) => d.isInRange && d.isCurrentMonth)).toHaveLength(3); // 10..12
  });

  it("disables days via predicate", () => {
    const m = buildMonthGrid({
      ...base,
      selection: { type: "single", value: null },
      isDisabled: (d) => d.getDate() < 15,
    });
    expect(m.weeks.flat().some((d) => d.isCurrentMonth && d.label === 14 && d.isDisabled)).toBe(true);
    expect(m.weeks.flat().some((d) => d.isCurrentMonth && d.label === 15 && !d.isDisabled)).toBe(true);
  });
});
