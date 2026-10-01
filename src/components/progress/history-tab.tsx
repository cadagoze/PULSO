"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, Dumbbell, History, Timer, Trophy } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { exportCsv, exportJson } from "@/components/progress/export";
import { dayLabel, exerciseName, monthLabel, volumeLabel, type Unit } from "@/components/progress/format";
import { WorkoutDetailSheet } from "@/components/progress/workout-detail-sheet";
import { useSettings, useWorkouts } from "@/lib/store";
import { sortedWorkouts } from "@/lib/training";
import type { WorkoutEntry } from "@/types";

function groupByMonth(workouts: WorkoutEntry[]) {
  const groups = new Map<string, WorkoutEntry[]>();
  for (const workout of workouts) {
    const key = workout.date.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), workout]);
  }
  return [...groups.entries()];
}

export function HistoryTab() {
  const [workouts] = useWorkouts();
  const [settings] = useSettings();
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const sorted = sortedWorkouts(workouts);
  const exerciseIds = [...new Set(sorted.flatMap((workout) => (workout.records ?? []).map((record) => record.exerciseId)))]
    .sort((a, b) => exerciseName(a).localeCompare(exerciseName(b), "es"));
  const filtered = filter === "all" ? sorted : sorted.filter((workout) => workout.records?.some((record) => record.exerciseId === Number(filter)));
  const open = workouts.find((workout) => workout.id === openId) ?? null;

  if (!workouts.length) {
    return (
      <EmptyState
        icon={<History size={20} />}
        title="Aún no hay entrenamientos"
        action={<Link href="/entrenar" className="btn btn-primary">Preparar entrenamiento</Link>}
      >
        Cada sesión que termines quedará aquí con sus series, cargas y récords.
      </EmptyState>
    );
  }

  return (
    <div className="prog-stack">
      <div className="prog-history-tools">
        <label className="field prog-filter">
          Filtrar por ejercicio
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">Todos los ejercicios</option>
            {exerciseIds.map((id) => (
              <option key={id} value={id}>{exerciseName(id)}</option>
            ))}
          </select>
        </label>
        <div className="prog-export" role="group" aria-label="Exportar historial">
          <button type="button" className="btn btn-secondary btn-small" onClick={() => exportCsv(workouts)}>
            <Download size={15} aria-hidden="true" />
            CSV
          </button>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => exportJson()}>
            <Download size={15} aria-hidden="true" />
            JSON
          </button>
        </div>
      </div>

      <p className="subtle prog-history-count">
        <span className="num">{filtered.length}</span> {filtered.length === 1 ? "sesión" : "sesiones"}
        {filter !== "all" ? ` con ${exerciseName(Number(filter))}` : " registradas"}
      </p>

      {groupByMonth(filtered).map(([month, items]) => (
        <section key={month} className="prog-month" aria-labelledby={`prog-month-${month}`}>
          <h2 id={`prog-month-${month}`} className="prog-month-title">
            {monthLabel(month)}
            <span className="num subtle">{items.length}</span>
          </h2>
          <ul className="prog-workouts">
            {items.map((workout) => (
              <li key={workout.id}>
                <WorkoutCard workout={workout} unit={settings.unit} onOpen={() => setOpenId(workout.id)} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="subtle prog-history-help">Tu historial se guarda en este navegador. Expórtalo de vez en cuando como respaldo.</p>

      <WorkoutDetailSheet workout={open} onClose={() => setOpenId(null)} />
    </div>
  );
}

function WorkoutCard({ workout, unit, onOpen }: { workout: WorkoutEntry; unit: Unit; onOpen: () => void }) {
  const interval = workout.kind === "interval";
  const Icon = interval ? Timer : Dumbbell;
  const prs = workout.prs?.length ?? 0;
  return (
    <button type="button" className="card card-link prog-workout" onClick={onOpen}>
      <span className={`icon-tile ${interval ? "violet" : ""}`} aria-hidden="true">
        <Icon size={19} />
      </span>
      <span className="prog-workout-main">
        <span className="prog-workout-top">
          <strong>{workout.name ?? "Entrenamiento"}</strong>
          {prs > 0 && (
            <span className="badge badge-solid">
              <Trophy size={11} aria-hidden="true" />
              {prs} PR
            </span>
          )}
        </span>
        <span className="prog-workout-date">
          {dayLabel(workout.date)} · {interval ? "Intervalos" : "Fuerza"}
        </span>
        <span className="prog-workout-meta num">
          <span>{Math.round(workout.durationMinutes)} min</span>
          <span>{workout.sets} series</span>
          {(workout.volume ?? 0) > 0 && <span>{volumeLabel(workout.volume ?? 0, unit)}</span>}
          {workout.effort && <span>Esfuerzo {workout.effort}/5</span>}
        </span>
      </span>
    </button>
  );
}
