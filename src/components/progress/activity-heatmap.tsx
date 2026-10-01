"use client";

import { activityGrid, type HeatDay } from "@/lib/analytics";
import { localDateKey } from "@/lib/utils";
import type { WorkoutEntry } from "@/types";

const WEEKS = 16;
const dayLetters = ["L", "M", "X", "J", "V", "S", "D"];

function level(sets: number) {
  if (sets <= 0) return 0;
  if (sets < 9) return 1;
  if (sets < 15) return 2;
  if (sets < 21) return 3;
  return 4;
}

function cellText(day: HeatDay) {
  const date = new Date(`${day.date}T12:00:00`).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
  if (day.future) return `${date}: próximamente`;
  if (!day.sessions) return `${date}: sin entrenamiento`;
  const sessions = day.sessions === 1 ? "1 sesión" : `${day.sessions} sesiones`;
  return `${date}: ${sessions}, ${day.sets} series`;
}

function monthLabels(grid: HeatDay[][]) {
  return grid.map((week, index) => {
    const month = week[0].date.slice(0, 7);
    const previous = index > 0 ? grid[index - 1][0].date.slice(0, 7) : "";
    if (month === previous) return "";
    return new Date(`${week[0].date}T12:00:00`).toLocaleDateString("es-CL", { month: "short" }).replace(".", "");
  });
}

export function ActivityHeatmap({ workouts, now }: { workouts: WorkoutEntry[]; now: Date }) {
  const grid = activityGrid(workouts, WEEKS, now);
  const months = monthLabels(grid);
  const today = localDateKey(now);
  const activeDays = grid.flat().filter((day) => day.sessions > 0).length;

  return (
    <section className="card prog-heat-card" aria-labelledby="prog-heat-title">
      <div className="prog-card-head">
        <div>
          <h2 id="prog-heat-title">Actividad</h2>
          <p className="muted prog-card-sub">
            <span className="num">{activeDays}</span> {activeDays === 1 ? "día activo" : "días activos"} en {WEEKS} semanas
          </p>
        </div>
      </div>
      <div className="prog-heat" style={{ gridTemplateColumns: `14px repeat(${WEEKS}, minmax(0, 1fr))` }}>
        <span aria-hidden="true" />
        {months.map((month, index) => (
          <span key={`m-${index}`} className="prog-heat-month" aria-hidden="true">{month}</span>
        ))}
        {dayLetters.map((letter, row) => (
          <HeatRow key={letter} letter={letter} days={grid.map((week) => week[row])} today={today} />
        ))}
      </div>
      <div className="prog-heat-legend" aria-hidden="true">
        <span>Menos</span>
        {[0, 1, 2, 3, 4].map((value) => (
          <i key={value} className={`prog-heat-cell l${value}`} />
        ))}
        <span>Más series</span>
      </div>
    </section>
  );
}

function HeatRow({ letter, days, today }: { letter: string; days: HeatDay[]; today: string }) {
  return (
    <>
      <span className="prog-heat-day" aria-hidden="true">{letter}</span>
      {days.map((day) => {
        const text = cellText(day);
        const classes = ["prog-heat-cell", `l${level(day.sets)}`, day.future ? "future" : "", day.date === today ? "today" : ""];
        return <span key={day.date} className={classes.join(" ")} role="img" aria-label={text} title={text} />;
      })}
    </>
  );
}
