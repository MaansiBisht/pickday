import { useDateRangePicker } from "../../src";

const fmt = (d: Date | null) =>
  d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";

export function App() {
  const {
    range, presets, applyPreset, month,
    getGridProps, getDayProps, prevButtonProps, nextButtonProps,
  } = useDateRangePicker({
    presets: ["today", "last7", "last30", "thisMonth"],
    weekStartsOn: 1,
  });

  return (
    <div className="wrap">
      <div className="card">
        <div className="presets">
          <span className="presets__title">Quick ranges</span>
          {presets.map((p) => (
            <button key={p.key} className="preset" onClick={() => applyPreset(p.key)}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="cal">
          <header className="cal__head">
            <button className="nav" {...prevButtonProps}>‹</button>
            <strong>{month.label}</strong>
            <button className="nav" {...nextButtonProps}>›</button>
          </header>

          <div {...getGridProps()} className="grid">
            <div role="row" className="row row--head">
              {month.weekdays.map((wd) => (
                <span role="columnheader" key={wd} className="wd">{wd}</span>
              ))}
            </div>
            {month.weeks.map((week, i) => (
              <div role="row" className="row" key={i}>
                {week.map((day) => (
                  <button
                    key={day.key}
                    {...getDayProps(day)}
                    className="day"
                    data-selected={day.isSelected || undefined}
                    data-in-range={day.isInRange || undefined}
                    data-start={day.isRangeStart || undefined}
                    data-end={day.isRangeEnd || undefined}
                    data-today={day.isToday || undefined}
                    data-outside={!day.isCurrentMonth || undefined}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <footer className="sel">
            <span>{fmt(range.start)}</span>
            <span className="sel__arrow">→</span>
            <span>{fmt(range.end)}</span>
          </footer>
        </div>
      </div>
      <p className="tag">pickday — headless date &amp; range picker hooks for React</p>
    </div>
  );
}
