import { exercises } from "@/data/mock-data";
import { progressedSets } from "@/lib/progression";
import { lastRecordFor } from "@/lib/training";
import { localDaySeed } from "@/lib/utils";
import type { BodyArea, Equipment, Exercise, ExerciseLevel, ExerciseRecord, MovementPattern, MuscleGroup, NutritionGoal, ReadinessEntry, TrainingPreference, WorkoutEntry } from "@/types";
import { capabilitiesOf, fullGym } from "@/data/equipment";
import { availableLoads, fitLoad, loadCapability, nearestLoad, startingLoad, unfit } from "@/lib/loads";
import { zoneById, type BodyZone } from "@/data/body-zones";

export type WorkoutFocus = "full" | "upper" | "lower" | "conditioning" | "mobility";
export type WorkoutGoal = "strength" | "weight" | "energy" | "habits";

export const focusLabels: Record<WorkoutFocus, string> = {
  full: "Cuerpo completo",
  upper: "Torso",
  lower: "Pierna y glúteos",
  conditioning: "Acondicionamiento",
  mobility: "Movilidad",
};

export const durationOptions = [10, 20, 30, 45, 60] as const;

const slots: Record<WorkoutFocus, MovementPattern[][]> = {
  full: [["squat", "lunge"], ["horizontal-push", "vertical-push"], ["hinge"], ["horizontal-pull", "vertical-pull"], ["core"], ["lunge", "squat"], ["vertical-push", "horizontal-push"], ["isolation", "carry"]],
  upper: [["horizontal-push"], ["horizontal-pull"], ["vertical-push"], ["vertical-pull", "horizontal-pull"], ["isolation"], ["core"], ["isolation"]],
  lower: [["squat"], ["hinge"], ["lunge"], ["isolation", "hinge"], ["core"], ["squat", "lunge"], ["carry", "core"]],
  conditioning: [["cardio"], ["squat", "lunge"], ["horizontal-push"], ["cardio"], ["core"], ["hinge"], ["cardio"]],
  mobility: [["mobility"], ["mobility"], ["mobility"], ["mobility"], ["mobility"], ["mobility"], ["mobility"]],
};

export interface GeneratorInput {
  preference: TrainingPreference;
  minutes: number;
  focus: WorkoutFocus;
  goal?: WorkoutGoal;
  level?: ExerciseLevel;
  limitations?: BodyArea[];
  readiness?: ReadinessEntry["recommendation"];
  recovery?: Record<MuscleGroup, number>;
  workouts?: WorkoutEntry[];
  /** Cambia la selección entre días (o al pedir otra variante). */
  seed?: number;
  exclude?: number[];
  /** Peso corporal (kg) para sugerir cargas iniciales con tus pesas. */
  bodyKg?: number;
  /** Zona del cuerpo a trabajar (glúteos, brazos…): manda sobre el enfoque. */
  zone?: BodyZone;
}

export interface GeneratedWorkout {
  name: string;
  focus: WorkoutFocus;
  zone?: BodyZone;
  records: ExerciseRecord[];
  warmup: Exercise[];
  cooldown: Exercise[];
  restSeconds: number;
  estimatedMinutes: number;
  notes: string[];
}

/** Capacidades disponibles: lo marcado en casa, o lo de tu gimnasio (completo si no lo has ajustado). */
export function availableEquipment(preference: TrainingPreference): Set<Equipment> {
  return capabilitiesOf(preference.location === "gym" ? preference.gymEquipment ?? fullGym : preference.equipment);
}

export function isAvailable(exercise: Exercise, equipment: Set<Equipment>) {
  return exercise.equipment.length === 0 || exercise.equipment.some((option) => option.every((item) => equipment.has(item)));
}

/** Alternativas del mismo patrón (y músculo principal) con el equipamiento disponible. */
export function alternativesFor(exercise: Exercise, equipment?: Set<Equipment>) {
  return exercises
    .filter((item) => item.id !== exercise.id && item.category === exercise.category && item.pattern === exercise.pattern && (!equipment || isAvailable(item, equipment)))
    .sort((a, b) => sharedMuscles(b, exercise) - sharedMuscles(a, exercise) || Math.abs(a.level - exercise.level) - Math.abs(b.level - exercise.level));
}

function sharedMuscles(a: Exercise, b: Exercise) {
  return a.primary.filter((muscle) => b.primary.includes(muscle)).length * 2 + a.secondary.filter((muscle) => b.secondary.includes(muscle)).length;
}

function hash(value: number) {
  let x = (value ^ 0x5bd1e995) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) >>> 0;
  x = Math.imul(x ^ (x >>> 12), 0x297a2d39) >>> 0;
  return (x ^ (x >>> 15)) >>> 0;
}

function exerciseCount(minutes: number, focus: WorkoutFocus) {
  if (focus === "mobility") return Math.max(4, Math.min(7, Math.round(minutes / 2.5)));
  return minutes <= 10 ? 3 : minutes <= 20 ? 4 : minutes <= 30 ? 5 : minutes <= 45 ? 6 : 7;
}

function restFor(exercise: Exercise, goal: WorkoutGoal, focus: WorkoutFocus) {
  if (focus === "mobility") return 15;
  if (focus === "conditioning" || exercise.category === "cardio") return 30;
  const compound = !["isolation", "core", "carry"].includes(exercise.pattern);
  if (goal === "strength") return compound ? 150 : 75;
  if (goal === "weight" || goal === "energy") return compound ? 75 : 45;
  return compound ? 90 : 60;
}

export function estimateMinutes(records: ExerciseRecord[], restSeconds: number) {
  const seconds = records.reduce((sum, record) => {
    const rest = record.restSeconds ?? restSeconds;
    return sum + record.sets.reduce((acc, set) => acc + (record.unit === "seconds" ? set.value : set.value * 3 + 15) + rest, 0) - rest + 45;
  }, 0);
  return Math.max(5, Math.round(seconds / 60));
}

export function generateWorkout(input: GeneratorInput): GeneratedWorkout {
  const goal = input.goal ?? "strength";
  const level = input.level ?? 1;
  const limitations = input.limitations ?? [];
  const equipment = availableEquipment(input.preference);
  const loads = availableLoads(input.preference);
  const seed = input.seed ?? 0;
  const recovery = input.recovery;
  const notes: string[] = [];
  const focus = input.focus;
  let count = exerciseCount(input.minutes, focus);
  let setDelta = 0;

  if (input.readiness === "recovery" && focus !== "mobility") {
    notes.push("Tu chequeo pide recuperar: sesión más liviana, con menos series y variantes accesibles.");
    count = Math.max(3, count - 2);
    setDelta = -1;
  } else if (input.readiness === "short") {
    notes.push("Energía moderada: una serie menos por ejercicio para sumar sin acumular fatiga.");
    count = Math.max(3, count - 1);
    setDelta = -1;
  }
  if (limitations.length) notes.push("Se evitan ejercicios que exigen las zonas que indicaste cuidar.");

  const chosen: Exercise[] = [];
  const skippedForRecovery = new Set<string>();
  // Carga ideal de cada ejercicio: la de tu historial o una sugerencia inicial según tu peso y nivel.
  const idealLoad = (exercise: Exercise) => {
    const last = input.workouts ? lastRecordFor(input.workouts, exercise.id) : undefined;
    const top = last ? Math.max(0, ...last.sets.filter((set) => set.done).map((set) => set.load)) : 0;
    return top > 0 ? top : startingLoad(exercise, input.bodyKg, level);
  };
  // Con tus pesas marcadas, se evitan ejercicios para los que son demasiado livianas o pesadas.
  const loadFits = (exercise: Exercise) => {
    const capability = loads ? loadCapability(exercise, equipment) : undefined;
    const available = capability ? loads?.[capability] : undefined;
    if (!available?.length) return true;
    const target = idealLoad(exercise);
    return !unfit(target / nearestLoad(target, available));
  };
  const usable = exercises.filter((exercise) =>
    isAvailable(exercise, equipment)
    && loadFits(exercise)
    && !(exercise.stresses ?? []).some((area) => limitations.includes(area))
    && exercise.level <= Math.min(3, level + (input.readiness === "recovery" ? 0 : 1))
    && !(input.exclude ?? []).includes(exercise.id));

  const zone = zoneById(input.zone);
  if (zone) {
    // Rutina por zona: ejercicios de fuerza cuyo músculo principal es la zona, variando el movimiento.
    // Peso de cada músculo: los de la zona cuentan entero; los de apoyo, menos.
    const weight = (muscle: MuscleGroup) => (zone.muscles.includes(muscle) ? 1 : zone.support?.includes(muscle) ? 0.35 : 0);
    const hits = (muscles: MuscleGroup[]) => muscles.reduce((sum, muscle) => sum + weight(muscle), 0);
    const pool = usable.filter((exercise) => exercise.category === "strength" && (hits(exercise.primary) > 0 || hits(exercise.secondary) > 0));
    const patternsUsed = new Map<string, number>();
    const musclesUsed = new Map<MuscleGroup, number>();
    while (chosen.length < count) {
      const scored = pool.filter((exercise) => !chosen.some((item) => item.id === exercise.id)).map((exercise) => {
        const primary = hits(exercise.primary);
        const repeat = (patternsUsed.get(exercise.pattern) ?? 0) * 9;
        // Alterna entre los músculos de la zona (bíceps y tríceps, dorsales y espalda media…).
        const sameMuscle = exercise.primary.filter((muscle) => zone.muscles.includes(muscle)).reduce((sum, muscle) => sum + (musclesUsed.get(muscle) ?? 0), 0) * 8;
        // En una zona el nivel pesa menos: un aislamiento básico sirve a cualquier nivel.
        const levelFit = 10 - Math.abs(exercise.level - level) * 3;
        const loaded = exercise.equipment.length > 0 ? 6 : 0;
        const rotation = hash(exercise.id * 7919 + seed) % 14;
        // Más específico, mejor: una extensión de tríceps antes que un press de banca para «brazos».
        const specific = exercise.primary.length ? primary / exercise.primary.length : 0;
        return { exercise, primary, score: Math.min(primary, 1.5) * 20 + specific * 30 + hits(exercise.secondary) * 6 + levelFit + loaded + rotation - repeat - sameMuscle };
      }).sort((a, b) => b.score - a.score);
      // Primero lo que trabaja la zona como músculo principal; si no alcanza, lo que la apoya.
      const pick = scored.find((item) => item.primary >= 1) ?? scored.find((item) => item.primary > 0) ?? scored[0];
      if (!pick) break;
      chosen.push(pick.exercise);
      patternsUsed.set(pick.exercise.pattern, (patternsUsed.get(pick.exercise.pattern) ?? 0) + 1);
      for (const muscle of pick.exercise.primary) musclesUsed.set(muscle, (musclesUsed.get(muscle) ?? 0) + 1);
    }
    if (recovery) {
      const fresh = zone.muscles.reduce((sum, muscle) => sum + recovery[muscle], 0) / zone.muscles.length;
      if (fresh < 45) notes.push(`${zone.label} aún se recupera del último entrenamiento: baja el peso o una serie si la sientes cargada.`);
    }
    if (chosen.length < 3) notes.push(`Con tu equipamiento hay pocos ejercicios de ${zone.label.toLowerCase()}: suma equipos en Entrenar para más variedad.`);
  }

  for (const patterns of zone ? [] : slots[focus]) {
    if (chosen.length >= count) break;
    const candidates = usable.filter((exercise) => patterns.includes(exercise.pattern) && !chosen.some((item) => item.id === exercise.id));
    if (!candidates.length) continue;
    const scored = candidates.map((exercise) => {
      const fresh = recovery && exercise.primary.length ? exercise.primary.reduce((sum, muscle) => sum + recovery[muscle], 0) / exercise.primary.length : 100;
      const loaded = exercise.equipment.length > 0 ? 14 : 0;
      const levelFit = 10 - Math.abs(exercise.level - level) * 6;
      const overlap = chosen.some((item) => item.primary.some((muscle) => exercise.primary.includes(muscle))) ? -25 : 0;
      const rotation = hash(exercise.id * 7919 + seed) % 18;
      return { exercise, fresh, score: fresh * 0.5 + loaded + levelFit + overlap + rotation };
    }).sort((a, b) => b.score - a.score);
    const pick = scored.find((item) => item.fresh >= 45) ?? (focus === "mobility" || focus === "conditioning" ? scored[0] : undefined);
    if (!pick) {
      skippedForRecovery.add(patterns[0]);
      continue;
    }
    chosen.push(pick.exercise);
  }
  if (!zone && chosen.length < Math.min(3, count)) {
    const fallback = usable.filter((exercise) => exercise.category !== "mobility" && !chosen.some((item) => item.id === exercise.id))
      .sort((a, b) => (hash(a.id + seed) % 7) - (hash(b.id + seed) % 7));
    chosen.push(...fallback.slice(0, Math.min(3, count) - chosen.length));
  }
  if (skippedForRecovery.size) notes.push("Algunos músculos siguen recuperándose del último entrenamiento; la selección los deja descansar.");

  const restSeconds = Math.round(chosen.reduce((sum, exercise) => sum + restFor(exercise, goal, focus), 0) / Math.max(1, chosen.length) / 15) * 15 || 60;
  let adaptedReps = false;
  let suggestedLoads = false;
  const records: ExerciseRecord[] = chosen.map((exercise) => {
    const count = Math.max(2, Math.min(5, exercise.sets + setDelta + (goal === "strength" && level > 1 && exercise.pattern !== "core" ? 1 : 0) - (input.minutes <= 10 ? 1 : 0)));
    const record: ExerciseRecord = {
      exerciseId: exercise.id,
      unit: exercise.unit,
      sets: progressedSets(exercise, count, input.workouts ? lastRecordFor(input.workouts, exercise.id) : undefined),
      restSeconds: restFor(exercise, goal, focus),
    };
    // Ajuste a tus pesas: carga más cercana a la ideal y repeticiones (o una serie más) para compensar.
    const capability = loads ? loadCapability(exercise, equipment) : undefined;
    const available = capability ? loads?.[capability] : undefined;
    if (!available?.length) return record;
    const fresh = record.sets.every((set) => set.load === 0);
    const fit = fitLoad(exercise, fresh ? startingLoad(exercise, input.bodyKg, level) : record.sets[0].load, available);
    if (fresh) suggestedLoads = true;
    if (fit.adapted) adaptedReps = true;
    const [low, high] = fit.range;
    record.sets = record.sets.map((set) => ({ ...set, load: fit.load, value: fresh ? low : Math.min(high, Math.max(low, set.value)) }));
    if (fit.adapted) record.range = fit.range;
    if (fit.extraSet && record.sets.length < 5) record.sets.push({ ...record.sets[record.sets.length - 1] });
    return record;
  });
  if (adaptedReps) notes.push("Ajustamos repeticiones y series a las pesas que tienes: con peso liviano, más repeticiones y bajada lenta.");
  if (suggestedLoads) notes.push("Las cargas son una sugerencia inicial según tu peso y nivel: ajústalas si te sobran o faltan repeticiones.");

  // Ajusta la sesión al tiempo disponible: primero quita series de los últimos ejercicios, luego ejercicios.
  const budget = input.minutes * 1.1;
  for (let guard = 0; guard < 40 && records.length && estimateMinutes(records, restSeconds) > budget; guard += 1) {
    const reducible = [...records].reverse().find((record) => record.sets.length > 2);
    if (reducible && (records.length <= 3 || reducible !== records.at(-1))) reducible.sets.pop();
    else if (records.length > 3) records.pop();
    else break;
  }

  const mobility = exercises.filter((exercise) => exercise.category === "mobility" && !(exercise.stresses ?? []).some((area) => limitations.includes(area)));
  const worked = new Set(records.flatMap((record) => exercises.find((item) => item.id === record.exerciseId)?.primary ?? []));
  const byRelevance = [...mobility].sort((a, b) => b.primary.filter((m) => worked.has(m)).length - a.primary.filter((m) => worked.has(m)).length || (hash(a.id + seed) % 5) - (hash(b.id + seed) % 5));
  const warmup = focus === "mobility" ? [] : byRelevance.slice(0, 3);
  const cooldown = focus === "mobility" ? [] : byRelevance.slice(3, 5);

  return {
    name: `${zone ? zone.label : focusLabels[focus]} · ${input.minutes} min`,
    focus,
    ...(zone ? { zone: zone.id } : {}),
    records,
    warmup,
    cooldown,
    restSeconds,
    estimatedMinutes: estimateMinutes(records, restSeconds),
    notes,
  };
}

/** Enfoque sugerido para hoy: el grupo más recuperado, alternando torso y pierna. */
export function suggestedFocus(recovery: Record<MuscleGroup, number> | undefined, readiness?: ReadinessEntry["recommendation"]): WorkoutFocus {
  if (readiness === "recovery") return "mobility";
  if (!recovery) return "full";
  const average = (muscles: MuscleGroup[]) => muscles.reduce((sum, muscle) => sum + recovery[muscle], 0) / muscles.length;
  const upper = average(["chest", "back", "lats", "shoulders", "triceps", "biceps"]);
  const lower = average(["quads", "hamstrings", "glutes", "calves"]);
  if (upper >= 85 && lower >= 85) return "full";
  return upper >= lower ? "upper" : "lower";
}

/** Nivel orientativo a partir de la evaluación inicial. */
export function levelFromActivities(activities: string[] = []): ExerciseLevel {
  if (activities.includes("regular")) return 3;
  if (activities.includes("some")) return 2;
  return 1;
}

export function goalFromProfile(goals: string[] = []): WorkoutGoal {
  const first = goals[0];
  return first === "weight" || first === "energy" || first === "habits" || first === "strength" ? first : "strength";
}

/** El objetivo de Nutrición manda sobre la evaluación: bajar grasa → descansos cortos; ganar músculo → más series. */
export function trainingGoal(goals: string[] = [], nutritionGoal?: NutritionGoal): WorkoutGoal {
  if (nutritionGoal === "lose") return "weight";
  if (nutritionGoal === "gain") return "strength";
  return goalFromProfile(goals);
}

/** Zonas a cuidar de la evaluación, sin "none" ni respuestas libres. */
export function profileLimitations(limitations: string[] | undefined): BodyArea[] {
  return (limitations ?? []).filter((item): item is BodyArea => item === "knees" || item === "back" || item === "shoulders");
}

/** Lo que el generador necesita de la evaluación inicial. */
type ProfileForToday = { goals?: string[]; activities?: string[]; limitations?: string[]; recommendation?: { sessionMinutes: number } } | null | undefined;

/**
 * Entradas del generador para la sesión de hoy. Inicio y Entrenar usan las mismas, así «Personalizar»
 * siempre muestra la sesión de la portada. `now` fija la semilla del día; `minutes`, `focus` y `variant`
 * permiten ajustarla desde Entrenar.
 */
export function todayGeneratorInput({ profile, nutritionGoal, preference, workouts, readiness, recovery, now, minutes, focus, zone, variant = 0, bodyKg }: {
  profile: ProfileForToday;
  nutritionGoal?: NutritionGoal;
  preference: TrainingPreference;
  workouts: WorkoutEntry[];
  readiness?: ReadinessEntry["recommendation"];
  recovery?: Record<MuscleGroup, number>;
  now: number;
  minutes?: number;
  focus?: WorkoutFocus;
  zone?: BodyZone;
  variant?: number;
  bodyKg?: number | null;
}): GeneratorInput {
  const zoneInfo = zoneById(zone);
  return {
    preference,
    minutes: minutes ?? profile?.recommendation?.sessionMinutes ?? 30,
    focus: zoneInfo ? zoneInfo.base : focus ?? suggestedFocus(recovery, readiness),
    ...(zoneInfo ? { zone: zoneInfo.id } : {}),
    goal: trainingGoal(profile?.goals, nutritionGoal),
    level: levelFromActivities(profile?.activities),
    limitations: profileLimitations(profile?.limitations),
    readiness,
    recovery,
    workouts,
    seed: localDaySeed(now) + variant,
    bodyKg: bodyKg ?? undefined,
  };
}
