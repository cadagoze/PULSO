import { isAvailable } from "@/lib/generator";
import { exerciseById } from "@/lib/training";
import type { BodyArea, Equipment, Exercise, ExerciseRecord } from "@/types";

/**
 * Calentamiento enfocado en la sesión del día, en tres partes y unos 3–4 minutos:
 * 1. Pulso: sube la temperatura (jumping jacks de bajo impacto; marcha si cuidas las rodillas).
 * 2. Movilidad: las articulaciones que vas a usar, con movimientos dinámicos (los estiramientos
 *    sostenidos quedan para el final).
 * 3. Activación: una versión ligera del primer gran movimiento del día.
 * Las series de aproximación con carga siguen en el menú de cada ejercicio.
 */

export type WarmupPhase = "pulse" | "mobility" | "activation";

export interface WarmupItem {
  exercise: Exercise;
  phase: WarmupPhase;
  /** Segundos (ejercicios por tiempo) o repeticiones. */
  value: number;
}

export const warmupPhaseLabels: Record<WarmupPhase, string> = { pulse: "Pulso", mobility: "Movilidad", activation: "Activación" };

/** Descanso entre los ejercicios del calentamiento: lo justo para cambiar de posición. */
export const WARMUP_REST = 15;

/** Movimiento base de cada ejercicio; los de aislamiento y cardio, según su músculo principal. */
type Base = "push" | "press" | "pull" | "squat" | "hinge" | "core";

function baseOf(exercise: Exercise): Base {
  switch (exercise.pattern) {
    case "horizontal-push": return "push";
    case "vertical-push": return "press";
    case "horizontal-pull":
    case "vertical-pull": return "pull";
    case "squat":
    case "lunge": return "squat";
    case "hinge": return "hinge";
    case "core":
    case "carry": return "core";
    default: {
      const muscle = exercise.primary[0];
      if (muscle === "chest" || muscle === "triceps") return "push";
      if (muscle === "shoulders") return "press";
      if (muscle === "back" || muscle === "lats" || muscle === "traps" || muscle === "biceps" || muscle === "forearms") return "pull";
      if (muscle === "glutes" || muscle === "hamstrings" || muscle === "lowerBack") return "hinge";
      if (muscle === "abs" || muscle === "obliques") return "core";
      return "squat";
    }
  }
}

/** Jumping jacks de bajo impacto; con las rodillas a cuidar, marcha rápida. */
const PULSE = 72;
const PULSE_GENTLE = 5;
/** Movilidad dinámica para cada base: círculos de hombros (82), rotación torácica (80), gato-camello (79), cadera 90/90 (78) y sentadilla profunda asistida (83). */
const MOBILITY: Record<Base, number[]> = {
  push: [82, 80],
  press: [82, 80],
  pull: [80, 82],
  squat: [78, 83],
  hinge: [79, 78],
  core: [79, 80],
};
/** Si faltan (zonas a cuidar, ejercicios ya en la sesión): primero los de la misma mitad del cuerpo. */
const MOBILITY_FALLBACK = { upper: [82, 80, 79, 78], lower: [79, 78, 80, 82] };
/** Lo que prepara cada movimiento de movilidad (para «Enfocado en hombros y espalda alta»). */
const MOBILITY_AREAS: Record<number, string> = { 82: "hombros", 80: "espalda alta", 79: "columna", 78: "caderas", 83: "tobillos" };
/** Activación: flexiones inclinadas (2), remo en W (107), aperturas con banda (54), sentadilla con peso corporal (30) o a silla (1), puente de glúteos (3), cuadrupedia (37) y bicho muerto (36). */
const ACTIVATION: Record<Base, number[]> = {
  push: [2, 107],
  press: [107, 2],
  pull: [107, 54],
  squat: [30, 1, 3],
  hinge: [3, 37],
  core: [36, 37],
};

/**
 * El calentamiento para estos ejercicios: pulso, una o dos de movilidad (dos desde 25 minutos) y una
 * activación. Respeta las zonas a cuidar y tu equipamiento, y no repite ejercicios de la sesión.
 */
export function warmupFor({ records, limitations = [], equipment, minutes = 30 }: {
  records: ExerciseRecord[];
  limitations?: readonly BodyArea[];
  /** Tu equipamiento (`availableEquipment`); sin él, vale todo. */
  equipment?: Set<Equipment>;
  minutes?: number;
}): WarmupItem[] {
  const canUse = (exercise: Exercise) => !equipment || isAvailable(exercise, equipment);
  const main = records.map((record) => exerciseById(record.exerciseId)).filter((exercise): exercise is Exercise => exercise !== undefined && exercise.category !== "mobility");
  if (!main.length) return [];
  const used = new Set(main.map((exercise) => exercise.id));
  const fits = (exercise: Exercise | undefined): exercise is Exercise => {
    if (!exercise || used.has(exercise.id) || !canUse(exercise)) return false;
    return !(exercise.stresses ?? []).some((area) => limitations.includes(area));
  };

  // Peso de cada movimiento base: los primeros ejercicios (los más exigentes) cuentan más.
  const weight = new Map<Base, number>();
  main.forEach((exercise, index) => weight.set(baseOf(exercise), (weight.get(baseOf(exercise)) ?? 0) + Math.max(1, 3 - index)));
  const [first, second] = [...weight.entries()].sort((a, b) => b[1] - a[1]).map(([base]) => base);

  const items: WarmupItem[] = [];
  const pulse = exerciseById(limitations.includes("knees") ? PULSE_GENTLE : PULSE);
  if (pulse && canUse(pulse)) items.push({ exercise: pulse, phase: "pulse", value: minutes >= 30 ? 60 : 45 });

  // Movilidad: primero la del movimiento principal; si el día mezcla dos, una de cada uno.
  const fallback = first === "squat" || first === "hinge" ? MOBILITY_FALLBACK.lower : MOBILITY_FALLBACK.upper;
  const order = [MOBILITY[first][0], ...(second ? [MOBILITY[second][0]] : []), ...MOBILITY[first].slice(1), ...(second ? MOBILITY[second].slice(1) : []), ...fallback];
  const mobility: Exercise[] = [];
  for (const id of order) {
    if (mobility.length === (minutes >= 25 ? 2 : 1)) break;
    const exercise = exerciseById(id);
    if (fits(exercise) && !mobility.includes(exercise)) mobility.push(exercise);
  }
  for (const exercise of mobility) items.push({ exercise, phase: "mobility", value: exercise.unilateral ? 40 : 30 });

  const activation = ACTIVATION[baseOf(main[0])].map((id) => exerciseById(id)).find(fits);
  if (activation) items.push({ exercise: activation, phase: "activation", value: activation.unit === "reps" ? 10 : 30 });
  return items;
}

/** El calentamiento como ejercicios de la sesión: una serie de calentamiento cada uno, con un descanso breve. */
export function warmupRecords(items: WarmupItem[]): ExerciseRecord[] {
  return items.map(({ exercise, value }) => ({ exerciseId: exercise.id, unit: exercise.unit, sets: [{ value, load: 0, done: false, kind: "warmup" }], restSeconds: WARMUP_REST }));
}

/** Minutos aproximados: unos 3 s por repetición y el descanso para cambiar de ejercicio. */
export function warmupMinutes(items: WarmupItem[]) {
  const seconds = items.reduce((sum, item) => sum + (item.exercise.unit === "reps" ? item.value * 3 : item.value) + WARMUP_REST, 0);
  return Math.max(1, Math.round(seconds / 60));
}

/** «60 s» o «10 rep». */
export function warmupTarget(item: WarmupItem) {
  return item.exercise.unit === "reps" ? `${item.value} rep` : `${item.value} s`;
}

/** «hombros y espalda alta»: lo que prepara la movilidad elegida (null si no hay). */
export function warmupFocus(items: WarmupItem[]) {
  const areas = [...new Set(items.filter((item) => item.phase === "mobility").map((item) => MOBILITY_AREAS[item.exercise.id]).filter(Boolean))];
  return areas.length ? areas.join(" y ") : null;
}
