import { exerciseById, isWorkingSet } from "@/lib/training";
import type { Exercise, ExerciseLevel, ExerciseRecord, MuscleGroup } from "@/types";

/**
 * Volumen: cuántas series efectivas recibe cada músculo. Una serie cuenta entera para el músculo que
 * lidera el movimiento y una fracción para los que ayudan (el press de banca suma al pecho y, en parte, al
 * tríceps y al hombro). No es una ciencia exacta, pero ignorar el trabajo indirecto sobrecuenta a los
 * músculos pequeños o los deja sin trabajo en la cuenta.
 */

/** Cómo cuenta una serie para cada músculo del ejercicio. */
export const CREDIT = { lead: 1, co: 0.5, support: 0.25 } as const;

export type Region = "chest" | "back" | "shoulders" | "arms" | "legs" | "core";

export const regionLabels: Record<Region, string> = { chest: "Pecho", back: "Espalda", shoulders: "Hombros", arms: "Brazos", legs: "Piernas", core: "Core" };

export const regionOf: Record<MuscleGroup, Region> = {
  chest: "chest", back: "back", lats: "back", traps: "back", shoulders: "shoulders", biceps: "arms", triceps: "arms", forearms: "arms",
  abs: "core", obliques: "core", lowerBack: "core", glutes: "legs", quads: "legs", hamstrings: "legs", adductors: "legs", calves: "legs",
};

/**
 * Los músculos que el plan vigila: una rutina completa los cubre todos. La espalda cuenta por dorsales o
 * espalda media (la que más trabajo reciba), porque casi todo tirón trabaja una y apoya a la otra.
 */
export const trackedMuscles: MuscleGroup[] = ["chest", "lats", "shoulders", "quads", "hamstrings", "glutes", "biceps", "triceps", "calves", "abs"];

/** Músculos pequeños que reciben trabajo indirecto de los compuestos: se les exige menos series directas. */
export const supportMuscles = new Set<MuscleGroup>(["biceps", "triceps", "calves", "abs"]);

/** El abdomen se entrena con casi todo (el tronco estabiliza cada compuesto): nunca se le exige el rango completo. */
export const coreMuscles = new Set<MuscleGroup>(["abs"]);

/** Series efectivas de un músculo vigilado (la espalda toma la mayor entre dorsales y espalda media). */
export function trackedSets(sets: Record<MuscleGroup, number>, muscle: MuscleGroup) {
  return muscle === "lats" ? Math.max(sets.lats, sets.back) : sets[muscle];
}

export type MuscleCredit = Partial<Record<MuscleGroup, number>>;

/** Lo que una serie del ejercicio aporta a cada músculo: 1 al que lidera, 0,5 a los otros principales y 0,25 a los de apoyo. */
export function muscleCredit(exercise: Pick<Exercise, "primary" | "secondary">): MuscleCredit {
  const credit: MuscleCredit = {};
  exercise.primary.forEach((muscle, index) => { credit[muscle] = (credit[muscle] ?? 0) + (index === 0 ? CREDIT.lead : CREDIT.co); });
  for (const muscle of exercise.secondary) credit[muscle] = (credit[muscle] ?? 0) + CREDIT.support;
  return credit;
}

export function emptyMuscles(): Record<MuscleGroup, number> {
  return { chest: 0, back: 0, lats: 0, traps: 0, shoulders: 0, biceps: 0, triceps: 0, forearms: 0, abs: 0, obliques: 0, lowerBack: 0, glutes: 0, quads: 0, hamstrings: 0, adductors: 0, calves: 0 };
}

/** Series efectivas por músculo de un grupo de ejercicios con su número de series (sin calentamiento). */
export function effectiveSets(items: Array<{ exercise: Exercise; sets: number }>): Record<MuscleGroup, number> {
  const total = emptyMuscles();
  for (const { exercise, sets } of items) {
    if (exercise.category === "mobility" || exercise.category === "cardio") continue;
    for (const [muscle, credit] of Object.entries(muscleCredit(exercise)) as Array<[MuscleGroup, number]>) total[muscle] += sets * credit;
  }
  return total;
}

/** Lo mismo a partir de registros de sesión (sólo series de trabajo, hechas o no). */
export function recordsEffectiveSets(records: ExerciseRecord[]): Record<MuscleGroup, number> {
  return effectiveSets(records.flatMap((record) => {
    const exercise = exerciseById(record.exerciseId);
    return exercise ? [{ exercise, sets: record.sets.filter(isWorkingSet).length }] : [];
  }));
}

export interface VolumeRange {
  low: number;
  high: number;
}

export type VolumeGoal = "strength" | "muscle" | "weight" | "energy" | "habits";

/**
 * Series semanales efectivas por músculo, como referencia de producto (no norma médica), por objetivo y nivel.
 * Músculo: de 6–10 al empezar a 12–20 con experiencia (≥10 es lo que respaldan los consensos y metaanálisis;
 * sin datos fiables por encima de unas 20–25). Fuerza: pocas series de lo principal, repartidas en 2–3 sesiones.
 * Salud general: lo justo para progresar. El plan arranca en la parte baja y sólo sube si hace falta.
 */
const TARGETS: Record<VolumeGoal, [VolumeRange, VolumeRange, VolumeRange]> = {
  muscle: [{ low: 6, high: 10 }, { low: 10, high: 16 }, { low: 12, high: 20 }],
  strength: [{ low: 3, high: 6 }, { low: 4, high: 9 }, { low: 4, high: 9 }],
  weight: [{ low: 4, high: 8 }, { low: 6, high: 12 }, { low: 8, high: 12 }],
  energy: [{ low: 4, high: 8 }, { low: 6, high: 10 }, { low: 6, high: 10 }],
  habits: [{ low: 3, high: 6 }, { low: 4, high: 8 }, { low: 4, high: 8 }],
};

export function weeklyTarget(level: ExerciseLevel, goal: VolumeGoal): VolumeRange {
  return TARGETS[goal][level - 1];
}

/**
 * Dónde arranca el plan dentro del rango: un poco por encima del mínimo (hay margen para subir y para bajar). Desde
 * ahí, el ajuste semanal lo mueve según cómo te va.
 */
export function weeklyStart(level: ExerciseLevel, goal: VolumeGoal): number {
  const { low, high } = weeklyTarget(level, goal);
  return Math.round(low + (high - low) * 0.3);
}

/** Tope práctico de series efectivas de un músculo en una sola sesión, antes de que sume cada vez menos. */
export function sessionCap(level: ExerciseLevel): number {
  return level === 1 ? 6 : level === 2 ? 8 : 10;
}
