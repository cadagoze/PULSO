import { weekRange } from "@/lib/analytics";
import { describeAdjustment, effortFor, progressedSets } from "@/lib/progression";
import type { Adjustment } from "@/lib/progression";
import { exerciseById, isWorkingSet, lastRecordFor } from "@/lib/training";
import { localDateKey, toDisplayWeight } from "@/lib/utils";
import type { ExerciseRecord, WorkoutEntry } from "@/types";

/**
 * Revisión semanal de entrenamiento: al empezar la semana, qué hiciste la anterior y qué propone PULSO
 * para esta, ejercicio por ejercicio (lo mismo que verás en tu plan: nada se promete que no se haga).
 */

/** Días de la semana (desde el lunes) en que aparece la revisión si no la has visto. */
const SHOWN_DAYS = 3;

export interface ReviewNext {
  name: string;
  change: string;
  reason: string;
  direction: Adjustment["direction"];
}

export interface TrainingReview {
  /** Lunes de la semana revisada (para marcarla como vista). */
  weekStart: string;
  sessions: number;
  goal: number;
  /** Lo que hiciste: sesiones, series de trabajo y récords. */
  lines: string[];
  /** Lo que propone PULSO para esta semana (hasta tres ejercicios). */
  next: ReviewNext[];
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
const rank: Record<Adjustment["direction"], number> = { up: 0, down: 0, hold: 1 };

export function trainingReview(workouts: WorkoutEntry[], { now, goal, unit, seen }: { now: Date; goal: number; unit: "kg" | "lb"; seen?: string }): TrainingReview | null {
  const current = weekRange(now);
  const previous = weekRange(now, -1);
  const daysIn = Math.round((new Date(`${localDateKey(now)}T12:00:00`).getTime() - new Date(`${current.start}T12:00:00`).getTime()) / 86_400_000);
  if (daysIn >= SHOWN_DAYS || seen === previous.start) return null;
  const week = workouts.filter((workout) => workout.date >= previous.start && workout.date <= previous.end);
  if (!week.length) return null;

  const sets = week.reduce((sum, workout) => sum + (workout.records ?? []).reduce((total, record) => total + record.sets.filter((set) => set.done && isWorkingSet(set)).length, 0), 0);
  const records = week.reduce((sum, workout) => sum + (workout.prs?.length ?? 0), 0);
  const lines = [
    `${plural(week.length, "sesión", "sesiones")} de ${goal}${week.length >= goal ? ": meta cumplida" : ""}`,
    ...(sets ? [`${plural(sets, "serie de trabajo", "series de trabajo")}`] : []),
    ...(records ? [plural(records, "récord nuevo", "récords nuevos")] : []),
  ];

  const toDisplay = (kg: number) => toDisplayWeight(kg, unit);
  const seenIds = new Set<number>();
  const next: ReviewNext[] = [];
  for (const workout of [...week].sort((a, b) => b.completedAt.localeCompare(a.completedAt))) {
    for (const record of workout.records ?? []) {
      const exercise = exerciseById(record.exerciseId);
      if (!exercise || seenIds.has(exercise.id)) continue;
      seenIds.add(exercise.id);
      const last = lastRecordFor(workouts, exercise.id);
      if (!last) continue;
      const effort = effortFor(workouts, exercise.id);
      const count = Math.max(1, last.sets.filter(isWorkingSet).length);
      const proposed: ExerciseRecord = { exerciseId: exercise.id, unit: exercise.unit, sets: progressedSets(exercise, count, last, effort) };
      const adjustment = describeAdjustment(exercise, last, proposed, effort, unit, toDisplay);
      if (adjustment) next.push({ name: exercise.name, ...adjustment });
    }
  }
  next.sort((a, b) => rank[a.direction] - rank[b.direction]);
  return { weekStart: previous.start, sessions: week.length, goal, lines, next: next.slice(0, 3) };
}
