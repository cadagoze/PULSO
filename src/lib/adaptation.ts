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
