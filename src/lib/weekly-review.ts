import { ageFrom, calorieFloor, entryTotals, nutritionTargets } from "@/lib/nutrition";
import type { FoodEntry, NutritionCheckIn, NutritionProfile, WeightEntry } from "@/types";

/**
 * Revisión semanal: compara cómo cambia tu peso de verdad con lo que el plan esperaba y propone
 * ajustar las calorías de a poco. Supone que comes cerca de tu objetivo; si lo que registras dice
 * otra cosa, primero lo advierte en vez de bajar más.
 */

export const REVIEW_WINDOW_DAYS = 21;
export const MIN_WEIGH_INS = 3;
export const MIN_SPAN_DAYS = 10;
/** Diferencia (kg/semana) que se considera ruido: agua, sal, horario del pesaje. */
const DEAD_BAND_KG = 0.15;
/** 7700 kcal ≈ 1 kg: 1 kg/semana equivale a 1100 kcal al día. */
const KCAL_PER_KG_WEEK = 7700 / 7;
/** Sólo se corrige la mitad de la diferencia y como máximo 200 kcal por semana. */
const DAMPING = 0.5;
const MAX_STEP_KCAL = 200;
const DAY = 86_400_000;

const dayIndex = (date: string) => Math.round(new Date(`${date}T12:00:00`).getTime() / DAY);
const dateFromIndex = (index: number) => new Date(index * DAY).toISOString().slice(0, 10);

export interface WeightTrend {
  points: Array<{ date: string; weight: number }>;
  /** Pendiente de la recta de tendencia, en kg por semana. */
  kgPerWeek: number;
  spanDays: number;
  /** Peso de la tendencia al inicio y al final del período (para dibujar la recta). */
  from: { date: string; weight: number };
  to: { date: string; weight: number };
}

/** Recta de mínimos cuadrados sobre los pesajes de las últimas 3 semanas. */
export function weightTrend(entries: WeightEntry[], today: string, windowDays = REVIEW_WINDOW_DAYS): WeightTrend | null {
  const end = dayIndex(today);
  const points = entries
    .filter((entry) => { const index = dayIndex(entry.date); return index <= end && index > end - windowDays; })
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({ date: entry.date, weight: entry.weight }));
  if (points.length < 2) return null;
  const xs = points.map((point) => dayIndex(point.date));
  const meanX = xs.reduce((sum, x) => sum + x, 0) / xs.length;
  const meanY = points.reduce((sum, point) => sum + point.weight, 0) / points.length;
  let numerator = 0;
  let denominator = 0;
  xs.forEach((x, index) => {
    numerator += (x - meanX) * (points[index].weight - meanY);
    denominator += (x - meanX) ** 2;
  });
  if (denominator === 0) return null;
  const slope = numerator / denominator;
  const first = xs[0];
  const last = xs[xs.length - 1];
  const at = (x: number) => Math.round((meanY + slope * (x - meanX)) * 10) / 10;
  return {
    points,
    kgPerWeek: Math.round(slope * 7 * 100) / 100,
    spanDays: last - first,
    from: { date: dateFromIndex(first), weight: at(first) },
    to: { date: dateFromIndex(last), weight: at(last) },
  };
}

export type ReviewVerdict = "on-track" | "lower" | "raise" | "floor" | "adherence";

export type WeeklyReview =
  | { status: "unavailable" }
  | { status: "collecting"; weighIns: number; spanDays: number }
  | {
    status: "ready";
    /** Toca revisar (nunca revisado o hace 6 días o más). */
    due: boolean;
    verdict: ReviewVerdict;
    observedKgWeek: number;
    plannedKgWeek: number;
    currentKcal: number;
    suggestedKcal: number;
    change: number;
    floorKcal: number;
    /** Promedio de los días con registro completo (≥ 60 % del objetivo), si hay 5 o más. */
    intakeAvg: number | null;
    loggedDays: number;
    trend: WeightTrend;
  };

export function daysBetween(from: string, to: string) {
  return dayIndex(to) - dayIndex(from);
}

export function weeklyReview({ profile, weights, foodLog, today }: { profile: NutritionProfile; weights: WeightEntry[]; foodLog: FoodEntry[]; today: string }): WeeklyReview {
  const now = new Date(`${today}T12:00:00`);
  if (profile.special !== "none" || profile.mode !== "count" || ageFrom(profile.birthYear, now) < 18) return { status: "unavailable" };

  const trend = weightTrend(weights, today);
  const inWindow = weights.filter((entry) => { const gap = daysBetween(entry.date, today); return gap >= 0 && gap < REVIEW_WINDOW_DAYS; });
  if (!trend || trend.points.length < MIN_WEIGH_INS || trend.spanDays < MIN_SPAN_DAYS) {
    return { status: "collecting", weighIns: inWindow.length, spanDays: trend?.spanDays ?? 0 };
  }

  const latest = trend.points[trend.points.length - 1].weight;
  const current = nutritionTargets(profile, latest, now);
  // El ritmo planeado sale del objetivo elegido, no de las calorías ya ajustadas.
  const baseline = nutritionTargets({ ...profile, customKcal: undefined }, latest, now);
  const plannedKgWeek = baseline.weeklyChangeKg;
  const observedKgWeek = trend.kgPerWeek;
  const floorKcal = Math.ceil((profile.goal === "lose" ? Math.max(calorieFloor[profile.sex], baseline.bmr) : calorieFloor[profile.sex]) / 10) * 10;

  // Lo registrado en el período (sin contar hoy, que va a medias).
  const byDay = new Map<string, FoodEntry[]>();
  for (const entry of foodLog) {
    const gap = daysBetween(entry.date, today);
    if (gap >= 1 && entry.date >= trend.points[0].date) byDay.set(entry.date, [...(byDay.get(entry.date) ?? []), entry]);
  }
  const complete = [...byDay.values()].map((entries) => entryTotals(entries).kcal).filter((kcal) => kcal >= current.kcal * 0.6);
  const loggedDays = complete.length;
  const intakeAvg = loggedDays >= 5 ? Math.round(complete.reduce((sum, kcal) => sum + kcal, 0) / loggedDays / 10) * 10 : null;

  const gap = plannedKgWeek - observedKgWeek;
  let change = 0;
  if (Math.abs(gap) >= DEAD_BAND_KG) {
    const raw = gap * KCAL_PER_KG_WEEK * DAMPING;
    change = Math.round(Math.max(-MAX_STEP_KCAL, Math.min(MAX_STEP_KCAL, raw)) / 50) * 50;
  }

  let verdict: ReviewVerdict = change === 0 ? "on-track" : change < 0 ? "lower" : "raise";
  let suggestedKcal = Math.min(6000, Math.max(floorKcal, current.kcal + change));
  if (verdict === "lower" && suggestedKcal >= current.kcal) verdict = "floor";
  if (verdict === "lower" && intakeAvg !== null && intakeAvg > current.kcal * 1.08) verdict = "adherence";
  if (verdict === "on-track" || verdict === "floor" || verdict === "adherence") suggestedKcal = current.kcal;

  const last = profile.checkIns?.at(-1);
  return {
    status: "ready",
    due: !last || daysBetween(last.date, today) >= 6,
    verdict,
    observedKgWeek,
    plannedKgWeek,
    currentKcal: current.kcal,
    suggestedKcal,
    change: suggestedKcal - current.kcal,
    floorKcal,
    intakeAvg,
    loggedDays,
    trend,
  };
}

/** Guarda la revisión (y aplica el nuevo objetivo si se aceptó). Conserva las últimas 12. */
export function checkInPatch(profile: NutritionProfile, review: Extract<WeeklyReview, { status: "ready" }>, apply: boolean, today: string): Partial<NutritionProfile> {
  const applied = apply && review.change !== 0;
  const entry: NutritionCheckIn = {
    date: today,
    fromKcal: review.currentKcal,
    toKcal: applied ? review.suggestedKcal : review.currentKcal,
    observedKgWeek: review.observedKgWeek,
    plannedKgWeek: review.plannedKgWeek,
    applied,
  };
  return {
    ...(applied ? { customKcal: review.suggestedKcal } : {}),
    checkIns: [...(profile.checkIns ?? []), entry].slice(-12),
  };
}

/** Última revisión que fijó el objetivo actual (para explicar de dónde salen las calorías). */
export function activeCheckIn(profile: NutritionProfile) {
  const last = profile.checkIns?.findLast((item) => item.applied);
  return last && profile.customKcal === last.toKcal ? last : null;
}
