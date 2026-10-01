import { exerciseById } from "@/lib/training";
import type { WorkoutEntry } from "@/types";

export const backupVersion = 2;

export interface BackupEnvelope {
  app: "PULSO";
  version: number;
  exportedAt: string;
  data: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Acepta el sobre de respaldo de PULSO o un mapa directo de claves `pulso:*`. */
export function parseBackup(text: string, allowedKeys: readonly string[]): { data: Record<string, unknown>; keys: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("El archivo no es un JSON válido.");
  }
  if (!isRecord(parsed)) throw new Error("El respaldo debe ser un objeto con tus datos de PULSO.");
  // Acepta también la exportación de historial anterior: { exportedAt, workouts }.
  const source = parsed.app === "PULSO" && isRecord(parsed.data)
    ? parsed.data
    : Array.isArray(parsed.workouts) && !Object.keys(parsed).some((key) => key.startsWith("pulso:"))
      ? { "pulso:workouts": parsed.workouts }
      : parsed;
  const allowed = new Set(allowedKeys);
  const keys = Object.keys(source).filter((key) => key.startsWith("pulso:") && allowed.has(key));
  if (!keys.length) throw new Error("No encontramos datos de PULSO en este archivo.");
  const data: Record<string, unknown> = {};
  for (const key of keys) data[key] = source[key];
  return { data, keys };
}

export function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value: string | number | undefined) {
  if (value === undefined) return "";
  const text = String(value);
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV de series realizadas: mismas columnas que Progreso, con BOM para que Excel lea los acentos. */
export function workoutsCsv(workouts: WorkoutEntry[]) {
  const rows: string[] = ["date,workout,exercise,set,kind,load_kg,value,unit,rir"];
  const ordered = [...workouts].sort((a, b) => (a.completedAt || a.date).localeCompare(b.completedAt || b.date));
  for (const workout of ordered) {
    for (const record of workout.records ?? []) {
      const exercise = exerciseById(record.exerciseId)?.name ?? `Ejercicio ${record.exerciseId}`;
      record.sets.forEach((set, index) => {
        if (!set.done) return;
        rows.push([
          workout.date,
          workout.name ?? "Entrenamiento",
          exercise,
          index + 1,
          set.kind ?? "normal",
          set.load,
          set.value,
          record.unit,
          set.rir,
        ].map(csvCell).join(","));
      });
    }
  }
  return `﻿${rows.join("\r\n")}\r\n`;
}

export function fileStamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
