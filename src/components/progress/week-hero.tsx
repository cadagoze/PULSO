"use client";

import { weekRange } from "@/lib/analytics";
import { formatShortDate } from "@/lib/utils";
import { signed, volumeLabel, type Unit } from "@/components/progress/format";
import type { WorkoutEntry } from "@/types";

interface WeekTotals {
  sessions: number;
  sets: number;
  volume: number;
  minutes: number;
}

function totalsFor(workouts: WorkoutEntry[], start: string, end: string): WeekTotals {
  const items = workouts.filter((workout) => workout.date >= start && workout.date <= end);
  return {
    sessions: items.length,
    sets: items.reduce((sum, item) => sum + item.sets, 0),
    volume: items.reduce((sum, item) => sum + (item.volume ?? 0), 0),
    minutes: Math.round(items.reduce((sum, item) => sum + item.durationMinutes, 0)),
  };
}

export function WeekHero({ workouts, now, unit }: { workouts: WorkoutEntry[]; now: Date; unit: Unit }) {
  const current = weekRange(now, 0);
  const previous = weekRange(now, -1);
  const thisWeek = totalsFor(workouts, current.start, current.end);
  const lastWeek = totalsFor(workouts, previous.start, previous.end);
  const integer = (value: number) => Math.round(value).toLocaleString("es-CL");

  const metrics = [
    { key: "sessions", label: "Sesiones", value: integer(thisWeek.sessions), delta: thisWeek.sessions - lastWeek.sessions, format: integer },
    { key: "sets", label: "Series", value: integer(thisWeek.sets), delta: thisWeek.sets - lastWeek.sets, format: integer },
    { key: "volume", label: "Volumen", value: volumeLabel(thisWeek.volume, unit), delta: thisWeek.volume - lastWeek.volume, format: (v: number) => volumeLabel(v, unit) },
    { key: "minutes", label: "Minutos", value: integer(thisWeek.minutes), delta: thisWeek.minutes - lastWeek.minutes, format: integer },
  ];

  return (
    <section className="card card-l card-forest prog-hero" aria-labelledby="prog-hero-title">
      <div className="prog-hero-head">
        <p className="eyebrow">Esta semana</p>
        <h2 id="prog-hero-title">
          {formatShortDate(current.start)} – {formatShortDate(current.end)}
        </h2>
        <p className="prog-hero-sub">Comparado con la semana pasada</p>
      </div>
      <dl className="prog-hero-metrics">
        {metrics.map((metric) => (
          <div key={metric.key} className="prog-hero-metric">
            <dt>{metric.label}</dt>
            <dd className="num">{metric.value}</dd>
            <dd className={`prog-delta ${metric.delta > 0 ? "up" : metric.delta < 0 ? "down" : "flat"}`}>
              <span className="num">{signed(metric.delta, metric.format)}</span>
              <span className="sr-only"> frente a la semana pasada</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
