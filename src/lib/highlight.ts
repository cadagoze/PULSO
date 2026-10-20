import { weekStreak } from "@/lib/analytics";
import { exerciseById, isWorkingSet, workoutVolume } from "@/lib/training";
import { formatNumber } from "@/lib/utils";
import type { WorkoutEntry } from "@/types";

/** El dato de progreso que vale la pena mirar hoy: «+5 kg», «4 semanas», «Nuevo récord». */
export interface ProgressHighlight {
  kind: "record" | "strength" | "streak" | "volume" | "milestone";
  /** La cifra grande. */
  value: string;
  /** Qué significa, en una línea. */
  label: string;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const MILESTONES = [100, 50, 25, 10, 5];
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/**
 * Elige UN dato, el más valioso: un récord de esta semana; más carga en un ejercicio en las últimas
 * 4 semanas; 3 o más semanas seguidas cumpliendo la meta; más volumen que el mes anterior; un hito de
 * entrenamientos alcanzado esta semana; o 2 semanas seguidas. Si nada destaca, ninguno (no se inventa).
 */
export function progressHighlight(workouts: WorkoutEntry[], { now, goal, pausedWeeks = [], unit = "kg", toDisplay = (kg: number) => kg }: {
  now: Date;
  goal: number;
  pausedWeeks?: string[];
  unit?: string;
  toDisplay?: (kg: number) => number;
}): ProgressHighlight | null {
  if (!workouts.length) return null;
  const nowMs = now.getTime();
  const age = (workout: WorkoutEntry) => nowMs - Date.parse(workout.completedAt);
  // Lo recién guardado cuenta aunque el reloj vaya unos segundos atrás; fechas lejanas en el futuro, no.
  const recent = [...workouts].filter((workout) => age(workout) >= -HOUR).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const weight = (kg: number) => `${formatNumber(toDisplay(kg))} ${unit}`;

  // 1. Un récord de esta semana (el más reciente).
  for (const workout of recent) {
    if (age(workout) > 7 * DAY) break;
    const hit = workout.prs?.find((item) => item.kind === "load" || item.kind === "e1rm") ?? workout.prs?.[0];
    const exercise = hit ? exerciseById(hit.exerciseId) : undefined;
    if (!hit || !exercise) continue;
    const sets = workout.records?.find((record) => record.exerciseId === hit.exerciseId)?.sets.filter((set) => set.done && isWorkingSet(set)) ?? [];
    const top = [...sets].sort((a, b) => b.load - a.load || b.value - a.value)[0];
    const detail = !top ? "" : exercise.unit === "seconds" ? `${top.value} s` : top.load > 0 ? `${weight(top.load)} × ${top.value}` : `${top.value} repeticiones`;
    return { kind: "record", value: "Nuevo récord", label: detail ? `${exercise.name} · ${detail}` : exercise.name };
  }

  // 2. Más carga en un ejercicio en las últimas 4 semanas (la mayor subida relativa).
  const loads = new Map<number, Array<{ at: string; load: number }>>();
  for (const workout of recent) {
    if (age(workout) > 28 * DAY) break;
    for (const record of workout.records ?? []) {
      const top = Math.max(0, ...record.sets.filter((set) => set.done && isWorkingSet(set)).map((set) => set.load));
      if (top > 0) loads.set(record.exerciseId, [...(loads.get(record.exerciseId) ?? []), { at: workout.completedAt, load: top }]);
    }
  }
  let best: { id: number; gain: number; ratio: number } | null = null;
  for (const [id, points] of loads) {
    if (points.length < 2) continue;
    const ordered = [...points].sort((a, b) => a.at.localeCompare(b.at));
    const gain = ordered[ordered.length - 1].load - ordered[0].load;
    const ratio = gain / ordered[0].load;
    if (gain >= 2 && ratio >= 0.05 && (!best || ratio > best.ratio)) best = { id, gain, ratio };
  }
  const stronger = best ? exerciseById(best.id) : undefined;
  if (best && stronger) return { kind: "strength", value: `+${weight(best.gain)}`, label: `en ${lowerFirst(stronger.name)} · últimas 4 semanas` };

  // 3. Constancia: 3 o más semanas seguidas cumpliendo la meta.
  const { streak } = weekStreak(workouts, Math.max(1, goal), pausedWeeks, now);
  if (streak >= 3) return { kind: "streak", value: `${streak} semanas`, label: "seguidas cumpliendo tu meta" };

  // 4. Volumen de las últimas 4 semanas frente a las 4 anteriores.
  const volume = (from: number, to: number) => recent.filter((workout) => age(workout) >= from * DAY && age(workout) < to * DAY).reduce((sum, workout) => sum + workoutVolume(workout), 0);
  const thisMonth = volume(0, 28);
  const lastMonth = volume(28, 56);
  if (lastMonth > 0 && thisMonth / lastMonth >= 1.1) return { kind: "volume", value: `+${Math.round((thisMonth / lastMonth - 1) * 100)} %`, label: "de volumen frente al mes anterior" };

  // 5. Un hito de entrenamientos alcanzado esta semana.
  const thisWeek = recent.filter((workout) => age(workout) <= 7 * DAY).length;
  const milestone = MILESTONES.find((count) => workouts.length >= count && workouts.length - thisWeek < count);
  if (milestone) return { kind: "milestone", value: String(milestone), label: "entrenamientos registrados" };

  if (streak === 2) return { kind: "streak", value: "2 semanas", label: "seguidas cumpliendo tu meta" };
  return null;
}
