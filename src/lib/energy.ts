import { muscleSetsBetween, weekRange } from "@/lib/analytics";
import { activityLevels } from "@/lib/nutrition";
import { exerciseById } from "@/lib/training";
import { localDateKey } from "@/lib/utils";
import type { ActivityLevel, NutritionGoal, WorkoutEntry } from "@/types";

const DAY = 86_400_000;

// ─── Gasto por sesión ──────────────────────────────────────────────────────

/** Sólo ejercicios de movilidad (p. ej. «Movilidad 10 min»): cuentan como estiramientos, no como fuerza. */
function isMobilityOnly(entry: Pick<WorkoutEntry, "records">) {
  const records = entry.records ?? [];
  return records.length > 0 && records.every((record) => exerciseById(record.exerciseId)?.category === "mobility");
}

/**
 * MET de la sesión según el Compendio de Actividad Física (2024): fuerza ligera 3,5, moderada 5 y vigorosa 6;
 * intervalos 6 a 8; movilidad 2,5. El esfuerzo es el que marcas al terminar (1–5).
 */
export function sessionMet(entry: Pick<WorkoutEntry, "kind" | "effort" | "records">) {
  const effort = entry.effort;
  if (entry.kind === "interval") return effort === undefined || effort === 3 ? 7 : effort >= 4 ? 8 : 6;
  if (isMobilityOnly(entry)) return 2.5;
  return effort === undefined || effort === 3 ? 5 : effort >= 4 ? 6 : 3.5;
}

/** Calorías estimadas: MET × kg × horas, redondeadas a 5 kcal. */
export function sessionCalories(entry: Pick<WorkoutEntry, "kind" | "effort" | "records" | "durationMinutes">, weightKg: number) {
  return Math.round((sessionMet(entry) * weightKg * entry.durationMinutes) / 60 / 5) * 5;
}

/** Estimación previa de una sesión de fuerza (esfuerzo moderado). */
export function plannedCalories(minutes: number, weightKg: number) {
  return sessionCalories({ durationMinutes: minutes, kind: "strength" }, weightKg);
}

// ─── Qué entrenar según el objetivo ────────────────────────────────────────

export interface GoalGuide {
  headline: string;
  strength: { min: number; max: number };
  /** Sesiones de intervalos por semana (sólo al bajar grasa). */
  intervals: { min: number; max: number } | null;
  /** Minutos de actividad moderada por semana (salud general). */
  activityMinutes: number | null;
  /** Series semanales por grupo muscular (al ganar músculo). */
  setsPerMuscle: { min: number; max: number } | null;
  steps: string;
  focus: string;
}

export const goalGuides: Record<NutritionGoal, GoalGuide> = {
  lose: {
    headline: "Fuerza para conservar músculo, intervalos y pasos para gastar más.",
    strength: { min: 3, max: 3 },
    intervals: { min: 1, max: 2 },
    activityMinutes: null,
    setsPerMuscle: null,
    steps: "8.000–10.000 pasos al día",
    focus: "Prioriza ejercicios que mueven mucho músculo a la vez —sentadilla, peso muerto rumano, zancadas, remo y press— con descansos cortos. En déficit, la fuerza es lo que protege tu masa muscular.",
  },
  maintain: {
    headline: "Fuerza de cuerpo completo y moverte a diario.",
    strength: { min: 2, max: 3 },
    intervals: null,
    activityMinutes: 150,
    setsPerMuscle: null,
    steps: "7.000–9.000 pasos al día",
    focus: "Combina fuerza de cuerpo completo con caminatas, bicicleta o lo que disfrutes. Lo que más pesa es la constancia: 150 minutos de actividad moderada a la semana.",
  },
  gain: {
    headline: "Más series por músculo y progresar la carga cada semana.",
    strength: { min: 3, max: 4 },
    intervals: null,
    activityMinutes: null,
    setsPerMuscle: { min: 10, max: 20 },
    steps: "Camina a diario; el cardio intenso, con moderación",
    focus: "Trabaja entre 6 y 12 repeticiones dejando 1–3 en reserva, y sube la carga cuando llegues al tope del rango. Cada grupo muscular necesita de 10 a 20 series a la semana.",
  },
};

/** Grupos que se revisan para las series semanales; espalda suma dorsales. */
export const majorMuscleGroups = [
  { label: "Pecho", muscles: ["chest"] },
  { label: "Espalda", muscles: ["back", "lats"] },
  { label: "Hombros", muscles: ["shoulders"] },
  { label: "Cuádriceps", muscles: ["quads"] },
  { label: "Isquios", muscles: ["hamstrings"] },
  { label: "Glúteos", muscles: ["glutes"] },
] as const;

export interface WeekTraining {
  strengthDays: number;
  intervals: number;
  minutes: number;
  sessions: WorkoutEntry[];
  /** Grupos musculares principales que ya llegaron a 10 series esta semana. */
  musclesOnTarget: number;
}

/** Lo entrenado de lunes a hoy: días de fuerza, sesiones de intervalos, minutos y series por grupo. */
export function weekTraining(workouts: WorkoutEntry[], now = new Date()): WeekTraining {
  const { start, end } = weekRange(now);
  const sessions = workouts.filter((workout) => workout.date >= start && workout.date <= end);
  const strengthDays = new Set(sessions.filter((workout) => workout.kind !== "interval" && !isMobilityOnly(workout)).map((workout) => workout.date)).size;
  const intervals = sessions.filter((workout) => workout.kind === "interval").length;
  const minutes = Math.round(sessions.reduce((sum, workout) => sum + workout.durationMinutes, 0));
  const sets = muscleSetsBetween(sessions, start, end);
  const musclesOnTarget = majorMuscleGroups.filter((group) => group.muscles.reduce((sum, muscle) => sum + sets[muscle], 0) >= 10).length;
  return { strengthDays, intervals, minutes, sessions, musclesOnTarget };
}

/** Calorías estimadas de un conjunto de sesiones. */
export function totalCalories(sessions: WorkoutEntry[], weightKg: number) {
  return sessions.reduce((sum, workout) => sum + sessionCalories(workout, weightKg), 0);
}

/**
 * Nivel de actividad que sugieren tus entrenamientos de las últimas 4 semanas. No ve tu trabajo ni tus
 * pasos, así que sólo sirve para avisar cuando entrenas más de lo que supone tu nivel elegido.
 */
export function trainedActivity(workouts: WorkoutEntry[], now = new Date()): ActivityLevel | null {
  const from = localDateKey(new Date(now.getTime() - 27 * DAY));
  const to = localDateKey(now);
  const recent = workouts.filter((workout) => workout.date >= from && workout.date <= to);
  if (recent.length < 4) return null;
  const perWeek = new Set(recent.map((workout) => workout.date)).size / 4;
  if (perWeek >= 5) return "active";
  if (perWeek >= 3) return "moderate";
  if (perWeek >= 1) return "light";
  return null;
}

export function activityRank(level: ActivityLevel) {
  return activityLevels.findIndex((item) => item.value === level);
}
