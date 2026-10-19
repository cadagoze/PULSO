import { programs } from "@/data/programs";
import { progressedSets } from "@/lib/progression";
import { exerciseById, isWorkingSet, lastRecordFor } from "@/lib/training";
import type { ExerciseRecord, Program, ProgramProgress, WorkoutEntry } from "@/types";

export function programById(id: string): Program | undefined {
  return programs.find((program) => program.id === id);
}

export function sessionKey(week: number, day: number) {
  return `${week}-${day}`;
}

export function programTotalSessions(program: Program) {
  return program.weeks * program.days.length;
}

/** Próxima sesión pendiente del programa (semanas y días empiezan en 1). */
export function nextProgramSession(program: Program, progress: ProgramProgress) {
  for (let week = 1; week <= program.weeks; week += 1) {
    for (let day = 1; day <= program.days.length; day += 1) {
      if (!progress.completed.includes(sessionKey(week, day))) return { week, day };
    }
  }
  return null;
}

/** Series de una sesión del programa, ajustadas por semana y prellenadas con la progresión del usuario. */
export function programSessionRecords(program: Program, week: number, day: number, workouts: WorkoutEntry[]): ExerciseRecord[] {
  const template = program.days[day - 1];
  const delta = program.weekSetDelta[week - 1] ?? 0;
  if (!template) return [];
  return template.items.flatMap((item) => {
    const exercise = exerciseById(item.exerciseId);
    if (!exercise) return [];
    const sets = Math.max(1, item.sets + delta);
    const prefilled = progressedSets({ ...exercise, range: item.range }, sets, lastRecordFor(workouts, exercise.id));
    // El rango del programa viaja con la sesión: se ve al entrenar y queda en el historial.
    return [{ exerciseId: exercise.id, unit: exercise.unit, sets: prefilled, restSeconds: item.restSeconds, range: item.range }];
  });
}

/** Versión corta (chequeo «cansado»): una serie menos en los ejercicios que tienen tres o más de trabajo. */
export function easierRecords(records: ExerciseRecord[]): ExerciseRecord[] {
  return records.map((record) => {
    const working = record.sets.filter(isWorkingSet);
    if (working.length < 3) return record;
    const last = record.sets.lastIndexOf(working[working.length - 1]);
    return { ...record, sets: record.sets.filter((_, index) => index !== last) };
  });
}

export function programSessionName(program: Program, week: number, day: number) {
  return `${program.name} · S${week} D${day}`;
}

export function markProgramSession(progress: ProgramProgress | null, programId: string, week: number, day: number): ProgramProgress | null {
  if (!progress || progress.programId !== programId) return progress;
  const key = sessionKey(week, day);
  return progress.completed.includes(key) ? progress : { ...progress, completed: [...progress.completed, key] };
}
