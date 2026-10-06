"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Download, History, Trophy } from "lucide-react";
import { Button, EmptyState, StatusBadge } from "@/components/ui";
import { exportCsv, exportJson } from "@/components/progress/export";
import { dayLabel, exerciseName, monthLabel, volumeLabel, type Unit } from "@/components/progress/format";
import { dateFromKey, workoutVolume } from "@/components/progress/period";
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

/** Historial completo por mes: filtro por ejercicio, exportación y detalle de cada sesión (repetir, guardar o eliminar). */
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
          <Button variant="secondary" size="s" onClick={() => exportCsv(workouts)}>
            <Download size={15} aria-hidden="true" />
            CSV
          </Button>
          <Button variant="secondary" size="s" onClick={() => exportJson()}>
            <Download size={15} aria-hidden="true" />
            JSON
          </Button>
        </div>
      </div>

      <p className="meta prog-history-count">
        <span className="num">{filtered.length}</span> {filtered.length === 1 ? "sesión" : "sesiones"}
        {filter !== "all" ? ` con ${exerciseName(Number(filter))}` : " registradas"}
      </p>

      <div className="prog-months">
        {groupByMonth(filtered).map(([month, items]) => (
          <section key={month} className="prog-month" aria-labelledby={`prog-month-${month}`}>
            <h2 id={`prog-month-${month}`} className="prog-month-title">
              {monthLabel(month)}
              <span className="num">{items.length}</span>
            </h2>
            <ul className="list prog-list">
              {items.map((workout) => (
                <li key={workout.id}>
                  <WorkoutRow workout={workout} unit={settings.unit} onOpen={() => setOpenId(workout.id)} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="subtle prog-history-help">Tu historial se guarda en este navegador. Expórtalo de vez en cuando como respaldo.</p>

      <WorkoutDetailSheet workout={open} onClose={() => setOpenId(null)} />
    </div>
  );
}

function WorkoutRow({ workout, unit, onOpen }: { workout: WorkoutEntry; unit: Unit; onOpen: () => void }) {
  const interval = workout.kind === "interval";
  const prs = workout.prs?.length ?? 0;
  const volume = workoutVolume(workout);
  const date = dateFromKey(workout.date);
  const details = [
    interval ? "Intervalos" : "Fuerza",
    `${Math.round(workout.durationMinutes)} min`,
    `${workout.sets} series`,
    volume > 0 ? volumeLabel(volume, unit) : "",
    workout.effort ? `Esfuerzo ${workout.effort}/5` : "",
  ].filter(Boolean);
  return (
    <button type="button" className="list-row prog-workout" onClick={onOpen}>
      <span className="prog-workout-date" aria-hidden="true">
        <b className="num">{date.getDate()}</b>
        <small>{date.toLocaleDateString("es-CL", { weekday: "short" }).replace(".", "")}</small>
      </span>
      <span className="grow">
        <strong>{workout.name ?? "Entrenamiento"}</strong>
        <small className="num"><span className="sr-only">{dayLabel(workout.date)} · </span>{details.join(" · ")}</small>
        {prs > 0 && (
          <span className="prog-workout-prs">
            <StatusBadge tone="gold">
              <Trophy size={11} aria-hidden="true" />
              {prs === 1 ? "Récord" : `${prs} récords`}
            </StatusBadge>
          </span>
        )}
      </span>
      <ChevronRight size={18} className="subtle prog-row-chevron" aria-hidden="true" />
    </button>
  );
}
