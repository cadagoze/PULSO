import { workoutMuscleSets } from "@/lib/analytics";
import type { WorkoutFocus } from "@/lib/generator";
import { effortFor, suggestNext } from "@/lib/progression";
import { painAreasText, painLimitations, painNote, readinessFeel } from "@/lib/readiness";
import { exerciseById, lastRecordFor } from "@/lib/training";
import { formatNumber, localDateKey } from "@/lib/utils";
import type { BodyArea, ExerciseRecord, MuscleGroup, ReadinessEntry, WorkoutEntry } from "@/types";

/**
 * El coach de Inicio: de tus datos (sesión en curso, lo entrenado, el chequeo de hoy, la recuperación
 * y la semana) a una recomendación con su porqué y una acción. Todo se calcula en el teléfono, sin
 * conexión. Tono: disciplina sin ignorar el cuerpo.
 */

export type DailyRecommendation = "resume-session" | "done" | "train-normal" | "train-reduced" | "short-session" | "recovery" | "mobility";

export interface DailyCoachResult {
  recommendation: DailyRecommendation;
  /** Cómo llega el cuerpo, en dos o tres palabras: «Recuperación buena», «Energía baja», «Cuidando rodillas». */
  status: string;
  /** Si esa lectura es buena (para su color). */
  positive: boolean;
  /** Lo que conviene hoy: «Hoy puedes entrenar normal.» */
  title: string;
  /** Por qué, en una línea: «Entrenaste piernas ayer: hoy priorizamos torso.» */
  reason: string;
  /** Texto del botón principal. */
  primaryAction: string;
  /** Minutos de lo recomendado, si aplica. */
  duration?: number;
}

export interface DailyCoachInput {
  now: Date;
  /** Entrenamiento en curso: minutos, series hechas y totales, si ya está todo hecho y si está en pausa. */
  draft: { minutes: number; done: number; total: number; ready: boolean; paused: boolean } | null;
  trainedToday: boolean;
  restDay: boolean;
  /** Chequeo de hoy, si lo hiciste. */
  readiness: Pick<ReadinessEntry, "recommendation" | "feel" | "pain"> | null;
  recovery: Record<MuscleGroup, number>;
  /** Enfoque de la sesión de hoy y si salió de la recuperación (no lo elegiste tú). */
  focus: WorkoutFocus;
  focusByRecovery: boolean;
  /** El día de «Tu plan» que toca hoy (y, si cambió por la recuperación, por qué). */
  planDay?: { name: string; split: string; note?: string };
  workouts: WorkoutEntry[];
  week: { done: number; goal: number };
  /** Elegiste la versión corta. */
  short: boolean;
  /** Minutos de la sesión de hoy. */
  minutes: number;
  /** Lo aprendido de tus últimas sesiones: molestias que marcaste al terminar y sesiones difíciles seguidas. */
  adaptation?: { carriedPain: Array<BodyArea | "other">; hardStreak: number };
}

const DAY = 86_400_000;
const LEGS: MuscleGroup[] = ["quads", "hamstrings", "glutes", "calves"];
const UPPER: MuscleGroup[] = ["chest", "back", "lats", "shoulders", "triceps", "biceps"];
const READY = 85;
const areaNames: Record<BodyArea, string> = { knees: "rodillas", back: "espalda", shoulders: "hombros" };

const average = (recovery: Record<MuscleGroup, number>, muscles: MuscleGroup[]) => muscles.reduce((sum, muscle) => sum + recovery[muscle], 0) / muscles.length;

/** Días enteros entre dos fechas locales («ayer» = 1). */
function daysBetween(from: string, to: string) {
  return Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / DAY);
}

/** Si una sesión fue sobre todo de pierna o de torso (por sus series). */
function regionOf(workout: WorkoutEntry): "legs" | "upper" | null {
  const { sets } = workoutMuscleSets(workout);
  const legs = LEGS.reduce((sum, muscle) => sum + sets[muscle], 0);
  const upper = UPPER.reduce((sum, muscle) => sum + sets[muscle], 0);
  if (!legs && !upper) return null;
  return legs > upper * 1.5 ? "legs" : upper > legs * 1.5 ? "upper" : null;
}

/** «rodillas», «rodillas y espalda». */
function areasLabel(pain: ReadonlyArray<BodyArea | "other"> | undefined) {
  const areas = painLimitations(pain).map((area) => areaNames[area]);
  return areas.length ? (areas.length === 1 ? areas[0] : `${areas.slice(0, -1).join(", ")} y ${areas.at(-1)}`) : null;
}

/** Lectura del cuerpo: el chequeo de hoy manda; si no, lo que marcaste al terminar y la recuperación estimada. */
function bodyStatus(input: DailyCoachInput): { status: string; positive: boolean } {
  const { readiness, recovery } = input;
  const pain = readiness ? readiness.pain : input.adaptation?.carriedPain;
  const areas = areasLabel(pain);
  if (areas) return { status: `Cuidando ${areas}`, positive: false };
  if (pain?.length) return { status: "Con una molestia", positive: false };
  if (readiness) {
    const feel = readinessFeel(readiness);
    if (feel === "exhausted") return { status: "Energía muy baja", positive: false };
    if (feel === "tired") return { status: "Energía baja", positive: false };
  } else if ((input.adaptation?.hardStreak ?? 0) >= 2) {
    return { status: "Cansancio acumulado", positive: false };
  }
  const ready = average(recovery, LEGS) >= READY && average(recovery, UPPER) >= READY;
  return ready ? { status: "Recuperación buena", positive: true } : { status: "Recuperación parcial", positive: true };
}

/** Por qué entrenar normal hoy, en una línea (lo más específico primero). */
function normalReason(input: DailyCoachInput) {
  const { recovery, focus, focusByRecovery, workouts, week, now, planDay } = input;
  // Si hoy cambió el día del plan por la recuperación, eso es lo que hay que contar.
  if (planDay?.note) return planDay.note;
  const today = localDateKey(now);
  const last = workouts.reduce<WorkoutEntry | null>((latest, workout) => (!latest || workout.completedAt > latest.completedAt ? workout : latest), null);
  const idle = last ? daysBetween(last.date, today) : null;
  if (focusByRecovery && (focus === "upper" || focus === "lower")) {
    // La zona que descansa hoy y la que se prioriza.
    const legsRest = focus === "upper";
    const prioritize = legsRest ? "torso" : "piernas";
    if (last && idle === 1 && regionOf(last) === (legsRest ? "legs" : "upper")) return `Entrenaste ${legsRest ? "piernas" : "torso"} ayer: hoy priorizamos ${prioritize}.`;
    if (average(recovery, legsRest ? LEGS : UPPER) < READY) return `${legsRest ? "Piernas todavía se recuperan" : "Torso todavía se recupera"}: hoy priorizamos ${prioritize}.`;
  }
  if (!workouts.length) return "Tu primera sesión: a tu ritmo y con buena técnica.";
  if (week.done >= week.goal) return "Ya cumpliste tu meta: entrena si te sientes bien o recupera.";
  if (week.goal - week.done === 1) return "Con esta sesión cumples tu meta de la semana.";
  if (idle !== null && idle >= 5) return "Volver es lo que cuenta: hoy, a tu ritmo.";
  if (idle !== null && idle >= 2) return `Llevas ${idle} días sin entrenar y tu recuperación es buena.`;
  if (planDay) return `Hoy toca ${planDay.name}, según tu plan de ${planDay.split}.`;
  return "Tu cuerpo está listo para entrenar.";
}

/** La recomendación del día, con su porqué y la acción principal. */
export function dailyCoach(input: DailyCoachInput): DailyCoachResult {
  const { draft, readiness, minutes } = input;
  const body = bodyStatus(input);
  if (draft) {
    return {
      recommendation: "resume-session",
      ...body,
      title: draft.ready ? "Guarda tu entrenamiento." : "Continúa donde quedaste.",
      reason: draft.ready ? "Todas las series hechas: guárdalo para que cuente en tu semana." : `${draft.minutes} min · ${draft.done}/${draft.total} series${draft.paused ? " · en pausa" : ""}`,
      primaryAction: draft.ready ? "Guardar entrenamiento" : "Continuar",
    };
  }
  if (input.trainedToday) {
    return {
      recommendation: "done",
      ...body,
      title: "Hoy ya entrenaste.",
      reason: input.week.done >= input.week.goal ? "Meta de la semana cumplida. Ahora toca recuperar." : "Ahora toca recuperar: come bien, hidrátate y duerme.",
      primaryAction: "Ver mi progreso",
    };
  }
  if (readiness?.recommendation === "recovery") {
    return { recommendation: "recovery", ...body, title: "Hoy conviene recuperar.", reason: "Tu energía está muy baja: moverte suave te ayuda más que entrenar fuerte.", primaryAction: "Movilidad 10 min", duration: 10 };
  }
  if (input.restDay) {
    return { recommendation: "mobility", ...body, title: "Hoy toca recuperar.", reason: "Es tu día de descanso. Moverse suave también suma.", primaryAction: "Movilidad 10 min", duration: 10 };
  }
  if (input.short) {
    return { recommendation: "short-session", ...body, title: "Hoy entrenamos más corto.", reason: "Lo esencial de hoy: los ejercicios de mayor impacto, con descansos más cortos.", primaryAction: "Empezar entrenamiento", duration: minutes };
  }
  if (readiness?.pain?.length || readiness?.recommendation === "short") {
    return {
      recommendation: "train-reduced",
      ...body,
      title: "Hoy bajamos un poco el volumen.",
      reason: readiness.pain?.length ? painNote(readiness.pain) ?? "Evita lo que moleste en esa zona." : "Tu energía está baja hoy: menos volumen, los mismos ejercicios clave.",
      primaryAction: "Empezar entrenamiento",
      duration: minutes,
    };
  }
  // Sin chequeo hoy, lo aprendido de tus últimas sesiones también ajusta (y se dice por qué).
  const learned = readiness ? null : input.adaptation;
  if (learned?.carriedPain.length) {
    return {
      recommendation: "train-reduced",
      ...body,
      title: "Hoy bajamos un poco el volumen.",
      reason: `Al terminar tu última sesión marcaste molestia en ${painAreasText(learned.carriedPain)}: hoy cuidamos esa zona.`,
      primaryAction: "Empezar entrenamiento",
      duration: minutes,
    };
  }
  if (learned && learned.hardStreak >= 2) {
    return {
      recommendation: "train-reduced",
      ...body,
      title: "Hoy bajamos un poco el volumen.",
      reason: `Tus ${learned.hardStreak === 2 ? "dos" : learned.hardStreak} últimas sesiones fueron difíciles: hoy, menos volumen para recuperar margen.`,
      primaryAction: "Empezar entrenamiento",
      duration: minutes,
    };
  }
  const met = input.week.done >= input.week.goal;
  return {
    recommendation: "train-normal",
    ...body,
    title: met ? "Semana completada: lo de hoy suma extra." : body.status === "Recuperación buena" ? "Hoy puedes entrenar normal." : "Hoy puedes entrenar.",
    reason: normalReason(input),
    primaryAction: "Empezar entrenamiento",
    duration: minutes,
  };
}

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/**
 * Consejo de hoy, nunca genérico: con molestias o cansancio, cómo cuidarte; si toca entrenar, la
 * progresión del primer ejercicio con historial («sube a 42,5 kg») o la clave técnica del primero.
 */
export function dailyTip({ recommendation, records, workouts, unit = "kg", toDisplay = (kg: number) => kg }: {
  recommendation: DailyRecommendation;
  records: ExerciseRecord[];
  workouts: WorkoutEntry[];
  unit?: string;
  toDisplay?: (kg: number) => number;
}): string | null {
  if (recommendation === "train-reduced") return "Hoy: deja 3 repeticiones en reserva y cambia el ejercicio si algo molesta.";
  if (recommendation === "recovery" || recommendation === "mobility") return "Hoy: muévete sin dolor y respira lento. Dormir bien también es entrenar.";
  if (recommendation !== "train-normal" && recommendation !== "short-session") return null;
  const main = records.flatMap((record) => {
    const exercise = exerciseById(record.exerciseId);
    return exercise && exercise.category === "strength" ? [exercise] : [];
  });
  const load = (kg: number) => `${formatNumber(toDisplay(kg))} ${unit}`;
  for (const exercise of main) {
    const last = lastRecordFor(workouts, exercise.id);
    if (!last) continue;
    const next = suggestNext(exercise, last, unit, toDisplay, effortFor(workouts, exercise.id));
    const name = lowerFirst(exercise.name);
    // Si tu esfuerzo cambió la sugerencia, el consejo dice por qué («como tu última sesión fue difícil…»).
    if (next.because) return `Hoy en ${name}: ${lowerFirst(next.message)}`;
    if (next.kind === "load") return `Hoy en ${name}: sube a ${load(next.load)} y vuelve a ${next.value} repeticiones.`;
    if (next.kind === "reps") return `Hoy en ${name}: intenta ${next.value} ${exercise.unit === "reps" ? "repeticiones" : "segundos"}${next.load > 0 ? ` con ${load(next.load)}` : ""}.`;
    if (next.kind === "harder") return `Hoy en ${name}: ${lowerFirst(next.message)}`;
  }
  const first = main[0];
  if (!first) return null;
  if (first.increment > 0 && !lastRecordFor(workouts, first.id)) return `Hoy en ${lowerFirst(first.name)}: elige una carga que te deje 2 o 3 repeticiones en reserva.`;
  return `Hoy en ${lowerFirst(first.name)}: ${lowerFirst(first.cue)}`;
}
