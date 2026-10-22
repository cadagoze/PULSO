import type { Exercise, ExerciseLevel, ExerciseRecord } from "@/types";

/**
 * Prescripción: cuántas series, en qué rango, con cuánto margen (RIR) y cuánto descanso, según tu
 * objetivo, tu nivel y el papel del ejercicio en la sesión. Los rangos son herramientas prácticas, no
 * fronteras fisiológicas: para la fuerza pesa más la carga (principal en 3–8 repeticiones), para el músculo
 * casi cualquier carga sirve si el esfuerzo es alto (5–20), y para moverse mejor, 8–15. Nadie va al fallo
 * por defecto: RIR 1–3, más margen cuanto menos experiencia. Respaldo en docs/evidencia-entrenamiento.md.
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

/**
 * Rangos de repeticiones para ejercicios con carga, por objetivo, papel y nivel. Fuerza: la carga alta rinde
 * más (el principal de 3 a 8 repeticiones; quien empieza, de 6 a 10 para aprender la técnica). Músculo: de 30 a
 * 100 % del 1RM sirve con esfuerzo alto, así que los rangos son amplios. Salud general: 8–15.
 */
function rangeFor(group: GoalGroup, role: ExerciseRole, level: ExerciseLevel): [number, number] {
  // Quien empieza aprende la técnica con cargas moderadas: 6–10 (fuerza) u 8–12 (el resto) y aislamientos de 10–15.
  if (level === 1 && role !== "core") {
    if (role === "main") return group === "strength" ? [6, 10] : [8, 12];
    return role === "compound" ? [8, 12] : [10, 15];
  }
  if (group === "strength") {
    if (role === "main") return level === 2 ? [4, 8] : [3, 6];
    return role === "compound" ? [6, 10] : role === "accessory" ? [8, 15] : [10, 20];
  }
  if (group === "muscle") {
    if (role === "main") return [5, 10];
    return role === "compound" ? [6, 12] : [10, 20];
  }
  return role === "main" ? [8, 12] : role === "compound" ? [8, 15] : role === "accessory" ? [10, 15] : [10, 20];
}

/**
 * Descansos orientativos: lo pesado y exigente, 2–3 min; compuestos moderados, 90–120 s; aislamientos, 60–90 s.
 * Quien empieza descansa menos (cargas más livianas) y, con peso corporal, hasta 90 s.
 */
const RESTS: Record<GoalGroup, Record<ExerciseRole, number>> = {
  strength: { main: 180, compound: 120, accessory: 75, core: 60 },
  muscle: { main: 150, compound: 120, accessory: 75, core: 60 },
  general: { main: 120, compound: 90, accessory: 60, core: 45 },
};

/**
 * Repeticiones en reserva por nivel y papel: más margen cuanto menos experiencia (quien empieza estima peor
 * cuánto le queda y aprende técnica), y nunca el fallo (RIR 0) por defecto. En aislamientos de un avanzado, 1.
 */
const RIRS: Record<ExerciseLevel, Record<ExerciseRole, number>> = {
  1: { main: 3, compound: 3, accessory: 2, core: 3 },
  2: { main: 2, compound: 2, accessory: 1, core: 2 },
  3: { main: 2, compound: 1, accessory: 1, core: 2 },
};

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
  const range: [number, number] = exercise.unit === "reps" && exercise.increment > 0 ? rangeFor(group, role, level) : exercise.range;
  const extraSet = (group === "strength" || group === "muscle") && level > 1 && role !== "core" && role !== "accessory" ? 1 : 0;
  // De 2 a 4 series por ejercicio y sesión: más rinden cada vez menos.
  const sets = Math.max(2, Math.min(4, exercise.sets + extraSet - (easier ? 1 : 0) - (minutes <= 10 ? 1 : 0)));
  const rir = Math.min(3, RIRS[level][role] + (easier ? 1 : 0));
  // Sin carga externa (peso corporal), no hace falta el descanso largo de los levantamientos pesados.
  const base = RESTS[group][role];
  const beginnerCap = level === 1 ? (role === "main" ? 150 : role === "compound" ? 90 : base) : base;
  const rest = exercise.increment > 0 ? Math.min(base, beginnerCap) : Math.min(90, base);
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
