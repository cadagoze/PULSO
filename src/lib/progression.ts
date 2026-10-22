import { exerciseById, isWorkingSet, lastRecordFor, sortedWorkouts } from "@/lib/training";
import { formatNumber, toDisplayWeight } from "@/lib/utils";
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
  /** Si cómo te fue cambió la sugerencia: fácil, difícil, dos difíciles seguidas, una molestia o una pausa larga. */
  because?: "easy" | "hard" | "hard-streak" | "pain" | "break";
}

/**
 * Cómo te fue con un ejercicio: el esfuerzo de la última sesión que lo tuvo (2 fácil, 3 bien, 4 difícil),
 * cuántas seguidas fueron difíciles y si te molestó. Manda lo que respondiste en ese ejercicio («¿Cómo
 * salió?»); si no respondiste, el esfuerzo de la sesión.
 */
export interface EffortContext {
  effort?: number;
  hardStreak: number;
  pain?: boolean;
  /** Sesiones seguidas con molestia en este ejercicio (con tres, se deja de insistir). */
  painStreak?: number;
  /** Días desde la última vez con este ejercicio. */
  gapDays?: number;
}

const feelEffort = { easy: 2, good: 3, hard: 4, pain: 4 } as const;

/** Lo que marcaste en las últimas sesiones con este ejercicio (sin contar un entrenamiento, si se indica). */
export function effortFor(workouts: WorkoutEntry[], exerciseId: number, excludeId?: string, now = Date.now()): EffortContext {
  let effort: number | undefined;
  let pain: boolean | undefined;
  let hardStreak = 0;
  let painStreak = 0;
  let painEnded = false;
  let gapDays: number | undefined;
  for (const workout of sortedWorkouts(workouts)) {
    const record = workout.id === excludeId ? undefined : workout.records?.find((item) => item.exerciseId === exerciseId && item.sets.some((set) => set.done));
    if (!record) continue;
    const value = record.feel ? feelEffort[record.feel] : workout.effort;
    if (effort === undefined) {
      effort = value ?? 3;
      pain = record.feel === "pain";
      gapDays = Math.max(0, Math.floor((now - Date.parse(workout.completedAt)) / 86_400_000));
    }
    if (record.feel === "pain" && !painEnded) painStreak += 1;
    else painEnded = true;
    if ((value ?? 0) >= 4) hardStreak += 1;
    else if (painEnded) break;
  }
  return { effort, hardStreak, ...(pain ? { pain } : {}), ...(painStreak ? { painStreak } : {}), ...(gapDays !== undefined ? { gapDays } : {}) };
}

/**
 * Doble progresión ajustada a cómo te fue: primero sube repeticiones dentro del rango; cuando todas las
 * series de trabajo llegan al tope con al menos 1 repetición en reserva, sube la carga y vuelve a la parte
 * baja. Si tu última sesión con el ejercicio fue difícil, mantiene (con dos difíciles seguidas, apunta a
 * la parte baja del rango); si fue fácil, sube las repeticiones más rápido.
 */
export function suggestNext(exercise: Exercise, last?: ExerciseRecord, unitLabel = "kg", toDisplay: (kg: number) => number = (kg) => kg, context?: EffortContext): Suggestion {
  const base = baseSuggestion(exercise, last, unitLabel, toDisplay);
  if (!context?.effort || base.kind === "start" || base.kind === "deload" || !last) return base;
  const [low, high] = last.range ?? exercise.range;
  const word = exercise.unit === "reps" ? "repeticiones" : "segundos";
  const withLoad = (load: number) => (load > 0 ? ` con ${toDisplay(load)} ${unitLabel}` : "");
  const sets = workingDone(last);
  const topLoad = Math.max(0, ...sets.map((set) => set.load));
  const minValue = Math.min(...sets.filter((set) => set.load === topLoad).map((set) => set.value));
  // Con tres sesiones seguidas con molestia en el ejercicio, se deja de insistir: otra variante y, si persiste, un profesional.
  if ((context.painStreak ?? 0) >= 3) {
    return { kind: "hold", value: minValue, load: topLoad, because: "pain", message: `Llevas ${context.painStreak} sesiones seguidas con molestia en este ejercicio: déjalo por ahora, prueba otra variante y, si la molestia persiste, consulta a un profesional de salud.` };
  }
  // Con molestia, nunca se sube: se repite y se propone cambiar a una variante más tolerable.
  if (context.pain) {
    return { kind: "hold", value: minValue, load: topLoad, because: "pain", message: `La última vez te molestó: repite ${minValue} ${word}${withLoad(topLoad)} o cambia a otra variante desde su menú.` };
  }
  // Tras una pausa larga se vuelve con algo menos de carga (3 semanas: −10 %; 6 o más: −20 %) y se recupera el ritmo.
  if ((context.gapDays ?? 0) >= 21 && topLoad > 0) {
    const weeks = Math.floor((context.gapDays ?? 0) / 7);
    const reduced = Math.max(0, roundTo(topLoad * ((context.gapDays ?? 0) >= 42 ? 0.8 : 0.9), exercise.increment || 1));
    return { kind: "hold", value: low, load: reduced, because: "break", message: `Vuelves tras ${weeks} semanas: empieza con ${toDisplay(reduced)} ${unitLabel} (un poco menos) y recupera el ritmo.` };
  }
  if (context.hardStreak >= 2) {
    return { kind: "hold", value: low, load: topLoad, because: "hard-streak", message: `Tras dos sesiones difíciles seguidas, apunta a ${low} ${word}${withLoad(topLoad)}.` };
  }
  if (context.effort >= 4 && (base.kind === "load" || base.kind === "harder" || base.kind === "reps")) {
    const value = base.kind === "reps" ? minValue : Math.min(high, minValue);
    return { kind: "hold", value, load: topLoad, because: "hard", message: `Como tu última sesión fue difícil, repite ${value} ${word}${withLoad(topLoad)}.` };
  }
  if (context.effort <= 2 && base.kind === "reps") {
    const value = Math.min(high, minValue + (exercise.unit === "seconds" ? 10 : 2));
    return { ...base, value, because: "easy", message: `Como tu última sesión fue fácil, intenta ${value} ${word}${withLoad(base.load)}.` };
  }
  if (context.effort <= 2 && base.kind === "load") {
    return { ...base, because: "easy", message: `Como tu última sesión fue fácil, sube a ${toDisplay(base.load)} ${unitLabel} y vuelve a ${base.value} ${word}.` };
  }
  return base;
}

function baseSuggestion(exercise: Exercise, last: ExerciseRecord | undefined, unitLabel: string, toDisplay: (kg: number) => number): Suggestion {
  const [low, high] = last?.range ?? exercise.range;
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

/** Prepara las series de una nueva sesión a partir de la última vez, cómo te fue y la sugerencia de progresión. */
export function progressedSets(exercise: Exercise, count: number, last?: ExerciseRecord, context?: EffortContext): SetRecord[] {
  const suggestion = suggestNext(exercise, last, "kg", (kg) => kg, context);
  return Array.from({ length: count }, () => ({ value: suggestion.value, load: suggestion.load, done: false, kind: "normal" as const }));
}

/** Lo que PULSO cambió respecto de tu última vez con un ejercicio, y por qué. */
export interface Adjustment {
  /** «40 → 42,5 kg», «9 → 10 rep.» o «Mantiene 40 kg». */
  change: string;
  /** El motivo, en una frase. */
  reason: string;
  direction: "up" | "hold" | "down";
}

const holdReasons = {
  pain: "Te molestó la última vez: no subimos y puedes cambiar de variante.",
  hard: "Tu última sesión fue difícil: repetimos antes de subir.",
  "hard-streak": "Llevas dos sesiones difíciles seguidas: apuntamos a la parte baja del rango.",
  break: "Vuelves tras una pausa: empezamos con un poco menos de carga.",
} as const;

/** La carga más alta de las series y las repeticiones (o segundos) más bajas con ella. */
function peakOf(sets: SetRecord[]) {
  const load = Math.max(...sets.map((set) => set.load));
  return { load, value: Math.min(...sets.filter((set) => set.load === load).map((set) => set.value)) };
}

/**
 * Qué cambió hoy frente a tu última vez («40 → 42,5 kg · Completaste el rango con margen»): carga que
 * sube o baja, una repetición más o una carga que se mantiene a propósito. Null si todo sigue igual o
 * es el primer registro. Se compara con las series que de verdad se proponen (ya ajustadas a tus pesas).
 */
export function describeAdjustment(exercise: Exercise, last: ExerciseRecord | undefined, record: ExerciseRecord, context: EffortContext | undefined, unitLabel: string, toDisplay: (kg: number) => number): Adjustment | null {
  const before = last ? workingDone(last) : [];
  const after = record.sets.filter(isWorkingSet);
  if (!last || !before.length || !after.length) return null;
  const from = peakOf(before);
  const to = peakOf(after);
  const suggestion = suggestNext(exercise, last, unitLabel, toDisplay, context);
  const word = exercise.unit === "reps" ? "rep." : "s";
  const load = (kg: number) => `${formatNumber(toDisplay(kg), 2)} ${unitLabel}`;

  if (suggestion.because === "break") {
    return { change: `${formatNumber(toDisplay(from.load), 2)} → ${load(to.load)}`, reason: holdReasons.break, direction: "down" };
  }
  if (suggestion.because && suggestion.because !== "easy") {
    return { change: `Mantiene ${to.load > 0 ? load(to.load) : `${to.value} ${word}`}`, reason: holdReasons[suggestion.because], direction: "hold" };
  }
  if (to.load !== from.load) {
    const up = to.load > from.load;
    // Sólo se explica como progreso lo que de verdad sube; si la carga se movió por las pesas que tienes, se dice.
    const reason = up && suggestion.kind === "load" ? (suggestion.because === "easy" ? "Tu última sesión fue fácil." : "Completaste el rango con margen.")
      : !up && suggestion.kind === "deload" ? "Te costó llegar al rango: bajamos la carga para consolidar la técnica."
        : "Ajustada a las pesas que tienes.";
    return { change: `${formatNumber(toDisplay(from.load), 2)} → ${load(to.load)}`, reason, direction: up ? "up" : "down" };
  }
  if (to.value > from.value) {
    return { change: `${from.value} → ${to.value} ${word}`, reason: suggestion.because === "easy" ? "Tu última sesión fue fácil." : "Sumas una repetición dentro del rango.", direction: "up" };
  }
  return null;
}

/** Los ajustes de cada ejercicio de una sesión (en el mismo orden), con la unidad de carga que usas. */
export function recordAdjustments(records: ExerciseRecord[], workouts: WorkoutEntry[], unit: "kg" | "lb"): Array<Adjustment | null> {
  return records.map((record) => {
    const exercise = exerciseById(record.exerciseId);
    return exercise ? describeAdjustment(exercise, lastRecordFor(workouts, exercise.id), record, effortFor(workouts, exercise.id), unit, (kg) => toDisplayWeight(kg, unit)) : null;
  });
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
