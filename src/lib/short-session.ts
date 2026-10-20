import { estimateMinutes } from "@/lib/generator";
import { exerciseById, isWorkingSet } from "@/lib/training";
import type { Exercise, ExerciseRecord, MovementPattern } from "@/types";

/** Minutos de la versión corta, con su calentamiento breve (unos 4) incluido. */
export const SHORT_MINUTES = 20;
const SHORT_WARMUP = 4;
/** En la versión corta los descansos no pasan de esto: así caben los ejercicios clave. */
const SHORT_REST = 90;

type Slot = "lower" | "push" | "pull" | "other";

function slotOf(pattern: MovementPattern): Slot {
  if (pattern === "squat" || pattern === "hinge" || pattern === "lunge") return "lower";
  if (pattern === "horizontal-push" || pattern === "vertical-push") return "push";
  if (pattern === "horizontal-pull" || pattern === "vertical-pull") return "pull";
  return "other";
}

const isCompound = (exercise: Exercise) => exercise.category === "strength" && slotOf(exercise.pattern) !== "other";

/**
 * Versión corta de una sesión, sin cortar al azar: se queda con los ejercicios de mayor impacto (los
 * compuestos), cuidando el equilibrio (pierna, empuje y tirón, según lo que traía la sesión) y el orden
 * original. Después acorta descansos y series (mínimo dos de trabajo por ejercicio) hasta que quepa.
 */
export function shortVersion(records: ExerciseRecord[], restSeconds: number, { minutes = SHORT_MINUTES, warmup = true, maxExercises = 4 }: { minutes?: number; warmup?: boolean; maxExercises?: number } = {}): ExerciseRecord[] {
  const items = records.flatMap((record, index) => {
    const exercise = exerciseById(record.exerciseId);
    return exercise ? [{ record, index, exercise }] : [];
  });
  if (items.length <= 1) return records;
  const budget = minutes - (warmup ? SHORT_WARMUP : 0);

  // 1) El primer compuesto de cada grupo presente (pierna, empuje, tirón); luego los demás compuestos
  //    y, si falta, lo demás (núcleo, aislamiento, cardio).
  const chosen = new Set<number>();
  const compounds = items.filter((item) => isCompound(item.exercise));
  for (const slot of ["lower", "push", "pull"] as const) {
    const first = compounds.find((item) => slotOf(item.exercise.pattern) === slot);
    if (first && chosen.size < maxExercises) chosen.add(first.index);
  }
  for (const item of [...compounds, ...items.filter((item) => !isCompound(item.exercise))]) {
    if (chosen.size >= maxExercises) break;
    chosen.add(item.index);
  }

  let short = items
    .filter((item) => chosen.has(item.index))
    .map(({ record }) => ({ ...record, sets: [...record.sets], restSeconds: Math.min(record.restSeconds ?? restSeconds, SHORT_REST) }));

  // 2) Que quepa: una serie menos en el que tiene más (mínimo dos de trabajo); si no basta, un ejercicio menos.
  const working = (record: ExerciseRecord) => record.sets.filter(isWorkingSet).length;
  for (let guard = 0; guard < 40 && estimateMinutes(short, restSeconds) > budget; guard += 1) {
    const longest = short.reduce((most, record) => (working(record) > working(most) ? record : most), short[0]);
    if (working(longest) > 2) {
      const last = longest.sets.map(isWorkingSet).lastIndexOf(true);
      longest.sets = longest.sets.filter((_, index) => index !== last);
    } else if (short.length > 2) {
      short = short.slice(0, -1);
    } else {
      break;
    }
  }
  return short;
}
