"use client";

import { useMemo } from "react";
import { Sparkles, TrendingUp } from "lucide-react";
import { ProgressChart } from "@/components/library/progress-chart";
import { estimateOneRepMax, exerciseBests, suggestNext } from "@/lib/progression";
import { isWorkingSet, lastRecordFor, sortedWorkouts } from "@/lib/training";
import { useSettings, useWorkouts } from "@/lib/store";
import { formatNumber, formatShortDate, toDisplayWeight } from "@/lib/utils";
import type { Exercise, ExerciseRecord, WorkoutEntry } from "@/types";

type Unit = "kg" | "lb";

interface RecentSession {
  workout: WorkoutEntry;
  record: ExerciseRecord;
}

function recentSessions(workouts: WorkoutEntry[], exerciseId: number, limit: number): RecentSession[] {
  const result: RecentSession[] = [];
  for (const workout of sortedWorkouts(workouts)) {
    const record = workout.records?.find((item) => item.exerciseId === exerciseId && item.sets.some((set) => set.done));
    if (record) result.push({ workout, record });
    if (result.length === limit) break;
  }
  return result;
}

/** "16 kg × 8 · 16 × 8 · 18 × 6", "10 · 10 · 8 rep." o "30 s · 30 s". */
function setsLine(record: ExerciseRecord, unit: Unit) {
  const sets = record.sets.filter((set) => set.done && isWorkingSet(set));
  if (!sets.length) return "Sin series de trabajo";
  if (record.unit === "seconds") return sets.map((set) => `${set.value} s`).join(" · ");
  if (sets.every((set) => set.load <= 0)) return `${sets.map((set) => set.value).join(" · ")} rep.`;
  return sets
    .map((set, index) => {
      const load = set.load > 0 ? formatNumber(toDisplayWeight(set.load, unit)) : "PC";
      return `${load}${index === 0 && set.load > 0 ? ` ${unit}` : ""} × ${set.value}`;
    })
    .join(" · ");
}

function bestSetE1rm(record: ExerciseRecord) {
  if (record.unit !== "reps") return 0;
  return Math.max(0, ...record.sets.filter((set) => set.done && isWorkingSet(set)).map((set) => estimateOneRepMax(set.load, set.value, set.rir)));
}

export function ExerciseProgress({ exercise, onStart }: { exercise: Exercise; onStart: () => void }) {
  const [workouts] = useWorkouts();
  const [settings] = useSettings();
  const unit = settings.unit;
  const bests = useMemo(() => exerciseBests(workouts, exercise.id), [exercise.id, workouts]);
  const last = useMemo(() => lastRecordFor(workouts, exercise.id), [exercise.id, workouts]);
  const recent = useMemo(() => recentSessions(workouts, exercise.id, 5), [exercise.id, workouts]);
  const suggestion = suggestNext(exercise, last, unit, (kg) => toDisplayWeight(kg, unit));

  if (!bests.sessions.length) {
    return (
      <div className="lib-progress">
        <div className="lib-empty-progress">
          <span className="icon-tile"><TrendingUp size={20} /></span>
          <h3>Aún no registras este ejercicio</h3>
          <p className="muted">
            Cuando lo entrenes, aquí verás tus récords, la curva de progreso y qué intentar la próxima vez.
          </p>
          <p className="lib-empty-tip">{suggestion.message}</p>
          <button type="button" className="btn btn-primary" onClick={onStart}>Hacer mi primera sesión</button>
        </div>
      </div>
    );
  }

  const loaded = exercise.unit === "reps" && bests.load > 0;
  const kg = (value: number) => formatNumber(toDisplayWeight(value, unit));
  const chartData = bests.sessions.map((point) => ({
    label: formatShortDate(point.date),
    value: loaded ? toDisplayWeight(Math.round(point.e1rm * 10) / 10, unit) : point.topValue,
  }));
  const chartUnit = loaded ? unit : exercise.unit === "reps" ? "rep." : "s";
  const chartMetric = loaded ? "1RM estimado" : exercise.unit === "reps" ? "Mejor serie" : "Mayor tiempo";
  const first = chartData[0]?.value ?? 0;
  const latest = chartData[chartData.length - 1]?.value ?? 0;
  const delta = latest - first;

  const tiles: Array<{ label: string; value: string; unit?: string }> = loaded
    ? [
      { label: "1RM estimado", value: kg(bests.e1rm), unit },
      { label: "Mayor carga", value: kg(bests.load), unit },
      { label: "Más repeticiones", value: String(bests.reps), unit: "rep." },
      { label: "Mejor serie", value: kg(bests.volume), unit: `${unit} vol.` },
    ]
    : exercise.unit === "reps"
      ? [
        { label: "Más repeticiones", value: String(bests.reps), unit: "rep." },
        { label: "Sesiones", value: String(bests.sessions.length) },
        { label: "Series totales", value: String(bests.sessions.reduce((sum, point) => sum + point.sets, 0)) },
        { label: "Última vez", value: formatShortDate(bests.sessions[bests.sessions.length - 1].date) },
      ]
      : [
        { label: "Mayor tiempo", value: String(bests.seconds), unit: "s" },
        { label: "Sesiones", value: String(bests.sessions.length) },
        { label: "Series totales", value: String(bests.sessions.reduce((sum, point) => sum + point.sets, 0)) },
        { label: "Última vez", value: formatShortDate(bests.sessions[bests.sessions.length - 1].date) },
      ];

  return (
    <div className="lib-progress">
      <div className="lib-prs">
        {tiles.map((tile) => (
          <div key={tile.label} className="lib-pr">
            <span className="lib-pr-label">{tile.label}</span>
            <b className="num">
              {tile.value}
              {tile.unit && <small>{tile.unit}</small>}
            </b>
          </div>
        ))}
      </div>

      <section className="card lib-chart-card">
        <header className="lib-chart-head">
          <div>
            <p className="eyebrow">{chartMetric}</p>
            <p className="lib-chart-value num">
              {formatNumber(latest)} <small>{chartUnit}</small>
            </p>
          </div>
          {chartData.length > 1 && (
            <span className={delta >= 0 ? "badge" : "badge badge-muted"}>
              <span className="num">{delta >= 0 ? "+" : "−"}{formatNumber(Math.abs(delta))}</span>
              {` ${chartUnit} desde el inicio`}
            </span>
          )}
        </header>
        {chartData.length > 1 ? (
          <ProgressChart data={chartData} unit={chartUnit} metric={chartMetric} />
        ) : (
          <p className="subtle lib-chart-note">Con una sesión más verás aquí tu curva de progreso.</p>
        )}
      </section>

      <aside className="lib-next">
        <span className="lib-next-icon"><Sparkles size={18} /></span>
        <div>
          <p className="eyebrow">Próxima vez</p>
          <p>{suggestion.message}</p>
        </div>
      </aside>

      <section className="lib-history" aria-labelledby="lib-history-title">
        <h3 id="lib-history-title">Últimas sesiones</h3>
        <ol>
          {recent.map(({ workout, record }) => {
            const e1rm = bestSetE1rm(record);
            return (
              <li key={workout.id}>
                <div className="lib-history-date">
                  <b>{formatShortDate(workout.date)}</b>
                  <span>{workout.name ?? "Entrenamiento"}</span>
                </div>
                <p className="num lib-history-sets">{setsLine(record, unit)}</p>
                {loaded && e1rm > 0 && <span className="lib-history-e1rm num">1RM ≈ {kg(e1rm)} {unit}</span>}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
