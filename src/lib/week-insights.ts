import { entryTotals } from "@/lib/nutrition";
import { DAY_NAMES } from "@/lib/training-days";
import type { FoodEntry, ReadinessEntry, WaterEntry, WorkoutEntry } from "@/types";

/**
 * Tu semana en datos: patrones que cruzan lo que ya registras (chequeo diario, entrenamientos, comidas
 * y agua) en las últimas 4 semanas. Un hallazgo sólo aparece con datos suficientes y una diferencia
 * clara; con pocos datos, se dice qué falta. Hoy no cuenta: el día aún no termina.
 */

export const INSIGHT_DAYS = 28;

export type InsightIcon = "sleep" | "energy" | "stress" | "protein" | "food" | "days" | "time" | "water";
export type InsightAction = { type: "link"; label: string; href: string } | { type: "reminder"; label: string; time: string };

export interface Insight {
  id: string;
  icon: InsightIcon;
  title: string;
  detail: string;
  tone: "positive" | "neutral" | "attention";
  /** Qué tan marcado es el hallazgo: ordena cuáles se muestran. */
  strength: number;
  action?: InsightAction;
}

export interface InsightInput {
  today: string;
  workouts: WorkoutEntry[];
  readiness: ReadinessEntry[];
  foodLog: FoodEntry[];
  water: WaterEntry[];
  waterGoal: number;
  /** Objetivo diario si cuentas calorías; sin contar, no hay hallazgos de comida. */
  targets: { kcal: number; protein: number } | null;
  /** Días fijos de entreno (0 = lunes). */
  trainingDays: number[];
  /** Hora del aviso de entrenar si está activo en este teléfono («19:00»). */
  reminderTime: string | null;
}

export interface InsightReport { insights: Insight[]; missing: string[] }

const MAX_INSIGHTS = 3;
const dayMs = 86_400_000;
const toTime = (date: string) => new Date(`${date}T12:00:00Z`).getTime();
const shift = (date: string, days: number) => new Date(toTime(date) + days * dayMs).toISOString().slice(0, 10);
const weekday = (date: string) => (new Date(toTime(date)).getUTCDay() + 6) % 7;
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const kcalLabel = (value: number) => (Math.round(value / 10) * 10).toLocaleString("es-CL");
const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** Chequeo diario × entrenar: el factor (sueño, energía o estrés) que más cambia cuánto entrenas. */
function checkinInsight(entries: ReadinessEntry[], trained: Set<string>): Insight | null {
  const factors = [
    { id: "sleep", icon: "sleep", good: (entry: ReadinessEntry) => entry.sleep === 3, applies: () => true },
    { id: "energy", icon: "energy", good: (entry: ReadinessEntry) => entry.energy === 3, applies: () => true },
    { id: "stress", icon: "stress", good: (entry: ReadinessEntry) => entry.stress !== 3, applies: (entry: ReadinessEntry) => entry.stress !== undefined },
  ] as const;
  let best: { id: (typeof factors)[number]["id"]; icon: InsightIcon; a: number; n: number; b: number; m: number; diff: number } | null = null;
  for (const factor of factors) {
    const pool = entries.filter(factor.applies);
    const good = pool.filter(factor.good);
    const other = pool.filter((entry) => !factor.good(entry));
    if (good.length < 3 || other.length < 3) continue;
    const a = good.filter((entry) => trained.has(entry.date)).length;
    const b = other.filter((entry) => trained.has(entry.date)).length;
    const diff = a / good.length - b / other.length;
    if (diff >= 0.25 && (!best || diff > best.diff)) best = { id: factor.id, icon: factor.icon, a, n: good.length, b, m: other.length, diff };
  }
  if (!best) return null;
  const { a, n, b, m } = best;
  const strength = 0.5 + best.diff / 2;
  if (best.id === "sleep") return { id: "checkin-sleep", icon: "sleep", tone: "neutral", strength, title: "Dormir bien te pone a entrenar", detail: `Con buen sueño entrenaste ${a} de ${n} días; con sueño normal o malo, ${b} de ${m}.` };
  if (best.id === "energy") return { id: "checkin-energy", icon: "energy", tone: "neutral", strength, title: "Con energía alta, entrenas", detail: `Días con energía alta: entrenaste ${a} de ${n}. Con energía media o baja: ${b} de ${m}.` };
  return { id: "checkin-stress", icon: "stress", tone: "attention", strength, title: "El estrés te frena", detail: `Con estrés alto entrenaste ${b} de ${m} días; el resto, ${a} de ${n}. Esos días, una sesión corta también cuenta.` };
}

/** Los días de la semana en que más entrenas (si aún no fijaste tus días de entreno). */
function weekdaysInsight(dates: string[], trainingDays: number[]): Insight | null {
  if (trainingDays.length || dates.length < 6) return null;
  const counts = Array.from({ length: 7 }, (_, day) => ({ day, count: dates.filter((date) => weekday(date) === day).length }));
  const [first, second] = [...counts].sort((x, y) => y.count - x.count || x.day - y.day);
  const pair = second.count >= 2 && (first.count + second.count) / dates.length >= 0.5;
  const single = !pair && first.count >= 3 && first.count / dates.length >= 0.35;
  if (!pair && !single) return null;
  const days = pair ? [first, second].sort((x, y) => x.day - y.day) : [first];
  const total = days.reduce((sum, item) => sum + item.count, 0);
  return {
    id: "weekdays",
    icon: "days",
    tone: "positive",
    strength: 0.45 + (total / dates.length) * 0.3,
    title: `Tus días fuertes: ${days.map((item) => DAY_NAMES[item.day]).join(" y ")}`,
    detail: `Ahí entrenaste ${total} de tus ${dates.length} días de entrenamiento de las últimas 4 semanas. Fíjalos y PULSO te avisa esos días.`,
    action: { type: "link", label: "Fijar mis días", href: "/perfil" },
  };
}

/** A qué hora sueles empezar, frente a la hora del aviso de entrenar. */
function timingInsight(workouts: WorkoutEntry[], reminderTime: string | null): Insight | null {
  const reminder = reminderTime ? /^(\d{1,2}):(\d{2})$/.exec(reminderTime) : null;
  if (!reminder || workouts.length < 5) return null;
  const starts = workouts.map((workout) => {
    const end = new Date(workout.completedAt);
    return end.getHours() * 60 + end.getMinutes() - Math.round(workout.durationMinutes);
  }).sort((a, b) => a - b);
  const median = starts[Math.floor(starts.length / 2)];
  // Sólo si es un hábito: la mayoría de las sesiones empieza cerca de esa hora.
  if (starts.filter((start) => Math.abs(start - median) <= 90).length / starts.length < 0.6) return null;
  const usual = Math.round(median / 30) * 30;
  const target = Math.min(23 * 60, Math.max(5 * 60, usual - 30));
  const current = Number(reminder[1]) * 60 + Number(reminder[2]);
  if (Math.abs(current - target) < 90) return null;
  return {
    id: "timing",
    icon: "time",
    tone: "neutral",
    // Se arregla con un toque: va antes que los patrones sin acción inmediata.
    strength: 0.75,
    title: `Sueles entrenar cerca de las ${clock(usual)}`,
    detail: `Tu aviso de entrenar suena a las ${reminderTime}. A las ${clock(target)} te llega justo antes.`,
    action: { type: "reminder", label: `Avisarme a las ${clock(target)}`, time: clock(target) },
  };
}

/** Calorías del fin de semana frente a las de lunes a viernes (sólo días bien registrados). */
function weekendInsight(days: Array<{ date: string; kcal: number }>): Insight | null {
  const weekend = days.filter((day) => weekday(day.date) >= 5).map((day) => day.kcal);
  const weekdays = days.filter((day) => weekday(day.date) < 5).map((day) => day.kcal);
  if (weekend.length < 2 || weekdays.length < 3) return null;
  const end = mean(weekend);
  const work = mean(weekdays);
  const diff = end - work;
  if (Math.abs(diff) < 250 || Math.abs(diff) / work < 0.12) return null;
  return {
    id: "weekend",
    icon: "food",
    tone: "neutral",
    strength: 0.5 + Math.min(0.4, Math.abs(diff) / work),
    title: diff > 0 ? "El fin de semana comes más" : "Entre semana comes más",
    detail: `Sábado y domingo promedias ${kcalLabel(end)} kcal por día; de lunes a viernes, ${kcalLabel(work)}.`,
  };
}

/** Proteína de los días de entrenamiento frente a tu objetivo. */
function proteinInsight(days: Array<{ date: string; protein: number }>, trained: Set<string>, target: number): Insight | null {
  const onTraining = days.filter((day) => trained.has(day.date)).map((day) => day.protein);
  if (onTraining.length < 3 || target <= 0) return null;
  const average = Math.round(mean(onTraining));
  const ratio = average / target;
  if (ratio < 0.85) {
    return { id: "protein-low", icon: "protein", tone: "attention", strength: 0.55 + (0.85 - ratio), title: "Proteína en días de entreno", detail: `Esos días llegas en promedio a ${average} de ${target} g. Una porción extra después de entrenar ayuda a recuperarte.` };
  }
  if (ratio >= 0.95) {
    return { id: "protein-ok", icon: "protein", tone: "positive", strength: 0.4, title: "Cumples tu proteína al entrenar", detail: `Los días que entrenas promedias ${average} de ${target} g. Así se recupera el músculo.` };
  }
  return null;
}

/** Agua de los últimos 7 días (si la registraste al menos 4). */
function waterInsight(water: WaterEntry[], week: string[], goal: number): Insight | null {
  const glasses = week.map((date) => water.find((entry) => entry.date === date)?.glasses ?? 0);
  if (glasses.filter((value) => value > 0).length < 4) return null;
  const met = glasses.filter((value) => value >= goal).length;
  if (met >= 5) return { id: "water-ok", icon: "water", tone: "positive", strength: 0.3, title: `Agua: ${met} de 7 días en tu meta`, detail: "Buen hábito. Hidratado rindes y te recuperas mejor." };
  if (met <= 2) {
    const average = Math.round(mean(glasses) * 10) / 10;
    return { id: "water-low", icon: "water", tone: "neutral", strength: 0.35, title: `Agua: ${met} de 7 días en tu meta`, detail: `Promedias ${average.toLocaleString("es-CL")} de ${goal} vasos. Un vaso con cada comida ayuda a llegar.` };
  }
  return null;
}

export function weekInsights({ today, workouts, readiness, foodLog, water, waterGoal, targets, trainingDays, reminderTime }: InsightInput): InsightReport {
  const from = shift(today, -INSIGHT_DAYS);
  const inWindow = (date: string) => date >= from && date < today;
  const windowWorkouts = workouts.filter((workout) => inWindow(workout.date));
  const trained = new Set(windowWorkouts.map((workout) => workout.date));
  const checkins = readiness.filter((entry) => inWindow(entry.date));

  // Un día cuenta como registrado con al menos dos alimentos anotados.
  const byDay = new Map<string, FoodEntry[]>();
  for (const entry of foodLog) if (inWindow(entry.date)) byDay.set(entry.date, [...(byDay.get(entry.date) ?? []), entry]);
  const foodDays = [...byDay].filter(([, entries]) => entries.length >= 2).map(([date, entries]) => ({ date, ...entryTotals(entries) }));

  const week = Array.from({ length: 7 }, (_, index) => shift(today, index - 7));
  const candidates = [
    checkinInsight(checkins, trained),
    timingInsight(windowWorkouts, reminderTime),
    weekdaysInsight([...trained], trainingDays),
    targets ? weekendInsight(foodDays) : null,
    targets ? proteinInsight(foodDays, trained, targets.protein) : null,
    waterInsight(water, week, waterGoal),
  ].filter((item): item is Insight => item !== null);
  const insights = candidates.sort((a, b) => b.strength - a.strength).slice(0, MAX_INSIGHTS);

  const missing: string[] = [];
  if (insights.length < MAX_INSIGHTS) {
    if (checkins.length < 6) missing.push("Haz el chequeo «¿Cómo llegas hoy?» en Inicio: con 6 días vemos cómo te afectan el sueño, la energía y el estrés.");
    if (trained.size < 6) missing.push("Con 6 días de entrenamiento en 4 semanas vemos tus días y horas fuertes.");
    if (targets && foodDays.length < 5) missing.push("Registra tus comidas 5 días para ver tus patrones de alimentación.");
  }
  return { insights, missing };
}
