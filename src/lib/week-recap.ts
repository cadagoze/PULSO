import { weekRange, weekStreak } from "@/lib/analytics";
import { entryTotals } from "@/lib/nutrition";
import { recordsVolume } from "@/lib/training";
import { formatShortDate, localDateKey, weekNumber } from "@/lib/utils";
import type { FoodEntry, WaterEntry, WeightEntry, WorkoutEntry } from "@/types";

export interface WeekRecap {
  start: string;
  end: string;
  /** «Semana 41 · 29 sep – 5 oct». */
  label: string;
  /** Semana en curso (aún no termina). */
  current: boolean;
  sessions: number;
  goal: number;
  minutes: number;
  /** Kilos levantados (repeticiones × carga de las series efectivas). */
  volume: number;
  prs: number;
  /** Semanas seguidas con la meta cumplida, al cierre de esa semana. */
  streak: number;
  /** De lunes a domingo: entrenó ese día / es un día que aún no llega. */
  days: Array<{ key: string; trained: boolean; future: boolean }>;
  nutrition: { days: number; kcal: number; protein: number; targetKcal: number; targetProtein: number } | null;
  water: { days: number; met: number; average: number; goal: number } | null;
  weight: { change: number; latest: number } | null;
}

/**
 * La semana (lunes a domingo) en números para compartirla: entrenamiento siempre; nutrición sólo si
 * cuentas calorías y registraste algún día; agua y peso si hay registros.
 */
export function weekRecap({ now, offset = 0, workouts, goal, pausedWeeks = [], foodLog, targets, water, waterGoal, weights }: {
  now: Date;
  offset?: number;
  workouts: WorkoutEntry[];
  goal: number;
  pausedWeeks?: string[];
  foodLog: FoodEntry[];
  /** Objetivo diario si cuentas calorías; null en el modo sin contar. */
  targets: { kcal: number; protein: number } | null;
  water: WaterEntry[];
  waterGoal: number;
  weights: WeightEntry[];
}): WeekRecap {
  const range = weekRange(now, offset);
  const today = localDateKey(now);
  const keys = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(range.startDate);
    day.setDate(day.getDate() + index);
    return localDateKey(day);
  });
  const inWeek = workouts.filter((workout) => workout.date >= range.start && workout.date <= range.end);
  const closing = new Date(`${range.end}T12:00:00`);

  const logged = keys.filter((key) => key <= today).map((key) => foodLog.filter((entry) => entry.date === key)).filter((list) => list.length > 0);
  const dayTotals = logged.map((list) => entryTotals(list));
  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

  const glasses = keys.map((key) => water.find((entry) => entry.date === key)?.glasses ?? 0).filter((value) => value > 0);

  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const inside = sorted.filter((entry) => entry.date >= range.start && entry.date <= range.end);
  const before = sorted.filter((entry) => entry.date < range.start).at(-1) ?? (inside.length > 1 ? inside[0] : undefined);
  const latest = inside.at(-1);

  return {
    start: range.start,
    end: range.end,
    label: `Semana ${weekNumber(range.startDate)} · ${formatShortDate(range.start)} – ${formatShortDate(range.end)}`,
    current: offset === 0,
    sessions: inWeek.length,
    goal,
    minutes: inWeek.reduce((sum, workout) => sum + workout.durationMinutes, 0),
    volume: Math.round(inWeek.reduce((sum, workout) => sum + (workout.volume ?? (workout.records ? recordsVolume(workout.records) : 0)), 0)),
    prs: inWeek.reduce((sum, workout) => sum + (workout.prs?.length ?? 0), 0),
    streak: weekStreak(workouts, goal, pausedWeeks, offset === 0 ? now : closing).streak,
    days: keys.map((key) => ({ key, trained: inWeek.some((workout) => workout.date === key), future: key > today })),
    nutrition: targets && dayTotals.length
      ? { days: dayTotals.length, kcal: Math.round(average(dayTotals.map((day) => day.kcal))), protein: Math.round(average(dayTotals.map((day) => day.protein))), targetKcal: targets.kcal, targetProtein: targets.protein }
      : null,
    water: glasses.length ? { days: glasses.length, met: glasses.filter((value) => value >= waterGoal).length, average: Math.round(average(glasses) * 10) / 10, goal: waterGoal } : null,
    weight: latest && before && before !== latest ? { change: Math.round((latest.weight - before.weight) * 10) / 10, latest: latest.weight } : null,
  };
}

/** Semana que se propone compartir: la pasada los lunes y martes si tuvo entrenamientos; si no, la actual. */
export function defaultRecapOffset(now: Date, workouts: WorkoutEntry[]) {
  const weekday = (now.getDay() + 6) % 7;
  if (weekday > 1) return 0;
  const last = weekRange(now, -1);
  return workouts.some((workout) => workout.date >= last.start && workout.date <= last.end) ? -1 : 0;
}
