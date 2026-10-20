import { exercises } from "@/data/mock-data";
import type { Exercise, ExerciseRecord, SetRecord, TrainingDraft, TrainingPreference, TrainingRoutine, WorkoutEntry } from "@/types";

export const defaultTrainingPreference: TrainingPreference = { location: "home", equipment: [] };

const exerciseIndex = new Map(exercises.map((exercise) => [exercise.id, exercise]));

export function exerciseById(id: number): Exercise | undefined {
  return exerciseIndex.get(id);
}

/** Series iniciales para un ejercicio: comienza en la parte baja del rango objetivo. */
export function recordFor(exercise: Exercise, sets = exercise.sets, value = exercise.range[0], restSeconds?: number): ExerciseRecord {
  return {
    exerciseId: exercise.id,
    unit: exercise.unit,
    sets: Array.from({ length: sets }, () => ({ value, load: 0, done: false, kind: "normal" as const })),
    ...(restSeconds ? { restSeconds } : {}),
  };
}

export function recordsForExercises(items: Exercise[], short = false): ExerciseRecord[] {
  return (short ? items.slice(0, 3) : items).map((exercise) => recordFor(exercise, short ? 2 : exercise.sets));
}



export function isWorkingSet(set: SetRecord) {
  return set.kind !== "warmup";
}

export function completedSets(records: ExerciseRecord[]) {
  return records.reduce((sum, record) => sum + record.sets.filter((set) => set.done).length, 0);
}

export function totalSets(records: ExerciseRecord[]) {
  return records.reduce((sum, record) => sum + record.sets.length, 0);
}

/** Ejercicio sólo de calentamiento (el bloque con que empieza la sesión). */
function warmupOnly(record: ExerciseRecord) {
  return record.sets.length > 0 && record.sets.every((set) => set.kind === "warmup");
}

/** Cuántos ejercicios de calentamiento abren la sesión. */
export function warmupCount(records: ExerciseRecord[]) {
  const index = records.findIndex((record) => !warmupOnly(record));
  return index === -1 ? records.length : index;
}

/** «Calentamiento 2 de 4» para los ejercicios del bloque inicial; si no, «Serie 2 de 4». */
export function recordHeading(records: ExerciseRecord[], recordIndex: number, setIndex: number) {
  const warmups = warmupCount(records);
  return recordIndex < warmups ? `Calentamiento ${recordIndex + 1} de ${warmups}` : setHeading(records[recordIndex]?.sets ?? [], setIndex);
}

/** Ya hiciste alguna serie de lo principal (no de calentamiento). */
export function mainStarted(records: ExerciseRecord[]) {
  return records.some((record) => record.sets.some((set) => set.done && isWorkingSet(set)));
}

/**
 * Si al ejercicio le quedan series por hacer. El calentamiento es opcional: con lo principal ya empezado
 * (`started`), el que te saltaste no queda pendiente.
 */
export function hasPending(record: ExerciseRecord | undefined, started = false) {
  if (!record || (started && warmupOnly(record))) return false;
  return record.sets.some((set) => !set.done);
}

/** Series hechas y totales de la sesión; el calentamiento que te saltaste ya no cuenta como pendiente. */
export function sessionSets(records: ExerciseRecord[]) {
  const started = mainStarted(records);
  let done = 0;
  let total = 0;
  for (const record of records) {
    const finished = record.sets.filter((set) => set.done).length;
    done += finished;
    total += started && warmupOnly(record) ? finished : record.sets.length;
  }
  return { done, total };
}

/** Tonelaje: repeticiones × carga de las series de trabajo realizadas. */
export function recordsVolume(records: ExerciseRecord[]) {
  return records.reduce((sum, record) => record.unit !== "reps" ? sum : sum + record.sets.filter((set) => set.done && isWorkingSet(set)).reduce((acc, set) => acc + set.value * set.load, 0), 0);
}

/** Tonelaje de una sesión; los registros antiguos sin `volume` se calculan a partir de sus series. */
export function workoutVolume(workout: WorkoutEntry) {
  return workout.volume ?? (workout.records ? recordsVolume(workout.records) : 0);
}

/** «Serie 2 de 4» (series de trabajo) o «Calentamiento 1 de 2». */
export function setHeading(sets: SetRecord[], index: number) {
  const warmup = sets[index]?.kind === "warmup";
  const sameKind = (set: SetRecord) => (set.kind === "warmup") === warmup;
  const position = sets.slice(0, index + 1).filter(sameKind).length;
  return `${warmup ? "Calentamiento" : "Serie"} ${position} de ${sets.filter(sameKind).length}`;
}

/** Lo que sigue tras el descanso (la primera serie pendiente, en orden): «Press de banca · Serie 3 de 4». */
export function nextUpLabel(records: ExerciseRecord[]) {
  const started = mainStarted(records);
  for (const [position, record] of records.entries()) {
    if (!hasPending(record, started)) continue;
    const index = record.sets.findIndex((set) => !set.done);
    const heading = recordHeading(records, position, index);
    const name = exerciseById(record.exerciseId)?.name;
    return name ? `${name} · ${heading}` : heading;
  }
  return null;
}

export function durationSeconds(draft: TrainingDraft, now: number) {
  return draft.elapsedSeconds + (draft.runningSince === null ? 0 : Math.max(0, Math.floor((now - draft.runningSince) / 1000)));
}

export function clockLabel(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60).toString().padStart(2, "0");
  const rest = (safe % 60).toString().padStart(2, "0");
  return hours ? `${hours}:${minutes}:${rest}` : `${minutes}:${rest}`;
}

export function newId(prefix = "id") {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now().toString(36)}-${Math.round(performance.now() * 1000).toString(36)}`;
}

export function sortedWorkouts(workouts: WorkoutEntry[]) {
  return [...workouts].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

/** Última vez que se registró un ejercicio (excluyendo un entrenamiento concreto, si se indica). */
export function lastRecordFor(workouts: WorkoutEntry[], exerciseId: number, excludeId?: string): ExerciseRecord | undefined {
  for (const workout of sortedWorkouts(workouts)) {
    if (workout.id === excludeId) continue;
    const record = workout.records?.find((item) => item.exerciseId === exerciseId);
    if (record?.sets.length) return record;
  }
  return undefined;
}

export function routineWithId(routine: TrainingRoutine, index = 0): TrainingRoutine & { id: string } {
  return { ...routine, id: routine.id ?? `rutina-${index + 1}` };
}
