"use client";

import { useMemo } from "react";
import { Play, Sparkles, Trophy } from "lucide-react";
import { Button, NumberMetric } from "@/components/ui";
import { Card } from "@/components/ui/cards";
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

/** Mi progreso con este ejercicio: número protagonista, curva, mejores marcas, la próxima vez e historial. */
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
      <div className="lib-progress lib-progress-empty">
        <NumberMetric size="l" value={<span className="nmetric-soft">0</span>} label="sesiones con este ejercicio" />
        <div className="lib-progress-empty-text">
          <h3>Aún no registras este ejercicio</h3>
          <p>Cuando lo entrenes, aquí verás tus récords, la curva de progreso y qué intentar la próxima vez.</p>
        </div>
        <p className="lib-tip"><Sparkles size={16} aria-hidden="true" />{suggestion.message}</p>
        <Button variant="secondary" onClick={onStart}><Play size={17} fill="currentColor" aria-hidden="true" />Hacer mi primera sesión</Button>
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
  const sessionCount = bests.sessions.length;
  const lastDate = formatShortDate(bests.sessions[sessionCount - 1].date);
  const totalSets = bests.sessions.reduce((sum, point) => sum + point.sets, 0);

  const marks: Array<{ label: string; value: string; unit?: string }> = loaded
    ? [
      { label: "1RM estimado", value: kg(bests.e1rm), unit },
      { label: "Mayor carga", value: kg(bests.load), unit },
      { label: "Más repeticiones", value: String(bests.reps), unit: "rep." },
      { label: "Mejor serie", value: kg(bests.volume), unit: `${unit} vol.` },
    ]
    : exercise.unit === "reps"
      ? [
        { label: "Más repeticiones", value: String(bests.reps), unit: "rep." },
        { label: "Sesiones", value: String(sessionCount) },
        { label: "Series totales", value: String(totalSets) },
        { label: "Última vez", value: lastDate },
      ]
      : [
        { label: "Mayor tiempo", value: String(bests.seconds), unit: "s" },
        { label: "Sesiones", value: String(sessionCount) },
        { label: "Series totales", value: String(totalSets) },
        { label: "Última vez", value: lastDate },
      ];

  return (
    <div className="lib-progress">
      <section className="lib-progress-hero" aria-labelledby="lib-progress-metric">
        <p id="lib-progress-metric" className="meta">{chartMetric} · última sesión</p>
        <NumberMetric
          size="l"
          value={formatNumber(latest)}
          unit={chartUnit}
          label={chartData.length > 1 ? (
            <>
              <span className={delta >= 0 ? "lib-delta num" : "lib-delta is-down num"}>{delta >= 0 ? "+" : "−"}{formatNumber(Math.abs(delta))} {chartUnit}</span>
              {` desde el inicio · ${sessionCount} sesiones`}
            </>
          ) : "1 sesión registrada"}
        />
        <div className="lib-chart-wrap">
          {chartData.length > 1 ? (
            <ProgressChart data={chartData} unit={chartUnit} metric={chartMetric} />
          ) : (
            <p className="lib-chart-note">Con una sesión más verás aquí tu curva de progreso.</p>
          )}
        </div>
      </section>

      <section className="lib-marks" aria-labelledby="lib-marks-title">
        <h3 id="lib-marks-title" className="meta lib-marks-title"><Trophy size={14} aria-hidden="true" />Mejores marcas</h3>
        <dl className="lib-marks-grid">
          {marks.map((mark) => (
            <div key={mark.label} className="lib-mark">
              <dt>{mark.label}</dt>
              <dd className="num">
                {mark.value}
                {mark.unit && <small>{mark.unit}</small>}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <Card tone="carbon" className="lib-next">
        <span className="lib-next-icon" aria-hidden="true"><Sparkles size={18} /></span>
        <div>
          <p className="meta">Próxima vez</p>
          <p className="lib-next-text">{suggestion.message}</p>
        </div>
      </Card>

      <section className="lib-history" aria-labelledby="lib-history-title">
        <h3 id="lib-history-title" className="meta">Últimas sesiones</h3>
        <ol className="list">
          {recent.map(({ workout, record }) => {
            const e1rm = bestSetE1rm(record);
            return (
              <li key={workout.id} className="list-row lib-history-row">
                <span className="lib-history-date">
                  <b className="num">{formatShortDate(workout.date)}</b>
                </span>
                <span className="grow">
                  <strong className="num">{setsLine(record, unit)}</strong>
                  <small>{workout.name ?? "Entrenamiento"}{loaded && e1rm > 0 ? ` · 1RM ≈ ${kg(e1rm)} ${unit}` : ""}</small>
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
