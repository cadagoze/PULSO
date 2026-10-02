"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Exercise, ExerciseRecord, Program, TrainingLocation } from "@/types";

export const dayLetters = ["L", "M", "X", "J", "V", "S", "D"] as const;
export const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;

export const locationLabels: Record<Program["location"], string> = {
  home: "Casa",
  gym: "Gimnasio",
  any: "Cualquier lugar",
};

export const placeOptions: Array<{ value: TrainingLocation; label: string }> = [
  { value: "home", label: "Casa" },
  { value: "gym", label: "Gimnasio" },
];

/** Número editorial con dos cifras: 3 → «03». */
export function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function rangeText(range: [number, number], unit: Exercise["unit"]) {
  const [low, high] = range;
  const core = low === high ? `${low}` : `${low}–${high}`;
  return unit === "seconds" ? `${core} s` : core;
}

/** "3 × 8–12" con el número de series del registro y el rango del ejercicio. */
export function targetLabel(exercise: Exercise, sets: number, range: [number, number] = exercise.range) {
  return `${sets} × ${rangeText(range, exercise.unit)}`;
}

export function restText(seconds: number) {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes}:${String(rest).padStart(2, "0")} min` : `${minutes} min`;
}

export function topLoad(record: ExerciseRecord) {
  return record.sets.reduce((max, set) => Math.max(max, set.load), 0);
}

/** Paso de carga en la unidad visible: el incremento del ejercicio en kg, 5 en libras. */
export function loadStep(exercise: Exercise, unit: "kg" | "lb") {
  return unit === "lb" ? 5 : exercise.increment || 2.5;
}

/** Coincidencia con una media query (falso en el servidor y durante la hidratación). */
export function useMediaQuery(query: string) {
  const subscribe = useCallback((notify: () => void) => {
    const list = window.matchMedia(query);
    list.addEventListener("change", notify);
    return () => list.removeEventListener("change", notify);
  }, [query]);
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

/**
 * Aviso breve que desaparece solo. `raised` lo sube cuando el acceso al entrenamiento
 * en curso ocupa el espacio sobre la barra de navegación.
 */
