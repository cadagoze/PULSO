import type { Exercise, ExerciseLevel, ExerciseRecord } from "@/types";

/**
 * Prescripción: cuántas series, en qué rango, con cuánto margen (RIR) y cuánto descanso, según tu
 * objetivo, tu nivel y el papel del ejercicio en la sesión. Los rangos son herramientas prácticas, no
 * fronteras fisiológicas: fuerza 4–8 en el principal, hipertrofia 6–15, aislamientos 8–20 y, para
 * moverse más, rangos más altos. Casi todo con 1–3 repeticiones en reserva: el fallo no es la norma.
 */

export type PrescriptionGoal = "strength" | "muscle" | "weight" | "energy" | "habits";

/** Papel en la sesión: el principal (primer compuesto), otro compuesto, un accesorio (aislamiento o acarreo) o núcleo. */
export type ExerciseRole = "main" | "compound" | "accessory" | "core";

export interface Prescription {
  role: ExerciseRole;
  sets: number;
  /** Repeticiones (o segundos en los ejercicios por tiempo). */
  range: [number, number];
  /** Repeticiones en reserva al terminar cada serie. */
  rir: number;
  /** Descanso entre series, en segundos. */
  rest: number;
}

const COMPOUND = new Set(["squat", "hinge", "lunge", "horizontal-push", "vertical-push", "horizontal-pull", "vertical-pull"]);

export const isCompound = (exercise: Exercise) => exercise.category === "strength" && COMPOUND.has(exercise.pattern);

/** El papel de un ejercicio: el primer compuesto de la sesión es el principal. */
export function roleOf(exercise: Exercise, isFirstCompound: boolean): ExerciseRole {
  if (exercise.pattern === "core") return "core";
  if (!isCompound(exercise)) return "accessory";
  return isFirstCompound ? "main" : "compound";
}

type GoalGroup = "strength" | "muscle" | "general";
const groupOf = (goal: PrescriptionGoal): GoalGroup => (goal === "strength" ? "strength" : goal === "muscle" ? "muscle" : "general");

/** Rangos de repeticiones para ejercicios con carga, por objetivo y papel. */
const RANGES: Record<GoalGroup, Record<ExerciseRole, [number, number]>> = {
  strength: { main: [4, 8], compound: [5, 10], accessory: [8, 15], core: [8, 15] },
  muscle: { main: [6, 12], compound: [8, 12], accessory: [10, 15], core: [10, 15] },
  general: { main: [8, 12], compound: [8, 15], accessory: [12, 20], core: [10, 20] },
};

/** Descansos orientativos: compuestos pesados 2–3 min, moderados 90–150 s, aislamientos 60–120 s (con peso corporal, hasta 90 s). */
const RESTS: Record<GoalGroup, Record<ExerciseRole, number>> = {
  strength: { main: 180, compound: 150, accessory: 90, core: 60 },
  muscle: { main: 150, compound: 120, accessory: 90, core: 60 },
  general: { main: 120, compound: 90, accessory: 60, core: 45 },
};

/** Margen objetivo: 2 en los compuestos (más técnica bajo carga), 1 en accesorios; al empezar, uno más. */
const RIRS: Record<ExerciseRole, number> = { main: 2, compound: 2, accessory: 1, core: 2 };

export function prescribe(exercise: Exercise, { goal, level, role, minutes = 30, easier = false }: {
  goal: PrescriptionGoal;
  level: ExerciseLevel;
  role: ExerciseRole;
  minutes?: number;
  /** Sesión más liviana (recuperación): una serie menos y más margen. */
  easier?: boolean;
}): Prescription {
  const group = groupOf(goal);
  if (exercise.category === "mobility") return { role, sets: exercise.sets, range: exercise.range, rir: 3, rest: 15 };
  if (exercise.category === "cardio") return { role, sets: exercise.sets, range: exercise.range, rir: 2, rest: 30 };
  // Con carga, el rango sale del objetivo; con peso corporal o por tiempo, el del ejercicio (refleja su dificultad).
  const range: [number, number] = exercise.unit === "reps" && exercise.increment > 0 ? RANGES[group][role] : exercise.range;
  const extraSet = (group === "strength" || group === "muscle") && level > 1 && role !== "core" && role !== "accessory" ? 1 : 0;
  const sets = Math.max(2, Math.min(5, exercise.sets + extraSet - (easier ? 1 : 0) - (minutes <= 10 ? 1 : 0)));
  const rir = Math.min(3, RIRS[role] + (level === 1 ? 1 : 0) + (easier ? 1 : 0));
  // Sin carga externa (peso corporal), no hace falta el descanso largo de los levantamientos pesados.
  const rest = exercise.increment > 0 ? RESTS[group][role] : Math.min(90, RESTS[group][role]);
  return { role, sets, range, rir, rest };
}

/** «8–12 rep · RIR 2»: el objetivo de cada serie, con el rango del día (o el del ejercicio) y su margen si lo tiene. */
export function targetText(record: Pick<ExerciseRecord, "unit" | "range" | "rir">, exercise: Exercise) {
  const [low, high] = record.range ?? exercise.range;
  const range = `${low === high ? low : `${low}–${high}`} ${record.unit === "reps" ? "rep" : "s"}${exercise.unilateral ? " por lado" : ""}`;
  return record.rir === undefined ? range : `${range} · RIR ${record.rir}`;
}

/** «RIR 2» y, mientras aprendes, qué significa. */
export function rirText(rir: number) {
  return `Termina con unas ${rir} ${rir === 1 ? "repetición posible" : "repeticiones posibles"} todavía, con buena técnica.`;
}
