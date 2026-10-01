import { exerciseById, isWorkingSet, sortedWorkouts } from "@/lib/training";
import type { Exercise, ExerciseRecord, PersonalRecordHit, PersonalRecordKind, SetRecord, WorkoutEntry } from "@/types";

/** 1RM estimado con Epley. Las repeticiones en reserva cuentan como repeticiones posibles. */
export function estimateOneRepMax(load: number, reps: number, rir = 0) {
  if (load <= 0 || reps <= 0) return 0;
  const effective = reps + Math.max(0, rir);
  if (effective === 1) return load;
  return load * (1 + Math.min(effective, 15) / 30);
}

/** Carga para un número de repeticiones a partir de un 1RM (Epley inverso). */
export function loadForReps(oneRepMax: number, reps: number) {
  return reps <= 1 ? oneRepMax : oneRepMax / (1 + reps / 30);
}

export function roundTo(value: number, step: number) {
  return step > 0 ? Math.round(value / step) * step : value;
}

function workingDone(record: ExerciseRecord) {
  return record.sets.filter((set) => set.done && isWorkingSet(set));
}

/** Series que cuentan para récords: realizadas, sin calentamientos ni drop sets. */
export function recordEligible(set: SetRecord) {
  return set.done && isWorkingSet(set) && set.kind !== "drop";
}

export interface SessionPoint {
  date: string;
  workoutId: string;
  e1rm: number;
  topLoad: number;
  topValue: number;
  volume: number;
  sets: number;
}

export interface ExerciseBests {
  e1rm: number;
  load: number;
  reps: number;
  seconds: number;
  volume: number;
  /** Mejores repeticiones logradas con cada carga (kg). */
  repsAtLoad: Array<{ load: number; reps: number }>;
  sessions: SessionPoint[];
}

/** Máximo de repeticiones previas con exactamente esta carga (0 si nunca se usó). */
export function bestRepsAt(bests: ExerciseBests, load: number) {
  return Math.max(0, ...bests.repsAtLoad.filter((item) => Math.abs(item.load - load) < 0.01).map((item) => item.reps));
}

function pointFor(workout: WorkoutEntry, record: ExerciseRecord): SessionPoint | null {
  const sets = workingDone(record);
  if (!sets.length) return null;
  const eligible = sets.filter(recordEligible);
  return {
    date: workout.date,
    workoutId: workout.id,
    // Sin repeticiones en reserva: el 1RM refleja lo realizado, así los récords no dependen del RIR anotado.
    e1rm: record.unit === "reps" && eligible.length ? Math.max(...eligible.map((set) => estimateOneRepMax(set.load, set.value))) : 0,
    topLoad: Math.max(...sets.map((set) => set.load)),
    topValue: Math.max(...sets.map((set) => set.value)),
    volume: record.unit === "reps" ? sets.reduce((sum, set) => sum + set.value * set.load, 0) : 0,
    sets: sets.length,
  };
}

/** Historial y mejores marcas de un ejercicio, en orden cronológico. */
export function exerciseBests(workouts: WorkoutEntry[], exerciseId: number, excludeId?: string): ExerciseBests {
  const sessions: SessionPoint[] = [];
  let reps = 0;
  let seconds = 0;
  let bestSetVolume = 0;
  const repsByLoad = new Map<number, number>();
  for (const workout of [...sortedWorkouts(workouts)].reverse()) {
    if (workout.id === excludeId) continue;
    for (const record of workout.records ?? []) {
      if (record.exerciseId !== exerciseId) continue;
      const point = pointFor(workout, record);
      if (!point) continue;
      sessions.push(point);
      for (const set of record.sets.filter(recordEligible)) {
        if (record.unit === "reps") {
          reps = Math.max(reps, set.value);
          bestSetVolume = Math.max(bestSetVolume, set.value * set.load);
          repsByLoad.set(set.load, Math.max(repsByLoad.get(set.load) ?? 0, set.value));
        } else {
          seconds = Math.max(seconds, set.value);
        }
      }
    }
  }
  return {
    e1rm: Math.max(0, ...sessions.map((item) => item.e1rm)),
    load: Math.max(0, ...[...repsByLoad.keys()]),
    repsAtLoad: [...repsByLoad].map(([load, best]) => ({ load, reps: best })),
    reps,
    seconds,
    volume: bestSetVolume,
    sessions,
  };
}

/** Récords nuevos de un entrenamiento frente al historial previo. Sólo cuenta si ya había una marca anterior. */
export function detectRecords(workout: WorkoutEntry, history: WorkoutEntry[]): PersonalRecordHit[] {
  const hits: PersonalRecordHit[] = [];
  const earlier = history.filter((item) => item.id !== workout.id && item.completedAt < workout.completedAt);
  for (const record of workout.records ?? []) {
    const sets = record.sets.filter(recordEligible);
    if (!sets.length) continue;
    const before = exerciseBests(earlier, record.exerciseId);
    if (!before.sessions.length) continue;
    // Más repeticiones sólo cuenta frente a la misma carga.
    const repsGain = Math.max(0, ...sets.map((set) => {
      const previous = bestRepsAt(before, set.load);
      return previous > 0 && set.value > previous ? set.value - previous : 0;
    }));
    const repsSet = sets.find((set) => { const previous = bestRepsAt(before, set.load); return previous > 0 && set.value - previous === repsGain; });
    const candidates: Array<[PersonalRecordKind, number, number]> = record.unit === "reps"
      ? [
        ["e1rm", Math.max(...sets.map((set) => estimateOneRepMax(set.load, set.value))), before.e1rm],
        ["load", Math.max(...sets.map((set) => set.load)), before.load],
        ["reps", repsGain > 0 && repsSet ? repsSet.value : 0, repsSet ? bestRepsAt(before, repsSet.load) : 0],
        ["volume", Math.max(...sets.map((set) => set.value * set.load)), before.volume],
      ]
      : [["seconds", Math.max(...sets.map((set) => set.value)), before.seconds]];
    const best = candidates.find(([, value, previous]) => value > 0 && previous > 0 && value > previous + 0.01);
    if (best) hits.push({ exerciseId: record.exerciseId, kind: best[0], value: Math.round(best[1] * 10) / 10, previous: Math.round(best[2] * 10) / 10 });
  }
  return hits;
}

export type SuggestionKind = "start" | "load" | "reps" | "harder" | "hold" | "deload";

export interface Suggestion {
  kind: SuggestionKind;
  value: number;
  load: number;
  message: string;
}

/**
 * Doble progresión: primero sube repeticiones dentro del rango; cuando todas las series de trabajo
 * llegan al tope con al menos 1 repetición en reserva, sube la carga y vuelve a la parte baja del rango.
 */
export function suggestNext(exercise: Exercise, last?: ExerciseRecord, unitLabel = "kg", toDisplay: (kg: number) => number = (kg) => kg): Suggestion {
  const [low, high] = exercise.range;
  const sets = last ? workingDone(last) : [];
  if (!sets.length) {
    return {
      kind: "start",
      value: low,
      load: 0,
      message: exercise.increment > 0 ? "Primer registro: elige una carga con la que te queden 2 o 3 repeticiones en reserva." : `Primer registro: apunta a ${low}–${high} ${exercise.unit === "reps" ? "repeticiones" : "segundos"} con buena técnica.`,
    };
  }
  const topLoad = Math.max(...sets.map((set) => set.load));
  const top = sets.filter((set) => set.load === topLoad);
  const minValue = Math.min(...top.map((set) => set.value));
  const rirValues = top.map((set) => set.rir).filter((value): value is number => value !== undefined);
  const roomLeft = !rirValues.length || Math.min(...rirValues) >= 1;
  const step = exercise.unit === "seconds" ? 5 : 1;

  if (minValue < low && rirValues.length && Math.max(...rirValues) === 0) {
    const reduced = roundTo(topLoad * 0.9, exercise.increment || 1);
    return topLoad > 0
      ? { kind: "deload", value: low, load: reduced, message: `Te costó llegar al rango. Baja a ${toDisplay(reduced)} ${unitLabel} y consolida la técnica.` }
      : { kind: "hold", value: low, load: 0, message: "Mantén el objetivo y prioriza la técnica antes de sumar." };
  }
  if (minValue >= high && roomLeft) {
    if (exercise.increment > 0 && topLoad > 0) {
      const next = topLoad + exercise.increment;
      return { kind: "load", value: low, load: next, message: `Completaste el rango: sube a ${toDisplay(next)} ${unitLabel} y vuelve a ${low} ${exercise.unit === "reps" ? "rep." : "s"}.` };
    }
    const harder = exercise.harder ? exerciseById(exercise.harder) : undefined;
    if (harder) return { kind: "harder", value: high, load: topLoad, message: `Dominas el rango. Cuando quieras, prueba ${harder.name}.` };
    return { kind: "reps", value: minValue + step, load: topLoad, message: `Supera el tope: intenta ${minValue + step} ${exercise.unit === "reps" ? "repeticiones" : "segundos"}.` };
  }
  if (minValue < low) {
    return { kind: "hold", value: low, load: topLoad, message: "Mantén la carga y busca completar la parte baja del rango." };
  }
  const value = Math.min(high, minValue + step);
  return { kind: "reps", value, load: topLoad, message: `Suma ${exercise.unit === "reps" ? "una repetición" : "5 segundos"}: objetivo ${value}${topLoad ? ` con ${toDisplay(topLoad)} ${unitLabel}` : ""}.` };
}

/** Prepara las series de una nueva sesión a partir de la última vez y la sugerencia de progresión. */
export function progressedSets(exercise: Exercise, count: number, last?: ExerciseRecord): SetRecord[] {
  const suggestion = suggestNext(exercise, last);
  return Array.from({ length: count }, () => ({ value: suggestion.value, load: suggestion.load, done: false, kind: "normal" as const }));
}

/** Series de aproximación para cargas medianas o altas. */
export function warmupSets(workingLoad: number, barbell: boolean, barWeight: number): SetRecord[] {
  const step = barbell ? 2.5 : 2;
  const minimum = barbell ? barWeight * 1.5 : 12;
  if (workingLoad < minimum) return [];
  const steps: Array<[number, number]> = barbell ? [[0, 10], [0.5, 5], [0.7, 3], [0.85, 1]] : [[0.5, 8], [0.75, 3]];
  const seen = new Set<number>();
  return steps.flatMap(([ratio, reps]) => {
    const load = ratio === 0 ? barWeight : Math.max(barbell ? barWeight : step, roundTo(workingLoad * ratio, step));
    if (load >= workingLoad || seen.has(load)) return [];
    seen.add(load);
    return [{ value: reps, load, done: false, kind: "warmup" as const }];
  });
}

/** Discos por lado para una carga total en barra. */
export function plateBreakdown(total: number, barWeight: number, plates: number[]) {
  let perSide = Math.max(0, (total - barWeight) / 2);
  const result: number[] = [];
  for (const plate of [...plates].sort((a, b) => b - a)) {
    while (perSide + 1e-6 >= plate) {
      result.push(plate);
      perSide -= plate;
    }
  }
  return { perSide: result, remainder: Math.round(perSide * 2 * 100) / 100, achieved: barWeight + result.reduce((sum, plate) => sum + plate, 0) * 2 };
}

export const recordKindLabels: Record<PersonalRecordKind, string> = {
  e1rm: "1RM estimado",
  load: "Mayor carga",
  reps: "Más repeticiones",
  volume: "Mejor serie (volumen)",
  seconds: "Mayor tiempo",
};
