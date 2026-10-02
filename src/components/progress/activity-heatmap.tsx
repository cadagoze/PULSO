"use client";

import type { CSSProperties } from "react";
import { activityGrid, type HeatDay } from "@/lib/analytics";
import { localDateKey } from "@/lib/utils";
import type { WorkoutEntry } from "@/types";

const WEEKS = 16;
const dayLetters = ["L", "M", "M", "J", "V", "S", "D"];

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

/** Constancia de las últimas 16 semanas: una columna por semana, de lunes a domingo; más series, más intenso. */
export function ActivityHeatmap({ workouts, now }: { workouts: WorkoutEntry[]; now: Date }) {
  const grid = activityGrid(workouts, WEEKS, now);
  const months = monthLabels(grid);
  const today = localDateKey(now);
  const activeDays = grid.flat().filter((day) => day.sessions > 0).length;

  return (
    <figure className="prog-heat-figure">
      <div className="prog-heat" style={{ "--weeks": WEEKS } as CSSProperties}>
        <span aria-hidden="true" />
        {months.map((month, index) => (
          <span key={`m-${index}`} className="prog-heat-month" aria-hidden="true">{month}</span>
        ))}
        {dayLetters.map((letter, row) => (
          <HeatRow key={row} letter={letter} days={grid.map((week) => week[row])} today={today} />
        ))}
      </div>
      <figcaption className="prog-heat-caption">
        <span><b className="num">{activeDays}</b> {activeDays === 1 ? "día activo" : "días activos"} en {WEEKS} semanas</span>
        <span className="prog-heat-legend" aria-hidden="true">
          Menos
          {[0, 1, 2, 3, 4].map((value) => <i key={value} className={`prog-heat-cell l${value}`} />)}
          Más
        </span>
      </figcaption>
    </figure>
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
