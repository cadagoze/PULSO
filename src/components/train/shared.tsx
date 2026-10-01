"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import type { Exercise, ExerciseRecord, Program } from "@/types";

export const dayLetters = ["L", "M", "X", "J", "V", "S", "D"] as const;
export const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;

export const locationLabels: Record<Program["location"], string> = {
  home: "Casa",
  gym: "Gimnasio",
  any: "Cualquier lugar",
};

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

/** Aviso breve que desaparece solo. */
export function useToast(duration = 2600) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);
  const show = useCallback((text: string) => {
    setMessage(text);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(null), duration);
  }, [duration]);
  const node = message ? (
    <div className="toast train-toast" role="status">
      <Check size={16} />
      {message}
    </div>
  ) : null;
  return { show, node };
}

