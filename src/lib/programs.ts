import { programs } from "@/data/programs";
import { progressedSets } from "@/lib/progression";
import { exerciseById, isWorkingSet, lastRecordFor } from "@/lib/training";
import type { ExerciseRecord, Program, ProgramProgress, TrainingLocation, WorkoutEntry } from "@/types";

export function programById(id: string): Program | undefined {
  return programs.find((program) => program.id === id);
}

/**
 * Los tres programas que se ofrecen primero (más «Personalizada», que es crear tu rutina): Full Body
 * (de casa o de gimnasio, según tu lugar, nivel y pesas), Torso / Pierna y Push / Pull / Legs. Los
 * demás siguen disponibles en «Más programas».
 */
export function featuredPrograms({ location, level, hasDumbbells }: { location: TrainingLocation; level: number; hasDumbbells: boolean }): Program[] {
  const fullBody = location === "gym" ? "full-body-gimnasio" : level > 1 && hasDumbbells ? "fuerza-mancuernas" : "base-casa";
  return [fullBody, "torso-pierna", "push-pull-legs"].map(programById).filter((program): program is Program => Boolean(program));
}

/** El que PULSO recomienda: en casa, Full Body; en el gimnasio, por días (4 o más → Torso / Pierna) y objetivo (músculo → PPL). */
export function recommendedProgram(featured: Program[], { location, days, goal }: { location: TrainingLocation; days: number; goal: string }): Program | undefined {
  if (location === "home") return featured[0];
  if (days >= 4) return featured.find((program) => program.id === "torso-pierna") ?? featured[0];
  if (goal === "muscle") return featured.find((program) => program.id === "push-pull-legs") ?? featured[0];
  return featured[0];
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
