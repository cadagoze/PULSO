import { exerciseById, isWorkingSet, sortedWorkouts } from "@/lib/training";
import { localDateKey, startOfCurrentWeek } from "@/lib/utils";
import type { MuscleGroup, ReadinessEntry, WorkoutEntry } from "@/types";

export const allMuscles: MuscleGroup[] = ["chest", "back", "lats", "traps", "shoulders", "biceps", "triceps", "forearms", "abs", "obliques", "lowerBack", "glutes", "quads", "hamstrings", "adductors", "calves"];

const largeMuscles = new Set<MuscleGroup>(["chest", "back", "lats", "glutes", "quads", "hamstrings", "lowerBack"]);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function emptyMuscleMap(): Record<MuscleGroup, number> {
  return Object.fromEntries(allMuscles.map((muscle) => [muscle, 0])) as Record<MuscleGroup, number>;
}

/** Series de trabajo por músculo: 1 para el principal y 0,5 para los secundarios. */
export function workoutMuscleSets(workout: WorkoutEntry) {
  const result = emptyMuscleMap();
  let hard = 0;
  for (const record of workout.records ?? []) {
    const exercise = exerciseById(record.exerciseId);
    if (!exercise || exercise.category === "mobility") continue;
    const sets = record.sets.filter((set) => set.done && isWorkingSet(set));
    if (!sets.length) continue;
    hard += sets.filter((set) => set.rir !== undefined && set.rir <= 1).length;
    for (const muscle of exercise.primary) result[muscle] += sets.length;
    for (const muscle of exercise.secondary) result[muscle] += sets.length * 0.5;
  }
  return { sets: result, hardRatio: hard ? hard / Math.max(1, workout.sets) : 0 };
}

export function muscleSetsBetween(workouts: WorkoutEntry[], from: string, to: string) {
  const total = emptyMuscleMap();
  for (const workout of workouts) {
    if (workout.date < from || workout.date > to) continue;
    const { sets } = workoutMuscleSets(workout);
    for (const muscle of allMuscles) total[muscle] += sets[muscle];
  }
  return total;
}

export function weekRange(now = new Date(), offsetWeeks = 0) {
  const start = startOfCurrentWeek(now);
  start.setDate(start.getDate() + offsetWeeks * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: localDateKey(start), end: localDateKey(end), startDate: start };
}

/** Recuperación estimada (0–100) por músculo: la fatiga decae en 48 h (músculos pequeños) o 72 h (grandes). */
export function muscleRecovery(workouts: WorkoutEntry[], now = Date.now()) {
  const fatigue = emptyMuscleMap();
  for (const workout of workouts) {
    const elapsed = now - new Date(workout.completedAt).getTime();
    if (elapsed < 0 || elapsed > 3 * DAY) continue;
    const { sets, hardRatio } = workoutMuscleSets(workout);
    const intensity = 1 + hardRatio * 0.2;
    for (const muscle of allMuscles) {
      if (!sets[muscle]) continue;
      const window = (largeMuscles.has(muscle) ? 72 : 48) * HOUR;
      const remaining = Math.max(0, 1 - elapsed / window);
      fatigue[muscle] += Math.min(100, sets[muscle] * 13 * intensity) * remaining;
    }
  }
  const recovery = emptyMuscleMap();
  for (const muscle of allMuscles) recovery[muscle] = Math.round(100 - Math.min(100, fatigue[muscle]));
  return recovery;
}

export interface WeekSummary {
  start: string;
  label: string;
  sessions: number;
  sets: number;
  volume: number;
  minutes: number;
}

export function weeklySeries(workouts: WorkoutEntry[], weeks = 8, now = new Date()): WeekSummary[] {
  return Array.from({ length: weeks }, (_, index) => {
    const range = weekRange(now, index - weeks + 1);
    const items = workouts.filter((workout) => workout.date >= range.start && workout.date <= range.end);
    return {
      start: range.start,
      label: range.startDate.toLocaleDateString("es-CL", { day: "numeric", month: "short" }).replace(".", ""),
      sessions: items.length,
      sets: items.reduce((sum, item) => sum + item.sets, 0),
      volume: Math.round(items.reduce((sum, item) => sum + (item.volume ?? 0), 0)),
      minutes: Math.round(items.reduce((sum, item) => sum + item.durationMinutes, 0)),
    };
  });
}

/**
 * Racha en semanas: semanas seguidas cumpliendo el objetivo (o en pausa).
 * La semana en curso suma si ya se cumplió, pero no rompe la racha mientras siga abierta.
 */
export function weekStreak(workouts: WorkoutEntry[], goal: number, pausedWeeks: string[] = [], now = new Date()) {
  const paused = new Set(pausedWeeks);
  const sessionsIn = (offset: number) => {
    const range = weekRange(now, offset);
    return { count: workouts.filter((workout) => workout.date >= range.start && workout.date <= range.end).length, start: range.start };
  };
  const current = sessionsIn(0);
  const currentMet = current.count >= goal;
  let streak = currentMet ? 1 : 0;
  for (let offset = -1; offset > -520; offset -= 1) {
    const week = sessionsIn(offset);
    if (week.count >= goal) streak += 1;
    else if (!paused.has(week.start)) break;
  }
  return { streak, currentCount: current.count, currentMet, currentPaused: paused.has(current.start), currentStart: current.start };
}

/** Racha de días consecutivos con actividad (hoy no rompe la racha si aún no entrenas). */
export function dayStreak(workouts: WorkoutEntry[], now = new Date()) {
  const dates = new Set(workouts.map((workout) => workout.date));
  const cursor = new Date(now);
  if (!dates.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (dates.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface HeatDay {
  date: string;
  sets: number;
  sessions: number;
  future: boolean;
}

/** Cuadrícula de actividad: columnas por semana (lunes a domingo). */
export function activityGrid(workouts: WorkoutEntry[], weeks = 16, now = new Date()): HeatDay[][] {
  const byDate = new Map<string, { sets: number; sessions: number }>();
  for (const workout of workouts) {
    const day = byDate.get(workout.date) ?? { sets: 0, sessions: 0 };
    day.sets += workout.sets;
    day.sessions += 1;
    byDate.set(workout.date, day);
  }
  const today = localDateKey(now);
  return Array.from({ length: weeks }, (_, column) => {
    const { startDate } = weekRange(now, column - weeks + 1);
    return Array.from({ length: 7 }, (_, row) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + row);
      const key = localDateKey(date);
      const day = byDate.get(key);
      return { date: key, sets: day?.sets ?? 0, sessions: day?.sessions ?? 0, future: key > today };
    });
  });
}

/** Carga de sesión: esfuerzo (escala 1–10) × minutos. Sin esfuerzo registrado se asume moderado. */
export function sessionLoad(workout: WorkoutEntry) {
  if (workout.load !== undefined) return workout.load;
  const effort = workout.effort ? workout.effort * 2 : 6;
  return Math.round(effort * workout.durationMinutes);
}

/** Relación carga aguda : crónica (7 días frente a la media semanal de 28 días). */
export function trainingLoad(workouts: WorkoutEntry[], now = Date.now()) {
  let acute = 0;
  let chronicTotal = 0;
  for (const workout of workouts) {
    const age = now - new Date(workout.completedAt).getTime();
    if (age < 0) continue;
    const load = sessionLoad(workout);
    if (age <= 7 * DAY) acute += load;
    if (age <= 28 * DAY) chronicTotal += load;
  }
  const chronic = chronicTotal / 4;
  const ratio = chronic > 0 ? acute / chronic : null;
  const status: "low" | "optimal" | "high" | "unknown" = ratio === null ? "unknown" : ratio < 0.8 ? "low" : ratio <= 1.3 ? "optimal" : "high";
  return { acute: Math.round(acute), chronic: Math.round(chronic), ratio, status };
}

/** Preparación 0–100 a partir del chequeo y la carga reciente. */
export function readinessScore(entry: Pick<ReadinessEntry, "energy" | "sleep" | "soreness" | "stress">, ratio: number | null) {
  const sleep = ((entry.sleep - 1) / 2) * 10;
  const soreness = ((2 - entry.soreness) / 2) * 10;
  const energy = ((entry.energy - 1) / 2) * 10;
  const stress = entry.stress === undefined ? 6 : ((3 - entry.stress) / 2) * 10;
  const loadFactor = ratio === null ? 8 : ratio < 0.8 ? 8 : ratio <= 1.3 ? 10 : Math.max(0, 10 - ((ratio - 1.3) / 0.5) * 10);
  const score = Math.round((0.3 * sleep + 0.25 * soreness + 0.2 * energy + 0.15 * stress + 0.1 * loadFactor) * 10);
  const recommendation: ReadinessEntry["recommendation"] = score >= 70 ? "planned" : score >= 40 ? "short" : "recovery";
  return { score, recommendation };
}

export interface Achievement {
  id: string;
  title: string;
  detail: string;
  progress: number;
  unlocked: boolean;
  group: "constancia" | "fuerza" | "volumen";
}

export function achievements(workouts: WorkoutEntry[], weeklyGoal: number, pausedWeeks: string[] = []): Achievement[] {
  const total = workouts.length;
  const prs = workouts.reduce((sum, workout) => sum + (workout.prs?.length ?? 0), 0);
  const volume = workouts.reduce((sum, workout) => sum + (workout.volume ?? 0), 0);
  const sets = workouts.reduce((sum, workout) => sum + workout.sets, 0);
  const minutes = workouts.reduce((sum, workout) => sum + workout.durationMinutes, 0);
  const streak = bestWeekStreak(workouts, weeklyGoal, pausedWeeks);
  const make = (id: string, group: Achievement["group"], title: string, detail: string, value: number, target: number): Achievement =>
    ({ id, group, title, detail, progress: Math.min(1, value / target), unlocked: value >= target });
  return [
    make("first", "constancia", "Primer paso", "Registra tu primer entrenamiento", total, 1),
    make("ten", "constancia", "Diez sesiones", "Completa 10 entrenamientos", total, 10),
    make("fifty", "constancia", "Medio centenar", "Completa 50 entrenamientos", total, 50),
    make("hundred", "constancia", "Club de los 100", "Completa 100 entrenamientos", total, 100),
    make("streak-4", "constancia", "Un mes constante", "Cumple tu objetivo 4 semanas seguidas", streak, 4),
    make("streak-12", "constancia", "Trimestre sólido", "Cumple tu objetivo 12 semanas seguidas", streak, 12),
    make("pr-1", "fuerza", "Nueva marca", "Supera por primera vez un récord personal", prs, 1),
    make("pr-10", "fuerza", "Coleccionista de récords", "Suma 10 récords personales", prs, 10),
    make("pr-50", "fuerza", "Imparable", "Suma 50 récords personales", prs, 50),
    make("sets-100", "volumen", "Cien series", "Completa 100 series de trabajo", sets, 100),
    make("volume-10t", "volumen", "Diez toneladas", "Levanta 10.000 kg acumulados", volume, 10_000),
    make("minutes-600", "volumen", "Diez horas en movimiento", "Acumula 600 minutos de entrenamiento", minutes, 600),
  ];
}

export function bestWeekStreak(workouts: WorkoutEntry[], goal: number, pausedWeeks: string[] = []) {
  if (!workouts.length) return 0;
  const paused = new Set(pausedWeeks);
  const counts = new Map<string, number>();
  for (const workout of workouts) {
    const start = localDateKey(startOfCurrentWeek(new Date(`${workout.date}T12:00:00`)));
    counts.set(start, (counts.get(start) ?? 0) + 1);
  }
  const first = sortedWorkouts(workouts).at(-1)!;
  const cursor = startOfCurrentWeek(new Date(`${first.date}T12:00:00`));
  const end = startOfCurrentWeek(new Date());
  let best = 0;
  let run = 0;
  while (cursor <= end) {
    const key = localDateKey(cursor);
    if ((counts.get(key) ?? 0) >= goal) best = Math.max(best, ++run);
    else if (!paused.has(key) && key !== localDateKey(end)) run = 0;
    cursor.setDate(cursor.getDate() + 7);
  }
  return best;
}

export function formatVolume(kg: number) {
  return kg >= 10_000 ? `${(kg / 1000).toLocaleString("es-CL", { maximumFractionDigits: 1 })} t` : `${Math.round(kg).toLocaleString("es-CL")} kg`;
}
