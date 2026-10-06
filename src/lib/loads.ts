import { equipmentById } from "@/data/equipment";
import type { Equipment, Exercise, ExerciseLevel, TrainingPreference } from "@/types";

/**
 * Pesos disponibles en casa y cómo adaptar cada ejercicio a ellos: carga sugerida, repeticiones y
 * series. En el gimnasio se asume todo el rango de pesos (no se ajusta).
 */

export type LoadMap = Partial<Record<Equipment, number[]>>;

/** Capacidades que llevan carga externa (las que el ajuste toma en cuenta). */
const LOADED: Equipment[] = ["dumbbells", "kettlebell", "barbell", "ankle-weights", "medicine-ball"];

const range = (from: number, to: number, step: number) => {
  const out: number[] = [];
  for (let value = from; value <= to + 1e-6; value += step) out.push(Math.round(value * 100) / 100);
  return out;
};

/** Pesos por capacidad según lo marcado en casa; `null` en el gimnasio o si no marcaste ningún peso. */
export function availableLoads(preference: TrainingPreference): LoadMap | null {
  if (preference.location === "gym" || !preference.loads) return null;
  const map: LoadMap = {};
  const add = (capability: Equipment, values: number[]) => {
    if (!values.length) return;
    map[capability] = [...new Set([...(map[capability] ?? []), ...values])].sort((a, b) => a - b);
  };
  for (const id of preference.equipment) {
    const values = preference.loads[id] ?? [];
    if (!values.length) continue;
    if (id === "dumbbell-set") {
      const total = Math.max(...values);
      add("dumbbells", range(2.5, total / 2, 1.25));
      add("barbell", range(5, total, 2.5));
    } else if (id === "barbell") {
      add("barbell", range(10, Math.max(...values), 2.5));
    } else {
      for (const capability of equipmentById.get(id)?.provides ?? []) if (LOADED.includes(capability)) add(capability, values);
    }
  }
  return Object.keys(map).length ? map : null;
}

/** Capacidad cargada del ejercicio (la de la primera alternativa disponible), si tiene. */
export function loadCapability(exercise: Exercise, equipment: Set<Equipment>): Equipment | undefined {
  const option = exercise.equipment.find((group) => group.every((item) => equipment.has(item)));
  return option?.find((item) => LOADED.includes(item));
}

/**
 * Carga inicial sugerida (kg por mancuerna o kettlebell; total en barra), como fracción del peso
 * corporal según el ejercicio y el nivel. Es un punto de partida: la progresión la corrige.
 */
const startFactor: Record<number, number> = {
  10: 0.16, 44: 0.18, 11: 0.13, 12: 0.11, 50: 0.05, 46: 0.08, 47: 0.03, 48: 0.06, 49: 0.09, 14: 0.14, 45: 0.09, 51: 0.25, 52: 0.2, 53: 0.25,
  59: 0.6, 22: 0.6, 63: 0.8, 64: 0.7, 60: 0.5, 61: 0.3, 62: 0.45,
  97: 0.03, 98: 0.03, 90: 0.08,
};
const levelFactor: Record<ExerciseLevel, number> = { 1: 0.75, 2: 1, 3: 1.25 };

export function startingLoad(exercise: Exercise, bodyKg = 70, level: ExerciseLevel = 1) {
  const factor = startFactor[exercise.id] ?? 0.08;
  return Math.round(bodyKg * factor * levelFactor[level] * 2) / 2;
}

export interface LoadFit {
  load: number;
  range: [number, number];
  extraSet: boolean;
  /** Relación entre la carga ideal y la elegida (>1: tus pesas son livianas; <1: pesadas). */
  ratio: number;
  adapted: boolean;
}

/** Peso más cercano al objetivo (en empate, el más pesado). */
export function nearestLoad(target: number, available: number[]) {
  return available.reduce((best, value) => (Math.abs(value - target) < Math.abs(best - target) || (Math.abs(value - target) === Math.abs(best - target) && value > best) ? value : best), available[0]);
}

/**
 * Si conviene otro ejercicio: pesas demasiado livianas (menos de 40 % de la carga ideal) o demasiado
 * pesadas (más de 1,6 veces la ideal: por seguridad no se compensa sólo con menos repeticiones).
 */
export const unfit = (ratio: number) => ratio > 2.6 || ratio < 0.62;

/**
 * Ajusta un ejercicio a tus pesas: elige el peso más cercano a la carga ideal y compensa con
 * repeticiones (más si el peso es liviano, menos si es pesado) y, si hace falta, una serie más.
 */
export function fitLoad(exercise: Exercise, target: number, available: number[], baseRange: [number, number] = exercise.range): LoadFit {
  const load = nearestLoad(target, available);
  const ratio = load > 0 ? target / load : 1;
  let [low, high] = baseRange;
  if (exercise.unit === "reps" && ratio > 1.15) {
    const factor = Math.min(ratio, 2);
    low = Math.min(20, Math.round(low * factor));
    high = Math.min(25, Math.max(low + 2, Math.round(high * factor)));
  } else if (exercise.unit === "reps" && ratio < 0.85) {
    const factor = Math.max(ratio, 0.5);
    low = Math.max(5, Math.round(low * factor));
    high = Math.max(low + 2, Math.round(high * factor));
  }
  const adapted = low !== baseRange[0] || high !== baseRange[1];
  return { load, range: [low, high], extraSet: ratio > 1.7, ratio, adapted };
}
