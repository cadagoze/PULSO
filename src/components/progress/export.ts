import { readAllData } from "@/lib/store";
import { sortedWorkouts } from "@/lib/training";
import { exerciseName } from "@/components/progress/format";
import type { WorkoutEntry } from "@/types";

function download(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

/** Respaldo completo (mismo formato que Perfil), para poder restaurarlo desde Importar respaldo. */
export function exportJson() {
  const data = { app: "PULSO", version: 2, exportedAt: new Date().toISOString(), data: readAllData() };
  download(JSON.stringify(data, null, 2), `pulso-respaldo-${stamp()}.json`, "application/json");
}

function csvCell(value: string | number | undefined) {
  const text = value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function workoutsCsv(workouts: WorkoutEntry[]) {
  const rows: Array<Array<string | number | undefined>> = [["date", "workout", "exercise", "set", "kind", "load_kg", "value", "unit", "rir"]];
  for (const workout of [...sortedWorkouts(workouts)].reverse()) {
    for (const record of workout.records ?? []) {
      record.sets.forEach((set, index) => {
        if (!set.done) return;
        rows.push([workout.date, workout.name ?? "Entrenamiento", exerciseName(record.exerciseId), index + 1, set.kind ?? "normal", set.load, set.value, record.unit, set.rir]);
      });
    }
  }
  return `﻿${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function exportCsv(workouts: WorkoutEntry[]) {
  download(workoutsCsv(workouts), `pulso-entrenamientos-${stamp()}.csv`, "text/csv;charset=utf-8");
}
