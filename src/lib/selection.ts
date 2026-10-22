import { equipmentLabels, muscleLabels } from "@/data/catalog";
import { estimateOneRepMax } from "@/lib/progression";
import { isCompound } from "@/lib/prescription";
import { isWorkingSet } from "@/lib/training";
import { joinList } from "@/lib/utils";
import type { BodyArea, Equipment, Exercise, ExerciseLevel, MovementPattern, MuscleGroup, TrainingLocation, WorkoutEntry } from "@/types";

/**
 * Selección: no busca el mejor ejercicio del mundo, sino el mejor para ti, tu objetivo, hoy y con lo que
 * tienes. Cada candidato suma por recuperación, potencial de progresión, nivel, objetivo, músculos que
 * necesitan trabajo esta semana, continuidad (lo que vienes progresando se mantiene) y adherencia (lo que
 * cambias o te molestó baja). Los puntajes son internos: lo que se muestra es el porqué, nunca un «92 %».
 */

type SelectionGoal = "strength" | "muscle" | "weight" | "energy" | "habits";
const DAY = 86_400_000;

/** Series semanales por músculo como referencia de producto (no norma médica): principiante 4–8, intermedio 8–12, avanzado 10–20. */
export function weeklySetTarget(level: ExerciseLevel): [number, number] {
  return level === 1 ? [4, 8] : level === 2 ? [8, 12] : [10, 20];
}

export interface ExerciseTrend {
  /** Sesiones con el ejercicio en las últimas 6 semanas. */
  sessions: number;
  /** Semanas entre la primera y la última de esas sesiones. */
  weeks: number;
  /** Mejoró desde la primera de esas sesiones (más carga estimada, repeticiones o segundos). */
  progressing: boolean;
  /** Tres o más sesiones sin superar su mejor marca anterior. */
  stalled: boolean;
}

/** Rendimiento de una sesión: 1RM estimado si hay carga; si no, las mejores repeticiones o segundos. */
function performance(sets: Array<{ value: number; load: number }>) {
  return Math.max(0, ...sets.map((set) => (set.load > 0 ? estimateOneRepMax(set.load, set.value) : set.value)));
}

/** Cómo viene un ejercicio en tus últimas 6 semanas. */
export function exerciseTrend(workouts: WorkoutEntry[], exerciseId: number, now: number): ExerciseTrend | null {
  const points = workouts
    .filter((workout) => now - Date.parse(workout.completedAt) <= 42 * DAY)
    .map((workout) => ({ at: Date.parse(workout.completedAt), value: performance(workout.records?.find((record) => record.exerciseId === exerciseId)?.sets.filter((set) => set.done && isWorkingSet(set)) ?? []) }))
    .filter((point) => point.value > 0)
    .sort((a, b) => a.at - b.at);
  if (!points.length) return null;
  const last = points[points.length - 1];
  const best = (list: typeof points) => Math.max(...list.map((point) => point.value));
  const stalled = points.length >= 3 && best(points.slice(-3)) <= best(points.slice(0, -3).length ? points.slice(0, -3) : points.slice(0, 1));
  return {
    sessions: points.length,
    weeks: Math.max(1, Math.round((last.at - points[0].at) / (7 * DAY))),
    progressing: points.length >= 2 && last.value > points[0].value * 1.01,
    stalled,
  };
}

const MACHINES: Equipment[] = ["press-machines", "leg-machines", "leg-press", "cable"];
const usesMachine = (exercise: Exercise) => exercise.equipment.some((option) => option.some((item) => MACHINES.includes(item)));

/** Encaje con el objetivo (interno, 0–8): no hay «mejor» universal, sólo más o menos adecuado. */
function goalFit(exercise: Exercise, goal: SelectionGoal) {
  const loaded = exercise.increment > 0;
  if (goal === "strength") return isCompound(exercise) ? (loaded ? 8 : 4) : 1;
  if (goal === "muscle") return isCompound(exercise) ? (loaded ? 7 : 4) : loaded || usesMachine(exercise) ? 5 : 2;
  return exercise.equipment.length === 0 || !usesMachine(exercise) ? 6 : 4;
}

export interface ScoreContext {
  goal: SelectionGoal;
  level: ExerciseLevel;
  recovery?: Record<MuscleGroup, number>;
  /** Ya elegidos hoy (para no repetir el mismo músculo principal). */
  chosen: Exercise[];
  /** Veces que cambiaste cada ejercicio. */
  avoid?: Record<string, number>;
  /** Ejercicios que te molestaron hace poco («¿Cómo salió?» → Molestia). */
  painful: Set<number>;
  /** Tus favoritos de la biblioteca: suman un poco (lo que te gusta, lo repites). */
  favorites?: Set<number>;
  trends: Map<number, ExerciseTrend | null>;
  /** Series de esta semana por músculo (para darle prioridad a lo que falta). */
  weekSets?: Record<MuscleGroup, number>;
  /** «Otra variante»: se explora en vez de mantener. */
  exploring: boolean;
  seed: number;
}

function hash(value: number) {
  let x = (value ^ 0x5bd1e995) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) >>> 0;
  x = Math.imul(x ^ (x >>> 12), 0x297a2d39) >>> 0;
  return (x ^ (x >>> 15)) >>> 0;
}

/** Recuperación promedio de los músculos principales del ejercicio (100 sin datos). */
export function freshness(exercise: Exercise, recovery?: Record<MuscleGroup, number>) {
  return recovery && exercise.primary.length ? exercise.primary.reduce((sum, muscle) => sum + recovery[muscle], 0) / exercise.primary.length : 100;
}

/** Continuidad y adherencia: lo que progresas y tus favoritos se mantienen; lo que cambias o te molestó, baja. */
export function historyScore(exercise: Exercise, context: Pick<ScoreContext, "avoid" | "painful" | "favorites" | "trends" | "exploring">) {
  const adherence = -Math.min(3, context.avoid?.[exercise.id] ?? 0) * 25 - (context.painful.has(exercise.id) ? 60 : 0) + (context.favorites?.has(exercise.id) ? 14 : 0);
  const trend = context.trends.get(exercise.id);
  const continuity = context.exploring || !trend || trend.stalled ? 0 : 28 + (trend.progressing ? 8 : 0);
  return adherence + continuity;
}

/** Puntaje interno de un candidato para un hueco de la sesión. */
export function scoreCandidate(exercise: Exercise, context: ScoreContext) {
  const fresh = freshness(exercise, context.recovery);
  const progression = exercise.increment > 0 ? 14 : exercise.harder ? 8 : 4;
  const levelFit = 10 - Math.abs(exercise.level - context.level) * 6;
  const overlap = context.chosen.some((item) => item.primary.some((muscle) => exercise.primary.includes(muscle))) ? -25 : 0;
  const [low] = weeklySetTarget(context.level);
  const need = context.weekSets && exercise.primary.length
    ? (exercise.primary.reduce((sum, muscle) => sum + Math.max(0, low - (context.weekSets?.[muscle] ?? 0)) / low, 0) / exercise.primary.length) * 12
    : 0;
  // El desempate cambia con «Otra variante»; sin pedirla, pesa poco: nada de variedad al azar.
  const rotation = hash(exercise.id * 7919 + context.seed) % (context.exploring ? 30 : 8);
  return { fresh, score: fresh * 0.5 + progression + levelFit + overlap + goalFit(exercise, context.goal) + need + historyScore(exercise, context) + rotation };
}

/** Prioridad entre compuestos: lo que más exige (sentadilla, bisagra) primero y el trabajo a una pierna al final. */
const patternRank: Partial<Record<MovementPattern, number>> = { squat: 0, hinge: 1, "horizontal-push": 2, "vertical-push": 3, "vertical-pull": 4, "horizontal-pull": 5, lunge: 6 };

/**
 * Orden de la sesión por prioridad: los compuestos primero (con carga antes que con peso corporal; el
 * principal, arriba), luego acarreos y aislamientos, y el núcleo al final. Lo primero es lo que más
 * técnica y energía pide, y lo último es lo que se recorta si falta tiempo.
 */
export function sessionOrder(exercises: Exercise[]) {
  const tier = (exercise: Exercise) => (isCompound(exercise) ? 0 : exercise.category !== "strength" ? 1 : exercise.pattern === "carry" ? 2 : exercise.pattern === "core" ? 4 : 3);
  const rank = (exercise: Exercise) => (isCompound(exercise) ? (exercise.increment > 0 ? 0 : 10) + (patternRank[exercise.pattern] ?? 9) : 0);
  return exercises.map((exercise, index) => ({ exercise, index })).sort((a, b) => tier(a.exercise) - tier(b.exercise) || rank(a.exercise) - rank(b.exercise) || a.index - b.index).map((item) => item.exercise);
}

const movementGroup = (exercise: Exercise) => (exercise.pattern === "squat" || exercise.pattern === "lunge" ? "knee"
  : exercise.pattern === "horizontal-push" || exercise.pattern === "vertical-push" ? "push"
    : exercise.pattern === "horizontal-pull" || exercise.pattern === "vertical-pull" ? "pull" : exercise.pattern);

/**
 * Qué ejercicio sacar primero si no cabe en el tiempo: el último cuyo movimiento (rodilla, empuje,
 * tirón…) ya está cubierto por otro; si todos son distintos, el último. Así una sesión corta conserva
 * rodilla, empuje, tirón y bisagra antes que repetir un patrón.
 */
export function leastNeeded(exercises: Exercise[]) {
  const counts = new Map<string, number>();
  for (const exercise of exercises) counts.set(movementGroup(exercise), (counts.get(movementGroup(exercise)) ?? 0) + 1);
  for (let index = exercises.length - 1; index >= 0; index -= 1) {
    if ((counts.get(movementGroup(exercises[index])) ?? 0) > 1) return index;
  }
  return exercises.length - 1;
}

// ─── ¿Por qué está aquí? ─────────────────────────────────────────────────

const roleLead: Record<MovementPattern, string> = {
  squat: "Es tu movimiento dominante de rodilla",
  hinge: "Necesitamos una bisagra de cadera",
  lunge: "Trabajo a una pierna, cada lado por separado",
  "horizontal-push": "Es el empuje de hoy",
  "vertical-push": "Es el empuje por encima de la cabeza",
  "horizontal-pull": "Equilibra el empuje con un tirón",
  "vertical-pull": "Es el tirón vertical de hoy",
  core: "Núcleo: estabilidad para el resto de tus ejercicios",
  carry: "Acarreo: agarre, postura y núcleo",
  isolation: "Accesorio para completar el trabajo",
  cardio: "Para subir el pulso y tu resistencia",
  mobility: "Movilidad para moverte mejor",
};

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const areaText: Record<BodyArea, string> = { knees: "a las rodillas", back: "a la espalda", shoulders: "a los hombros" };

export interface ExerciseWhy {
  /** Por qué está en la sesión («Necesitamos una bisagra de cadera: trabaja isquiotibiales y glúteos.»). */
  role: string;
  /** Por qué esta variante («Entrenas en casa y tienes mancuernas.»). */
  variant: string;
}

/**
 * El porqué de un ejercicio, con lo que hay a mano (también fuera del generador: sesión y ficha): su
 * papel por patrón y músculos, y por qué esta variante (continuidad, molestias, lugar, equipo o nivel).
 */
export function whyExercise(exercise: Exercise, { location, limitations = [], level, trend, favorite = false, replacedForPain }: {
  location: TrainingLocation;
  limitations?: readonly BodyArea[];
  level: ExerciseLevel;
  trend?: ExerciseTrend | null;
  /** Está en tus favoritos. */
  favorite?: boolean;
  /** Nombre del ejercicio que te molestó y éste reemplaza. */
  replacedForPain?: string;
}): ExerciseWhy {
  const muscles = joinList(exercise.primary.map((muscle) => lower(muscleLabels[muscle])));
  const role = exercise.pattern === "core" || exercise.pattern === "carry" || exercise.category !== "strength"
    ? `${roleLead[exercise.pattern]}.`
    : exercise.pattern === "isolation" ? `Accesorio para completar el trabajo de ${muscles}.` : `${roleLead[exercise.pattern]}: trabaja ${muscles}.`;

  const spared = limitations.filter((area) => !(exercise.stresses ?? []).includes(area));
  const equipment = exercise.equipment[0]?.map((item) => lower(equipmentLabels[item])) ?? [];
  const variant = replacedForPain ? `La última vez te molestó ${lower(replacedForPain)}: hoy probamos esta variante.`
    : trend && trend.progressing && trend.sessions >= 2 ? `Lo mantenemos: has progresado en ${trend.weeks >= 2 ? `las últimas ${trend.weeks} semanas` : "tus últimas sesiones"}.`
      : trend && trend.stalled ? "Llevas algunas sesiones sin avanzar: antes de cambiarlo, revisa el descanso y el margen (RIR)."
        : trend && trend.sessions >= 2 ? "Lo mantenemos para que sigas progresando en él."
          : favorite ? "Es uno de tus favoritos."
          : spared.length && isCompound(exercise) ? `Suele exigir menos ${areaText[spared[0]]} que otras variantes.`
            : location === "home" && equipment.length ? `Entrenas en casa y tienes ${joinList(equipment)}.`
              : location === "home" ? "No necesita equipamiento: lo haces donde estés."
                : usesMachine(exercise) ? "En el gimnasio, la máquina te da estabilidad para progresar con control."
                  : level === 1 && exercise.level === 1 ? "Es una variante accesible para empezar con buena técnica."
                    : exercise.increment > 0 && isCompound(exercise) ? "Se carga de a poco, así que es fácil medir tu progreso."
                      : "Encaja con tu objetivo y con lo que tienes disponible.";
  return { role, variant };
}
