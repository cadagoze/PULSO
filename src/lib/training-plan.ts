import { defaultQuality, exerciseQuality } from "@/data/exercise-quality";
import { exercises } from "@/data/mock-data";
import { estimateMinutes } from "@/lib/duration";
import { buildRecord, createWorkspace, oneSetLess, profileLimitations, trainingGoal, trainingLevel, whyFor } from "@/lib/generator";
import type { GeneratedWorkout, Workspace } from "@/lib/generator";
import type { ExerciseRole } from "@/lib/prescription";
import { recommendStructure, structureFor } from "@/lib/program-structure";
import type { DayTemplate, PlanGoal, PlanSlot, Structure, TrainingSplit } from "@/lib/program-structure";
import { scoreCandidate } from "@/lib/selection";
import { cleanDays } from "@/lib/training-days";
import { localDaySeed } from "@/lib/utils";
import { volumeShift } from "@/lib/volume-adaptation";
import { warmupFor, warmupRecords } from "@/lib/warmup";
import { coreMuscles, effectiveSets, emptyMuscles, muscleCredit, regionLabels, regionOf, sessionCap, supportMuscles, trackedMuscles, trackedSets, weeklyStart, weeklyTarget } from "@/lib/volume";
import type { Region } from "@/lib/volume";
import type { RegionChange } from "@/lib/volume-adaptation";
import type { BodyArea, Exercise, ExerciseLevel, ExerciseRecord, MovementPattern, MuscleGroup, NutritionGoal, ReadinessEntry, TrainingPreference, WorkoutEntry } from "@/types";

/**
 * El plan: la estructura semanal ya resuelta con ejercicios y series. Separa las capas: la estructura
 * decide los días y sus huecos, la selección elige el ejercicio de cada hueco, la prescripción fija series,
 * repeticiones, margen y descanso, y aquí se reparte el volumen de la semana y se ajusta cada día al tiempo.
 * Todo es una función de tus datos (sin azar y sin conexión): con los mismos datos, el mismo plan.
 */

export interface PlanInput {
  preference: TrainingPreference;
  goal?: PlanGoal;
  level?: ExerciseLevel;
  /** Minutos por sesión, con el calentamiento dentro si `warmup` está activo. */
  minutes: number;
  /** Días de entreno disponibles por semana (1–6). */
  daysPerWeek: number;
  weekdays?: readonly number[];
  limitations?: BodyArea[];
  workouts?: WorkoutEntry[];
  now?: number;
  /** Semilla del bloque: constante durante varias semanas para no cambiar de ejercicios sin motivo. */
  seed?: number;
  avoid?: Record<string, number>;
  favorites?: number[];
  bodyKg?: number;
  /** Estructura elegida por la persona; sin ella, la recomendada. */
  splitOverride?: TrainingSplit;
  /** El calentamiento del día cuenta dentro del tiempo de la sesión (falso si lo desactivó). */
  warmup?: boolean;
  /** Sólo para la sesión de hoy: ajusta los días a estos minutos sin cambiar la estructura del plan. */
  minutesOverride?: number;
  /** «Otra variante» (0 = la de siempre): explora ejercicios en vez de mantener los que vienes haciendo. */
  variant?: number;
  /** Series de más o de menos por región en esta semana, según cómo te fue (ver adaptación). */
  shift?: Partial<Record<Region, number>>;
}

export interface PlannedExercise {
  exerciseId: number;
  /** Hueco de la estructura (rodilla, empuje horizontal…). */
  slot: string;
  role: ExerciseRole;
  sets: number;
  /** Descanso máximo en segundos cuando el tiempo aprieta (sin valor: el de la prescripción). */
  rest?: number;
  /** Superserie: los ejercicios con la misma letra alternan sus series. */
  group?: string;
}

export interface PlannedDay {
  id: string;
  name: string;
  focus: string;
  exercises: PlannedExercise[];
  /** Duración estimada, con el calentamiento. */
  minutes: number;
}

export interface TrainingPlan {
  split: TrainingSplit;
  label: string;
  reason: string;
  alternative?: Structure["alternative"];
  goal: PlanGoal;
  level: ExerciseLevel;
  /** Sesiones de fuerza por semana que propone el plan (puede ser menos que los días disponibles). */
  daysPerWeek: number;
  availableDays: number;
  minutes: number;
  days: PlannedDay[];
  /** Orden en que se hacen los días. */
  cycle: string[];
  /** Series efectivas por músculo y semana (promedio de dos semanas del ciclo). */
  weekly: Record<MuscleGroup, number>;
  /** Avisos: lo que falta (equipo) o lo que se ajustó. */
  notes: string[];
  /** La estructura recomendada y, a lo sumo, una alternativa (más la elegida si es otra): nunca una lista larga. */
  options: Array<{ split: TrainingSplit; label: string; reason: string; recommended: boolean }>;
  /** La estructura la eligió la persona (no es la recomendada). */
  chosen: boolean;
}

const PUSH_PATTERNS = new Set<string>(["horizontal-push", "vertical-push"]);
const PULL_PATTERNS = new Set<string>(["horizontal-pull", "vertical-pull"]);

const MAX_SETS: Record<ExerciseRole, number> = { main: 4, compound: 4, accessory: 4, core: 3 };
const MIN_SETS = 2;
/** Una sesión tiene al menos cuatro ejercicios cuando hay con qué completarla. */
const MIN_EXERCISES = 4;

/** Cuántos ejercicios caben con sentido en una sesión de esa duración: más es inflar la sesión, no entrenar mejor. */
const maxExercises = (minutes: number) => (minutes <= 20 ? 4 : minutes <= 30 ? 5 : minutes <= 45 ? 6 : minutes <= 60 ? 7 : 8);

/**
 * Series de partida de cada papel: pocas y suficientes. Después se reparten según lo que le falte a cada
 * músculo en la semana y el tiempo que haya.
 */
function baseSets(role: ExerciseRole, level: ExerciseLevel, goal: PlanGoal) {
  if (role === "main") return level === 1 || goal === "strength" || goal === "habits" || goal === "energy" ? 3 : 4;
  if (role === "compound") return level === 1 ? 2 : 3;
  if (role === "accessory") return level === 1 ? 2 : 3;
  return level === 3 ? 3 : 2;
}

/** El tiempo de la sesión puede pasarse un poco del pedido (la estimación no es exacta). */
const TOLERANCE = 1.02;

interface Draft {
  exercise: Exercise;
  slot: PlanSlot;
  sets: number;
  group?: string;
  /** Descanso máximo cuando el tiempo aprieta. */
  rest?: number;
}

const exerciseOf = (id: number) => exercises.find((item) => item.id === id);

// ─── Selección por hueco ────────────────────────────────────────────────

interface Memory {
  /** Ejercicios ya elegidos para cada movimiento (clave del hueco). */
  byKey: Map<string, number[]>;
  /** Ejercicios ya usados en otros huecos. */
  used: Map<number, string>;
}

/** Repetir el mismo ejercicio en los días que trabajan un movimiento (principiantes, fuerza, constancia) o alternar variantes. */
function repeatsExercises(level: ExerciseLevel, goal: PlanGoal) {
  return level === 1 || goal === "strength" || goal === "habits" || goal === "energy";
}

const qualityOf = (exercise: Exercise) => exerciseQuality[exercise.id] ?? defaultQuality;

function pickForSlot(ws: Workspace, slot: PlanSlot, day: Draft[], memory: Memory): Exercise | null {
  const dayIds = new Set(day.map((item) => item.exercise.id));
  // Un patrón alternativo no puede repetir un movimiento que el día ya tiene (dos empujes horizontales, dos sentadillas).
  const dayPatterns = new Set(day.filter((item) => item.exercise.pattern !== "isolation" && item.exercise.pattern !== "core").map((item) => item.exercise.pattern));
  const leadsMuscle = (exercise: Exercise) => !slot.muscles || exercise.primary.some((muscle) => slot.muscles?.includes(muscle));
  const fresh = (exercise: Exercise) => exercise.category === "strength" && slot.patterns.includes(exercise.pattern) && !dayIds.has(exercise.id)
    && (slot.muscles || exercise.pattern === "isolation" || exercise.pattern === "core" || !dayPatterns.has(exercise.pattern));
  const matching = ws.usable.filter((exercise) => fresh(exercise) && leadsMuscle(exercise));
  // La bisagra prefiere lo que trabaja isquiotibiales; sin ese equipo, vale cualquier bisagra. Los aislamientos sí exigen su músculo.
  const all = matching.length || slot.patterns.includes("isolation") ? matching : ws.usable.filter((exercise) => fresh(exercise));
  if (!all.length) return null;
  // El primer patrón aceptable cuyo mejor ejercicio no sea mucho peor que el mejor de todos (si el equipo sólo
  // permite un pull-over como tirón vertical, mejor un remo).
  const bestQuality = Math.max(...all.map(qualityOf));
  const pattern = slot.patterns.find((item) => {
    const pool = all.filter((exercise) => exercise.pattern === item);
    return pool.length > 0 && Math.max(...pool.map(qualityOf)) >= bestQuality - 2;
  });
  const pool = pattern ? all.filter((exercise) => exercise.pattern === pattern) : all;
  const previous = memory.byKey.get(slot.key) ?? [];
  // Se repite el mismo ejercicio por política (principiantes, fuerza, constancia) o porque no hay una variante decente;
  // si la hay, la variante sale de las decentes (no de lo que sobra del catálogo).
  const variants = pool.filter((exercise) => !previous.includes(exercise.id) && qualityOf(exercise) >= 6);
  const reuse = (repeatsExercises(ws.level, ws.goal) && slot.role !== "accessory") || (previous.length > 0 && variants.length === 0);
  const candidates = !reuse && previous.length > 0 ? variants : pool;
  // Los huecos ya reparten los músculos: aquí no se castiga que dos ejercicios compartan alguno (sentadilla y bisagra comparten glúteos).
  ws.context.chosen = [];
  let best: { exercise: Exercise; score: number } | null = null;
  for (const exercise of candidates) {
    let score = scoreCandidate(exercise, ws.context).score;
    if (previous.includes(exercise.id)) score += reuse ? 40 : -30;
    else if (memory.used.has(exercise.id) && memory.used.get(exercise.id) !== slot.key) score -= 18;
    if (!best || score > best.score) best = { exercise, score };
  }
  return best?.exercise ?? null;
}

// ─── Tiempo ─────────────────────────────────────────────────────────────

const byImportance = (a: Draft, b: Draft) => a.slot.priority - b.slot.priority;

/** El tiempo de cada sesión: lo que pides, con su margen, y si el calentamiento cuenta dentro. */
interface Fit {
  minutes: number;
  budget: number;
  warmup: boolean;
}

const recordCache = new WeakMap<Workspace, Map<string, ExerciseRecord>>();

/** El ejercicio tal como lo harás hoy (con tu progresión y tus pesas): así el tiempo del plan es el de la sesión. */
function recordFor(ws: Workspace, draft: Draft, minutes: number): ExerciseRecord {
  const cache = recordCache.get(ws) ?? new Map<string, ExerciseRecord>();
  recordCache.set(ws, cache);
  const key = `${draft.exercise.id}|${draft.slot.role}|${minutes}|${draft.sets}|${draft.rest ?? ""}`;
  const record = cache.get(key) ?? buildRecord(ws, draft.exercise, { role: draft.slot.role, minutes, sets: draft.sets, rest: draft.rest }).record;
  cache.set(key, record);
  return draft.group ? { ...record, group: draft.group } : record;
}

/** Los más importantes primero; los dos de una superserie van juntos, en el lugar del primero. */
function inOrder(drafts: Draft[]) {
  const sorted = [...drafts].sort(byImportance);
  return sorted.flatMap((draft) => {
    if (!draft.group) return [draft];
    const members = sorted.filter((other) => other.group === draft.group);
    return members[0] === draft ? members : [];
  });
}

/** La sesión con su calentamiento (el del día, para estos ejercicios) cuando cuenta dentro del tiempo. */
function withWarmup(ws: Workspace, records: ExerciseRecord[], minutes: number, on: boolean): ExerciseRecord[] {
  if (!on) return records;
  return [...warmupRecords(warmupFor({ records, limitations: ws.limitations, equipment: ws.equipment, minutes })), ...records];
}

const dayMinutes = (ws: Workspace, drafts: Draft[], fit: Fit) => estimateMinutes(withWarmup(ws, inOrder(drafts).map((draft) => recordFor(ws, draft, fit.minutes)), fit.minutes, fit.warmup), 60);


/** Descanso máximo por papel cuando el tiempo aprieta: lo principal sigue descansando lo que necesita. */
const REST_CAP: Record<ExerciseRole, number> = { main: 120, compound: 90, accessory: 60, core: 45 };
/** Con 15 minutos o menos no queda otra: descansos de 30 a 90 s (y superseries). */
const REST_CAP_TIGHT: Record<ExerciseRole, number> = { main: 90, compound: 60, accessory: 45, core: 30 };

/**
 * Pares que se pueden hacer en superserie sin estorbarse: músculos distintos de regiones distintas
 * (empuje + tirón, torso + pierna) o bíceps con tríceps. Lo principal sólo se empareja si el tiempo es muy
 * corto y el objetivo no es la fuerza máxima.
 */
function pairable(a: Draft, b: Draft, allowMain: boolean) {
  if (a.group || b.group) return false;
  // El ejercicio de mayor prioridad (el principal pesado) siempre va en series rectas; otros principales sólo con el tiempo muy justo.
  if (a.slot.priority === 1 || b.slot.priority === 1) return false;
  if (!allowMain && (a.slot.role === "main" || b.slot.role === "main")) return false;
  const lead = (draft: Draft) => draft.exercise.primary[0];
  const [ra, rb] = [regionOf[lead(a)], regionOf[lead(b)]];
  return ra === rb ? ra === "arms" && lead(a) !== lead(b) : true;
}

/**
 * Acorta una sesión hasta que quepa, y siempre en este orden: lo opcional, los descansos (de lo accesorio a lo
 * principal), las superseries, una serie menos a lo menos importante, los ejercicios de menor prioridad
 * (mínimo tres) y, por último, series de lo principal. Lo imprescindible es lo que menos se toca.
 */
function fitDay(ws: Workspace, drafts: Draft[], fit: Fit): Draft[] {
  let items = [...drafts].sort(byImportance);
  const over = () => dayMinutes(ws, items, fit) > fit.budget;
  const drop = (item: Draft) => {
    if (item.group) for (const other of items) if (other !== item && other.group === item.group) other.group = undefined;
    items = items.filter((other) => other !== item);
  };
  // 1) Lo opcional, de menor prioridad a mayor (sin dejar la sesión en menos de tres ejercicios).
  while (over() && items.length > 3) {
    const optional = [...items].filter((item) => item.slot.optional).sort((a, b) => b.slot.priority - a.slot.priority)[0];
    if (!optional) break;
    drop(optional);
  }
  // 2) Descansos más cortos, empezando por los accesorios.
  for (const role of ["accessory", "core", "compound", "main"] as const) {
    if (!over()) break;
    for (const item of items) if (item.slot.role === role) item.rest = (fit.minutes <= 15 ? REST_CAP_TIGHT : REST_CAP)[role];
  }
  // 3) Superseries: ahorran los descansos sin quitar series.
  const allowMain = ws.goal !== "strength" && fit.minutes <= 30;
  let pairs = 0;
  while (over()) {
    const loose = items.filter((item) => !item.group);
    let made = false;
    for (let i = 0; i < loose.length && !made; i += 1) {
      for (let j = loose.length - 1; j > i && !made; j -= 1) {
        if (!pairable(loose[i], loose[j], allowMain)) continue;
        pairs += 1;
        loose[i].group = loose[j].group = `s${pairs}`;
        // Los dos quedan juntos, en el sitio del primero.
        items = items.filter((item) => item !== loose[j]);
        items.splice(items.indexOf(loose[i]) + 1, 0, loose[j]);
        made = true;
      }
    }
    if (!made) break;
  }
  // 4) Se reparte el recorte: primero se igualan las series (nadie por encima de 3), luego sale lo de menor
  //    prioridad hasta cuatro ejercicios, después las series bajan a 2 y sólo al final se pasa de cuatro a tres.
  const heaviest = (floor: number) => [...items].filter((item) => item.sets > floor).sort((a, b) => b.sets - a.sets || b.slot.priority - a.slot.priority)[0];
  const byLeast = [...items].sort((a, b) => b.slot.priority - a.slot.priority);
  const lightest = () => [...items].filter((item) => item.slot.role !== "main").sort((a, b) => b.slot.priority - a.slot.priority)[0] ?? byLeast[0];
  for (let guard = 0; guard < 80 && over(); guard += 1) {
    const heavy = heaviest(3);
    if (heavy) { heavy.sets -= 1; continue; }
    if (items.length > 4) { drop(lightest()); continue; }
    const reducible = [...items].filter((item) => item.sets > MIN_SETS).sort((a, b) => b.slot.priority - a.slot.priority)[0];
    if (reducible) { reducible.sets -= 1; continue; }
    if (items.length > 3) { drop(lightest()); continue; }
    break;
  }
  return items;
}

// ─── El plan ────────────────────────────────────────────────────────────

/** Rango semanal de series efectivas por músculo según tu nivel y tu objetivo. */
export function planRange(level: ExerciseLevel, goal: PlanGoal) {
  return weeklyTarget(level, goal);
}

function weeklyOf(days: Array<{ drafts: Draft[] }>, cycle: string[], ids: string[], perWeek: number): Record<MuscleGroup, number> {
  // Dos semanas del ciclo, para que A/B alternados (A B A · B A B) promedien bien.
  const sequence = Array.from({ length: perWeek * 2 }, (_, index) => ids.indexOf(cycle[index % cycle.length]));
  const total = emptyMuscles();
  for (const index of sequence) {
    const sets = effectiveSets((days[index]?.drafts ?? []).map((draft) => ({ exercise: draft.exercise, sets: draft.sets })));
    for (const muscle of Object.keys(total) as MuscleGroup[]) total[muscle] += sets[muscle] / 2;
  }
  return total;
}

export function buildTrainingPlan(input: PlanInput): TrainingPlan {
  const level = input.level ?? 1;
  const goal = input.goal ?? "strength";
  const available = Math.max(1, Math.min(6, Math.round(input.daysPerWeek)));
  const ws = createWorkspace({ preference: input.preference, minutes: input.minutes, focus: "full", goal, level, limitations: input.limitations, workouts: input.workouts, now: input.now, seed: input.seed, avoid: input.avoid, favorites: input.favorites, bodyKg: input.bodyKg, variant: input.variant });
  // La estructura se decide con los minutos del plan; el tiempo de hoy sólo recorta las sesiones.
  const fitMinutes = input.minutesOverride ?? input.minutes;
  const variety = ws.usable.filter((exercise) => exercise.category === "strength").length;
  const recommended = recommendStructure({ days: available, level, goal, minutes: input.minutes, location: input.preference.location, weekdays: input.weekdays, variety });
  const structure = input.splitOverride && input.splitOverride !== recommended.split
    ? structureFor(input.splitOverride, available, "Elegiste esta estructura.")
    : recommended;
  const options: TrainingPlan["options"] = [
    { split: recommended.split, label: recommended.label, reason: recommended.reason, recommended: true },
    ...(recommended.alternative ? [{ split: recommended.alternative.split, label: recommended.alternative.label, reason: recommended.alternative.reason, recommended: false }] : []),
  ];
  if (!options.some((option) => option.split === structure.split)) options.push({ split: structure.split, label: structure.label, reason: structure.reason, recommended: false });
  const perWeek = structure.sessions;
  const fit: Fit = { minutes: fitMinutes, budget: fitMinutes * TOLERANCE, warmup: Boolean(input.warmup) };
  const start = weeklyStart(level, goal);
  const notes: string[] = [];

  // 1) Un ejercicio por hueco, día a día; los huecos opcionales esperan a ver qué músculos faltan.
  const memory: Memory = { byKey: new Map(), used: new Map() };
  const planned = structure.days.map((template) => {
    const drafts: Draft[] = [];
    const take = (slot: PlanSlot) => {
      const exercise = pickForSlot(ws, slot, drafts, memory);
      if (!exercise) return;
      drafts.push({ exercise, slot, sets: baseSets(slot.role, level, goal) });
      memory.byKey.set(slot.key, [...(memory.byKey.get(slot.key) ?? []), exercise.id]);
      if (!memory.used.has(exercise.id)) memory.used.set(exercise.id, slot.key);
    };
    const ordered = [...template.slots].sort((a, b) => a.priority - b.priority);
    for (const slot of ordered.filter((item) => !item.optional)) take(slot);
    // Si el equipo o las zonas que cuidas dejan huecos sin ejercicio, los opcionales completan una sesión que valga la pena.
    for (const slot of ordered.filter((item) => item.optional)) {
      if (drafts.length >= MIN_EXERCISES) break;
      take(slot);
    }
    return { template, drafts };
  });
  const ids = structure.days.map((day) => day.id);

  // 2) Cada día cabe en su tiempo.
  for (const day of planned) day.drafts = fitDay(ws, day.drafts, fit);

  // 3) Volumen de la semana: lo que falte se reparte donde haya tiempo; lo que sobre mucho, se recorta.
  // Lo que el plan busca por músculo esta semana: el punto de partida del rango más el ajuste de su región (sube o baja).
  const target = (muscle: MuscleGroup) => {
    const shift = input.shift?.[regionOf[muscle]] ?? 0;
    // Brazos, pantorrillas y abdomen reciben trabajo indirecto de los compuestos: sólo con objetivo de músculo se exige el rango completo (el abdomen, nunca).
    const factor = coreMuscles.has(muscle) || (supportMuscles.has(muscle) && goal !== "muscle") ? 0.5 : 1;
    return Math.max(1, Math.round(start * factor) + shift);
  };
  for (let guard = 0; guard < 80; guard += 1) {
    const weekly = weeklyOf(planned, structure.cycle, ids, perWeek);
    const deficit = trackedMuscles
      .map((muscle) => ({ muscle, missing: target(muscle) - trackedSets(weekly, muscle) }))
      .filter((item) => item.missing > 0.4)
      .sort((a, b) => b.missing - a.missing)[0];
    if (!deficit) break;
    if (!addSetFor(ws, planned, deficit.muscle, fit, memory, perWeek, structure)) break;
  }
  for (let guard = 0; guard < 40; guard += 1) {
    const weekly = weeklyOf(planned, structure.cycle, ids, perWeek);
    const excess = trackedMuscles
      .map((muscle) => ({ muscle, over: trackedSets(weekly, muscle) - (target(muscle) + 1) }))
      .filter((item) => item.over > 0)
      .sort((a, b) => b.over - a.over)[0];
    if (!excess || !removeSetFor(planned, excess.muscle)) break;
  }

  // 3b) Empuje y tirón parejos: si uno supera al otro por mucho, se recorta el que sobra.
  for (let guard = 0; guard < 12; guard += 1) {
    const sets = (match: Set<string>) => planned.reduce((sum, day) => sum + day.drafts.reduce((total, draft) => total + (match.has(draft.exercise.pattern) ? draft.sets : 0), 0), 0);
    const push = sets(PUSH_PATTERNS);
    const pull = sets(PULL_PATTERNS);
    const surplus = push > pull * 1.3 ? PUSH_PATTERNS : pull > push * 1.5 ? PULL_PATTERNS : null;
    if (!surplus) break;
    const trim = planned.flatMap((day) => day.drafts).filter((draft) => surplus.has(draft.exercise.pattern) && draft.sets > MIN_SETS).sort((a, b) => b.slot.priority - a.slot.priority || b.sets - a.sets)[0];
    if (!trim) break;
    trim.sets -= 1;
  }

  // 4) Tope por sesión: ningún músculo concentra más series efectivas de las que rinden en un solo día.
  for (const day of planned) {
    for (let guard = 0; guard < 20; guard += 1) {
      const sets = effectiveSets(day.drafts.map((draft) => ({ exercise: draft.exercise, sets: draft.sets })));
      const heavy = trackedMuscles.find((muscle) => trackedSets(sets, muscle) > sessionCap(level) + 0.5);
      if (!heavy) break;
      const trim = [...day.drafts].sort((a, b) => b.slot.priority - a.slot.priority).find((draft) => draft.sets > MIN_SETS && (muscleCredit(draft.exercise)[heavy] ?? 0) >= 0.5);
      if (!trim) break;
      trim.sets -= 1;
    }
  }

  const days: PlannedDay[] = planned.map(({ template, drafts }) => ({
    id: template.id,
    name: template.name,
    focus: template.focus,
    exercises: inOrder(drafts).map((draft) => ({ exerciseId: draft.exercise.id, slot: draft.slot.key, role: draft.slot.role, sets: draft.sets, ...(draft.rest ? { rest: draft.rest } : {}), ...(draft.group ? { group: draft.group } : {}) })),
    minutes: dayMinutes(ws, drafts, fit),
  }));
  const weekly = weeklyOf(planned, structure.cycle, ids, perWeek);
  // Días seguidos: con volumen moderado no hay problema, pero conviene dejar margen y no repetir piernas al límite.
  const chosenDays = [...new Set(input.weekdays ?? [])].sort((a, b) => a - b);
  const consecutive = chosenDays.length > 1 && chosenDays.some((day, index) => (chosenDays[(index + 1) % chosenDays.length] - day + 7) % 7 === 1);
  if (consecutive && structure.split !== "upper-lower") notes.unshift("Entrenas días seguidos: deja siempre 2–3 repeticiones en reserva y evita llegar al límite en piernas dos días seguidos.");
  // Si las sesiones duran bastante menos que el tiempo que tienes, se dice: no falta nada, más series seguidas rinden menos.
  const typical = Math.round(days.reduce((sum, day) => sum + day.minutes, 0) / days.length);
  if (fitMinutes >= 45 && typical < fitMinutes * 0.75) notes.unshift(`Tus sesiones duran unos ${typical} min, menos de los ${fitMinutes} que tienes: con este volumen ya trabajas lo que rinde; más series seguidas rinden cada vez menos.`);
  // Lo que el equipo no permite y qué lo habilitaría.
  if (!ws.usable.some((exercise) => exercise.pattern === "vertical-pull")) notes.push("Con una barra de dominadas, bandas o poleas puedes sumar tirones verticales.");
  if (!ws.usable.some((exercise) => exercise.pattern === "hinge" && exercise.increment > 0)) notes.push("Con una mancuerna, una banda o una barra puedes sumar peso muerto rumano y trabajar mejor los isquiotibiales.");
  return { split: structure.split, label: structure.label, reason: structure.reason, alternative: structure.alternative, goal, level, daysPerWeek: perWeek, availableDays: available, minutes: fitMinutes, days, cycle: structure.cycle, weekly, notes, options, chosen: structure !== recommended };
}

/** Suma una serie que aporte al músculo que falta: a un ejercicio que ya lo trabaja o, con tiempo, un accesorio nuevo. */
function addSetFor(ws: Workspace, planned: Array<{ template: DayTemplate; drafts: Draft[] }>, muscle: MuscleGroup, fit: Fit, memory: Memory, perWeek: number, structure: Structure): boolean {
  void perWeek;
  // Primero, una serie más a un ejercicio que lo trabaje (el que más lo aporta).
  const options = planned.flatMap((day) => day.drafts.map((draft) => ({ day, draft, credit: muscleCredit(draft.exercise)[muscle] ?? 0 })))
    .filter((option) => option.credit >= 0.5 && option.draft.sets < MAX_SETS[option.draft.slot.role])
    .sort((a, b) => b.credit - a.credit || a.day.drafts.length - b.day.drafts.length);
  for (const option of options) {
    const sessionSets = effectiveSets(option.day.drafts.map((draft) => ({ exercise: draft.exercise, sets: draft.sets })));
    if (trackedSets(sessionSets, muscle) + option.credit > sessionCap(ws.level)) continue;
    option.draft.sets += 1;
    if (dayMinutes(ws, option.day.drafts, fit) <= fit.budget) return true;
    option.draft.sets -= 1;
  }
  // Si no cabe, un accesorio de ese músculo en el día con más holgura (si la estructura lo prevé como opcional o hay uno que sirva).
  const slots = structure.days.flatMap((template) => template.slots.filter((slot) => slot.optional && slot.muscles?.some((item) => regionOf[item] === regionOf[muscle] || item === muscle)).map((slot) => ({ template, slot })));
  for (const { template, slot } of slots) {
    const day = planned.find((item) => item.template.id === template.id);
    if (!day || day.drafts.length >= maxExercises(fit.minutes) || day.drafts.some((draft) => draft.slot.key === slot.key)) continue;
    const exercise = pickForSlot(ws, slot, day.drafts, memory);
    if (!exercise) continue;
    const draft: Draft = { exercise, slot, sets: 2 };
    day.drafts.push(draft);
    if (dayMinutes(ws, day.drafts, fit) <= fit.budget) {
      memory.byKey.set(slot.key, [...(memory.byKey.get(slot.key) ?? []), exercise.id]);
      if (!memory.used.has(exercise.id)) memory.used.set(exercise.id, slot.key);
      return true;
    }
    day.drafts.pop();
  }
  // Último recurso: un ejercicio más que lo trabaje, de un patrón que ese día aún no tenga, donde haya tiempo.
  const slotRole: ExerciseRole = "accessory";
  const days = [...planned].sort((a, b) => dayMinutes(ws, a.drafts, fit) - dayMinutes(ws, b.drafts, fit));
  for (const day of days.filter((item) => item.drafts.length < maxExercises(fit.minutes))) {
    const patterns = new Set(day.drafts.map((draft) => draft.exercise.pattern));
    const ids = new Set(day.drafts.map((draft) => draft.exercise.id));
    ws.context.chosen = [];
    const pool = ws.usable
      .filter((exercise) => exercise.category === "strength" && !ids.has(exercise.id) && (exercise.pattern === "isolation" || !patterns.has(exercise.pattern)) && exercise.primary[0] === muscle && qualityOf(exercise) >= 5)
      .sort((a, b) => scoreCandidate(b, ws.context).score - scoreCandidate(a, ws.context).score);
    const exercise = pool[0];
    if (!exercise) continue;
    const draft: Draft = { exercise, slot: { key: `extra-${muscle}`, patterns: [exercise.pattern], muscles: [muscle], role: slotRole, priority: 10, optional: true }, sets: 2 };
    day.drafts.push(draft);
    if (dayMinutes(ws, day.drafts, fit) <= fit.budget && trackedSets(effectiveSets(day.drafts.map((item) => ({ exercise: item.exercise, sets: item.sets }))), muscle) <= sessionCap(ws.level)) return true;
    day.drafts.pop();
  }
  return false;
}

/** Quita una serie al ejercicio menos importante que trabaje el músculo con exceso (sin bajar de dos). */
function removeSetFor(planned: Array<{ drafts: Draft[] }>, muscle: MuscleGroup): boolean {
  const options = planned.flatMap((day) => day.drafts)
    .filter((draft) => (muscleCredit(draft.exercise)[muscle] ?? 0) >= 0.5 && draft.sets > MIN_SETS)
    .sort((a, b) => b.slot.priority - a.slot.priority);
  if (!options.length) return false;
  options[0].sets -= 1;
  return true;
}

// ─── Las entradas del plan a partir de tus datos ────────────────────────

/** Lo que el plan necesita de tu evaluación. */
type PlanProfile = { goals?: string[]; activities?: string[]; limitations?: string[]; recommendation?: { sessionMinutes: number } } | null | undefined;

/** Bloque de seis semanas: durante él, el desempate entre ejercicios parecidos no cambia (ya cambian por lo que hagas). */
const BLOCK_DAYS = 42;

/**
 * Las mismas entradas para Inicio, Entrenar y Tu plan: tu objetivo (el de Comidas manda), tu nivel (de tu
 * historial), tus días (los fijos o tu meta semanal), tus minutos, tu equipo, lo que cuidas y cómo te fue
 * las últimas semanas (volumen de más o de menos). Con los mismos datos, el mismo plan.
 */
export function planInputFor({ profile, nutritionGoal, settings, preference, workouts, favorites, bodyKg, now }: {
  profile: PlanProfile;
  nutritionGoal?: NutritionGoal;
  settings: { weeklyGoal: number; trainingDays?: number[]; warmup?: boolean; swappedOut?: Record<string, number>; planSplit?: TrainingSplit };
  preference: TrainingPreference;
  workouts: WorkoutEntry[];
  favorites?: number[];
  bodyKg?: number | null;
  now: number;
}): PlanInput {
  const level = trainingLevel(profile?.activities, workouts, new Date(now));
  const goal = trainingGoal(profile?.goals, nutritionGoal);
  const chosenDays = cleanDays(settings.trainingDays);
  return {
    preference,
    goal,
    level,
    minutes: profile?.recommendation?.sessionMinutes ?? 30,
    daysPerWeek: Math.max(1, Math.min(6, chosenDays.length || Math.round(settings.weeklyGoal) || 3)),
    weekdays: chosenDays.length ? chosenDays : undefined,
    limitations: profileLimitations(profile?.limitations),
    workouts,
    now,
    seed: Math.floor(localDaySeed(now) / BLOCK_DAYS),
    avoid: settings.swappedOut,
    favorites,
    bodyKg: bodyKg ?? undefined,
    splitOverride: settings.planSplit,
    warmup: settings.warmup !== false,
    shift: volumeShift(workouts, { now, level, goal }).shift,
  };
}

// ─── Lo que PULSO ajustó en tu semana ───────────────────────────────────

/** Músculos vigilados de cada región (la espalda cuenta por dorsales; el abdomen, por sí solo). */
const regionMuscles: Record<Region, MuscleGroup[]> = {
  chest: ["chest"],
  back: ["lats"],
  shoulders: ["shoulders"],
  arms: ["biceps", "triceps"],
  legs: ["quads", "hamstrings", "glutes", "calves"],
  core: ["abs"],
};

/** Series efectivas por semana y por músculo de cada región (el promedio de sus músculos): en lo que se mueve el ajuste. */
export function regionSets(plan: TrainingPlan): Record<Region, number> {
  return Object.fromEntries((Object.keys(regionMuscles) as Region[]).map((region) => {
    const muscles = regionMuscles[region];
    return [region, muscles.reduce((sum, muscle) => sum + trackedSets(plan.weekly, muscle), 0) / muscles.length];
  })) as Record<Region, number>;
}

export interface PlanAdjustment {
  region: Region;
  label: string;
  /** Series efectivas por músculo y semana, antes y después del ajuste. */
  from: number;
  to: number;
  reason: string;
}

/**
 * Lo que cambió en las series de cada región al empezar la semana, y por qué («Piernas 10 → 8 series: tus
 * últimas sesiones fueron difíciles»). Compara el plan con el ajuste y sin él. Sólo cuentan los cambios que se ven (2 series o más).
 */
export function planAdjustments(input: PlanInput, changes: RegionChange[]): PlanAdjustment[] {
  if (!changes.length) return [];
  const shift = { ...input.shift };
  const before = { ...shift };
  for (const change of changes) before[change.region] = (before[change.region] ?? 0) - change.delta;
  const now = regionSets(buildTrainingPlan(input));
  const then = regionSets(buildTrainingPlan({ ...input, shift: before }));
  return changes
    .map((change) => ({ region: change.region, label: regionLabels[change.region], from: Math.round(then[change.region]), to: Math.round(now[change.region]), reason: change.reason }))
    .filter((item) => Math.abs(item.from - item.to) >= 2);
}

// ─── Qué toca hoy y la sesión del día ───────────────────────────────────

/** El día que sigue en el ciclo tras el último que hiciste del plan (el primero si empiezas o vuelves tras una pausa larga). */
export function nextPlanDay(plan: TrainingPlan, workouts: WorkoutEntry[], now: number): PlannedDay {
  const last = [...workouts]
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .find((workout) => workout.source?.type === "plan" && plan.cycle.includes(workout.source.dayId));
  const recent = last && now - Date.parse(last.completedAt) <= 21 * 86_400_000;
  const index = recent && last?.source?.type === "plan" ? (plan.cycle.lastIndexOf(last.source.dayId) + 1) % plan.cycle.length : 0;
  return plan.days.find((day) => day.id === plan.cycle[index]) ?? plan.days[0];
}

/**
 * El día de hoy: el que sigue en el ciclo, salvo que los músculos que trabaja aún se estén recuperando y
 * haya otro día del plan con músculos frescos: entonces se cambia y se explica. La recuperación es una
 * señal más, no una orden: sólo cambia el día cuando la diferencia es clara.
 */
export function todayPlanDay(plan: TrainingPlan, workouts: WorkoutEntry[], now: number, recovery?: Record<MuscleGroup, number>): { day: PlannedDay; note?: string } {
  const next = nextPlanDay(plan, workouts, now);
  if (!recovery || plan.days.length < 2) return { day: next };
  const freshness = (day: PlannedDay) => {
    const leads = day.exercises.flatMap((item) => { const exercise = exerciseOf(item.exerciseId); return exercise?.primary.length ? [exercise.primary[0]] : []; });
    return leads.length ? leads.reduce((sum, muscle) => sum + recovery[muscle], 0) / leads.length : 100;
  };
  if (freshness(next) >= 45) return { day: next };
  const position = plan.cycle.indexOf(next.id);
  const others = plan.cycle.map((id, index) => ({ day: plan.days.find((item) => item.id === id), distance: (index - position + plan.cycle.length) % plan.cycle.length })).filter((item): item is { day: PlannedDay; distance: number } => Boolean(item.day) && item.day?.id !== next.id).sort((a, b) => a.distance - b.distance);
  const fresher = others.find((item) => freshness(item.day) >= 70);
  if (!fresher) return { day: next };
  const worst = (Object.entries(recovery) as Array<[MuscleGroup, number]>).filter(([muscle]) => next.exercises.some((item) => exerciseOf(item.exerciseId)?.primary[0] === muscle)).sort((a, b) => a[1] - b[1])[0]?.[0];
  const where = worst ? regionLabels[regionOf[worst]].toLowerCase() : "músculos";
  return { day: fresher.day, note: `Hoy te tocaba ${next.name}, pero tus ${where} aún se recuperan: entrenas ${fresher.day.name}.` };
}

/**
 * La sesión de hoy a partir de un día del plan, con las mismas entradas con que se construyó el plan. Con energía
 * moderada («short») es la misma sesión con una serie menos y sin el último ejercicio, para sumar sin acumular fatiga.
 */
export function planSession(input: PlanInput, plan: TrainingPlan, day: PlannedDay, { readiness }: { readiness?: ReadinessEntry["recommendation"] } = {}): GeneratedWorkout {
  const ws = createWorkspace({ preference: input.preference, minutes: plan.minutes, focus: "full", goal: plan.goal, level: plan.level, limitations: input.limitations, workouts: input.workouts, now: input.now, seed: input.seed, avoid: input.avoid, favorites: input.favorites, bodyKg: input.bodyKg, variant: input.variant });
  const session = sessionFromDay(ws, plan, day, { minutes: plan.minutes, warmup: Boolean(input.warmup) });
  if (readiness !== "short") return session;
  const records = oneSetLess(session.records.length > 3 ? session.records.slice(0, -1) : session.records);
  return { ...session, records, estimatedMinutes: estimateMinutes(withWarmup(ws, records, plan.minutes, Boolean(input.warmup)), session.restSeconds), notes: ["Energía moderada: menos volumen, los mismos ejercicios clave, para sumar sin acumular fatiga.", ...session.notes] };
}

/** La sesión de un día del plan lista para entrenar: series con tu progresión, cargas con tus pesas y su porqué. */
export function sessionFromDay(ws: Workspace, plan: TrainingPlan, day: PlannedDay, { minutes, warmup = false }: { minutes: number; warmup?: boolean }): GeneratedWorkout {
  const notes: string[] = [];
  let adaptedReps = false;
  let suggestedLoads = false;
  const records: ExerciseRecord[] = [];
  for (const item of day.exercises) {
    const exercise = exerciseOf(item.exerciseId);
    if (!exercise) continue;
    const built = buildRecord(ws, exercise, { role: item.role, minutes, sets: item.sets, rest: item.rest });
    adaptedReps ||= built.adaptedReps;
    suggestedLoads ||= built.suggestedLoads;
    records.push({ ...built.record, ...(item.group ? { group: item.group } : {}) });
  }
  const restSeconds = Math.round(records.reduce((sum, record) => sum + (record.restSeconds ?? 60), 0) / Math.max(1, records.length) / 15) * 15 || 60;
  if (adaptedReps) notes.push("Ajustamos repeticiones y series a las pesas que tienes: con peso liviano, más repeticiones y bajada lenta.");
  if (suggestedLoads) notes.push("Las cargas son una sugerencia inicial según tu peso y nivel: ajústalas si te sobran o faltan repeticiones.");
  const why = Object.fromEntries(records.map((record) => {
    const exercise = exerciseOf(record.exerciseId);
    return [record.exerciseId, exercise ? whyFor(ws, exercise) : { role: "", variant: "" }];
  }));
  const focus = day.id.startsWith("U") || day.id.startsWith("PU") || day.id.startsWith("PL") ? "upper" : day.id.startsWith("L") ? "lower" : "full";
  return {
    name: day.name,
    focus,
    records,
    restSeconds,
    estimatedMinutes: estimateMinutes(withWarmup(ws, records, minutes, warmup), restSeconds),
    notes,
    why,
  };
}

// ─── Validación ─────────────────────────────────────────────────────────

/** Músculos cuyo trabajo se reduce a propósito cuando cuidas una zona (los ejercicios que la exigen se evitan). */
const limitedMuscles: Record<BodyArea, MuscleGroup[]> = { knees: ["quads", "glutes"], back: ["hamstrings", "glutes", "lats"], shoulders: ["shoulders", "chest"] };

export interface PlanIssue {
  code: "coverage" | "time" | "duplicate" | "equipment" | "limitation" | "volume" | "balance" | "pattern";
  message: string;
}

/**
 * Lo que un plan no debe tener: grupos principales sin trabajo, sesiones que no caben, un movimiento
 * repetido sin motivo, equipo que no tienes, zonas que cuidas, demasiado volumen o un empuje sin tirón.
 * El plan intenta evitarlo al construirse; esto lo comprueba (y las pruebas lo exigen para cada caso).
 */
export function validatePlan(plan: TrainingPlan, input: PlanInput): PlanIssue[] {
  const issues: PlanIssue[] = [];
  const minutes = input.minutesOverride ?? input.minutes;
  const ws = createWorkspace({ preference: input.preference, minutes: input.minutes, focus: "full", goal: plan.goal, level: plan.level, limitations: input.limitations, workouts: input.workouts, now: input.now });
  const equipment = ws.equipment;
  const range = planRange(plan.level, plan.goal);
  // Con un solo día, o con sesiones de 20 minutos, se cubre lo esencial: no se exige el volumen completo.
  const strict = plan.daysPerWeek >= 3 || (plan.daysPerWeek === 2 && minutes >= 45);
  // Cuanto más corta la sesión, más se prioriza lo esencial sobre el volumen: de la mitad del rango (45 min o más) a una quinta parte (20 min).
  const floor = (minutes >= 45 ? 0.5 : minutes >= 30 ? 0.35 : 0.15) * (plan.daysPerWeek <= 2 ? 0.65 : 1);

  for (const day of plan.days) {
    if (day.minutes > minutes * 1.06 + 1) issues.push({ code: "time", message: `${day.name} dura ${day.minutes} min y pediste ${minutes}.` });
    const patterns = new Map<MovementPattern, number>();
    const ids = new Set<number>();
    for (const item of day.exercises) {
      const exercise = exerciseOf(item.exerciseId);
      if (!exercise) continue;
      if (ids.has(exercise.id)) issues.push({ code: "duplicate", message: `${day.name} repite ${exercise.name}.` });
      ids.add(exercise.id);
      if (!(exercise.equipment.length === 0 || exercise.equipment.some((option) => option.every((needed) => equipment.has(needed))))) issues.push({ code: "equipment", message: `${exercise.name} necesita equipo que no tienes.` });
      const stressed = (exercise.stresses ?? []).find((area) => (input.limitations ?? []).includes(area));
      if (stressed) issues.push({ code: "limitation", message: `${exercise.name} exige una zona que cuidas (${stressed}).` });
      // Los accesorios (empuje de cadera tras el peso muerto rumano) pueden compartir patrón con un compuesto: es otro músculo.
      if (item.role === "main" || item.role === "compound") patterns.set(exercise.pattern, (patterns.get(exercise.pattern) ?? 0) + 1);
    }
    for (const [pattern, count] of patterns) if (count > 1) issues.push({ code: "duplicate", message: `${day.name} tiene ${count} ejercicios del mismo patrón (${pattern}).` });
    const sets = effectiveSets(day.exercises.flatMap((item) => { const exercise = exerciseOf(item.exerciseId); return exercise ? [{ exercise, sets: item.sets }] : []; }));
    for (const muscle of trackedMuscles) if (trackedSets(sets, muscle) > sessionCap(plan.level) + 1.5) issues.push({ code: "volume", message: `${day.name} concentra demasiadas series de ${muscle}.` });
  }

  const mainMuscles: MuscleGroup[] = ["chest", "lats", "shoulders", "quads", "hamstrings", "glutes"];
  // Si cuidas una zona, los ejercicios que la exigen se evitan a propósito: ese trabajo no se exige.
  const spared = new Set<MuscleGroup>((input.limitations ?? []).flatMap((area) => limitedMuscles[area]));
  for (const muscle of mainMuscles.filter((item) => !spared.has(item))) {
    const available = ws.usable.some((exercise) => exercise.category === "strength" && (muscleCredit(exercise)[muscle] ?? 0) >= 0.5 && exercise.primary[0] === muscle);
    const sets = trackedSets(plan.weekly, muscle);
    if (available && strict && sets < range.low * floor) issues.push({ code: "coverage", message: `${muscle} recibe sólo ${sets.toFixed(1)} series por semana.` });
    if (sets > range.high * 2 + 2) issues.push({ code: "volume", message: `${muscle} recibe ${sets.toFixed(1)} series por semana.` });
  }

  const direct = (match: (pattern: string) => boolean) => plan.days.reduce((sum, day) => sum + day.exercises.reduce((total, item) => total + (match(exerciseOf(item.exerciseId)?.pattern ?? "") ? item.sets : 0), 0), 0);
  const push = direct((pattern) => PUSH_PATTERNS.has(pattern));
  const pull = direct((pattern) => PULL_PATTERNS.has(pattern));
  // Con 15 minutos o menos (tres movimientos por sesión) no hay con qué parear el empuje y el tirón en cada día.
  if (plan.daysPerWeek >= 2 && minutes > 15 && push && pull && (push / pull > 1.5 || pull / push > 1.8)) issues.push({ code: "balance", message: `Empuje y tirón desparejos (${push} y ${pull} series).` });
  const covered = new Set<string>(plan.days.flatMap((day) => day.exercises.map((item) => exerciseOf(item.exerciseId)?.pattern ?? "")));
  const hasUsable = (patterns: string[]) => ws.usable.some((exercise) => exercise.category === "strength" && patterns.includes(exercise.pattern));
  const needs: Array<[string, string[]]> = [["una pierna o sentadilla", ["squat", "lunge"]], ["bisagra de cadera", ["hinge"]], ["un empuje", ["horizontal-push", "vertical-push"]], ["un tirón", ["horizontal-pull", "vertical-pull"]]];
  for (const [label, patterns] of needs) if (plan.daysPerWeek >= 2 && hasUsable(patterns) && !patterns.some((pattern) => covered.has(pattern))) issues.push({ code: "pattern", message: `Falta ${label} en la semana.` });
  return issues;
}
