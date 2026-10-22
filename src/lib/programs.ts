import { programs } from "@/data/programs";
import { isCompound, prescribe, roleOf, type PrescriptionGoal } from "@/lib/prescription";
import { effortFor, progressedSets } from "@/lib/progression";
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

/**
 * El que PULSO recomienda según tus días: 2 o 3, Full Body; 4, Torso / Pierna; 5 o más, Push / Pull / Legs,
 * sólo desde nivel intermedio (a quien empieza, Torso / Pierna). En casa, Full Body.
 */
export function recommendedProgram(featured: Program[], { location, days, level = 2 }: { location: TrainingLocation; days: number; level?: number }): Program | undefined {
  const find = (id: string) => featured.find((program) => program.id === id);
  if (location === "home" || days <= 3) return featured[0];
  if (days >= 5 && level >= 2) return find("push-pull-legs") ?? find("torso-pierna") ?? featured[0];
  return find("torso-pierna") ?? featured[0];
}

const programGoal = (goal: Program["goal"]): PrescriptionGoal => (goal === "strength" ? "strength" : goal === "muscle" ? "muscle" : "habits");

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
  let mainPicked = false;
  return template.items.flatMap((item) => {
    const exercise = exerciseById(item.exerciseId);
    if (!exercise) return [];
    const role = roleOf(exercise, !mainPicked && isCompound(exercise));
    if (role === "main") mainPicked = true;
    const effort = effortFor(workouts, exercise.id);
    // Muy difícil la última vez: 30 s más de descanso; dos difíciles seguidas: una serie menos.
    const sets = Math.max(1, item.sets + delta - (effort.hardStreak >= 2 ? 1 : 0));
    const prefilled = progressedSets({ ...exercise, range: item.range }, sets, lastRecordFor(workouts, exercise.id), effort);
    const rir = exercise.category === "strength" && exercise.unit === "reps" ? prescribe(exercise, { goal: programGoal(program.goal), level: program.level, role }).rir : undefined;
    // El rango del programa viaja con la sesión: se ve al entrenar y queda en el historial.
    return [{
      exerciseId: exercise.id,
      unit: exercise.unit,
      sets: prefilled,
      restSeconds: Math.min(240, item.restSeconds + ((effort.effort ?? 0) >= 4 ? 30 : 0)),
      range: item.range,
      ...(rir !== undefined ? { rir } : {}),
    }];
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
