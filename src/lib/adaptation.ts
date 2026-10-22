import { exerciseTrend } from "@/lib/selection";
import { exerciseById } from "@/lib/training";
import { localDateKey } from "@/lib/utils";
import type { ReadinessEntry, WorkoutEntry } from "@/types";

/**
 * Lo que PULSO aprende de cómo entrenas (además de la progresión de cada ejercicio, en progression.ts):
 * cansancio acumulado, molestias que marcaste al terminar y los ejercicios que sueles cambiar. Todo sale
 * de tu historial: nada se guarda aparte salvo los cambios de ejercicio (en Ajustes).
 */

type PainArea = NonNullable<ReadinessEntry["pain"]>[number];
const DAY = 86_400_000;

/** Días entre dos fechas locales («ayer» = 1). */
function daysBetween(from: string, to: string) {
  return Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / DAY);
}

const newestFirst = (workouts: WorkoutEntry[]) => [...workouts].sort((a, b) => b.completedAt.localeCompare(a.completedAt));

/**
 * Sesiones difíciles seguidas, de la más reciente hacia atrás. Sólo cuenta si son de esta semana y la
 * última fue hace 3 días o menos: tras varios días de descanso, ese cansancio ya pasó.
 */
export function recentHardStreak(workouts: WorkoutEntry[], now: Date) {
  const today = localDateKey(now);
  const recent = newestFirst(workouts);
  if (!recent.length || daysBetween(recent[0].date, today) > 3) return 0;
  let streak = 0;
  for (const workout of recent) {
    if (daysBetween(workout.date, today) > 7 || (workout.effort ?? 0) < 4) break;
    streak += 1;
  }
  return streak;
}

/** Las zonas que marcaste con molestia al terminar tu última sesión, si fue hoy o ayer (si no, ninguna). */
export function carriedPain(workouts: WorkoutEntry[], now: Date): PainArea[] {
  const [last] = newestFirst(workouts);
  if (!last?.painAreas?.length || daysBetween(last.date, localDateKey(now)) > 1) return [];
  return last.painAreas;
}

/** Un ejercicio más que cambiaste por otro (sesión o plan): con dos o más, el generador deja de proponerlo. */
export function addSwap(swaps: Record<string, number> | undefined, exerciseId: number): Record<string, number> {
  return { ...swaps, [exerciseId]: Math.min(9, (swaps?.[exerciseId] ?? 0) + 1) };
}

/** Lo que completaste en una sesión ya no cuenta como cambiado: si lo hiciste, no lo evitas. */
export function forgetSwaps(swaps: Record<string, number> | undefined, exerciseIds: number[]): Record<string, number> | undefined {
  if (!swaps) return swaps;
  const next = Object.fromEntries(Object.entries(swaps).filter(([id]) => !exerciseIds.includes(Number(id))));
  return Object.keys(next).length === Object.keys(swaps).length ? swaps : next;
}

/** Ejercicios cuya última vez (en las últimas 3 semanas) marcaste «Molestia»: se cambian por otra variante. */
export function painfulExercises(workouts: WorkoutEntry[], now: number): Set<number> {
  const painful = new Set<number>();
  const seen = new Set<number>();
  for (const workout of newestFirst(workouts)) {
    if (now - Date.parse(workout.completedAt) > 21 * DAY) break;
    for (const record of workout.records ?? []) {
      if (seen.has(record.exerciseId)) continue;
      seen.add(record.exerciseId);
      if (record.feel === "pain") painful.add(record.exerciseId);
    }
  }
  return painful;
}

export interface Learned {
  key: string;
  /** Qué aprendió PULSO y qué cambia en tus próximas sesiones. */
  text: string;
}

const nameOf = (id: number) => exerciseById(id)?.name;

/**
 * Lo que PULSO aprendió de ti en las últimas semanas, en orden de importancia (molestias primero), como
 * máximo cuatro: molestias, cansancio acumulado, ejercicios que te costaron o te salieron fáciles, los que
 * progresas (se mantienen) y los que cambias seguido (dejan de proponerse). Todo sale de tu historial.
 */
export function learnedFrom(workouts: WorkoutEntry[], swaps: Record<string, number> | undefined, now: number): Learned[] {
  const items: Learned[] = [];
  const recent = newestFirst(workouts).filter((workout) => now - Date.parse(workout.completedAt) <= 14 * DAY);
  if (!recent.length) return items;

  for (const id of painfulExercises(workouts, now)) {
    const name = nameOf(id);
    if (name) items.push({ key: `pain-${id}`, text: `Te molestó ${name}: no subimos su carga y proponemos otra variante.` });
  }

  const streak = recentHardStreak(workouts, new Date(now));
  if (streak >= 2) items.push({ key: "streak", text: `Llevas ${streak} sesiones difíciles seguidas: bajamos un poco el volumen para que te recuperes.` });

  const seen = new Set<number>();
  for (const workout of recent) {
    for (const record of workout.records ?? []) {
      const name = nameOf(record.exerciseId);
      if (!name || seen.has(record.exerciseId)) continue;
      seen.add(record.exerciseId);
      if (record.feel === "hard") items.push({ key: `hard-${record.exerciseId}`, text: `${name} te costó: la próxima vez repetimos antes de subir.` });
      else if (record.feel === "easy") items.push({ key: `easy-${record.exerciseId}`, text: `${name} te salió fácil: la próxima vez subimos un poco.` });
    }
  }

  for (const id of seen) {
    const trend = exerciseTrend(workouts, id, now);
    if (trend?.progressing && trend.sessions >= 2) {
      items.push({ key: `progress-${id}`, text: `${nameOf(id)} avanza: lo mantenemos en tus sesiones para que sigas mejorando.` });
      break;
    }
  }

  for (const [id, times] of Object.entries(swaps ?? {})) {
    const name = nameOf(Number(id));
    if (name && times >= 2) items.push({ key: `swap-${id}`, text: `Cambiaste ${name} varias veces: dejamos de proponerlo.` });
  }

  return items.slice(0, 4);
}
