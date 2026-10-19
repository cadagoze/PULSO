import { recordsVolume } from "@/lib/training";
import { formatShortDate, localDateKey, startOfCurrentWeek, weekNumber } from "@/lib/utils";
import type { WorkoutEntry } from "@/types";

/**
 * Ventanas del resumen de Progreso: «semana» es la semana de la meta (lunes a domingo, por día) y
 * «doce», la tendencia de las últimas 12 semanas (por semana).
 */
export type Period = "semana" | "doce";

export interface Totals {
  sessions: number;
  sets: number;
  volume: number;
  minutes: number;
}

export interface Bucket extends Totals {
  key: string;
  /** Etiqueta del eje (L, M… / «7 sept»…). Vacía si ese punto no lleva etiqueta. */
  short: string;
  /** Nombre completo para la lectura y el lector de pantalla: «miércoles 30 sept», «semana del 7 sept». */
  long: string;
  current: boolean;
  future: boolean;
}

export interface PeriodSummary {
  period: Period;
  start: string;
  end: string;
  /** Línea editorial del encabezado: «Semana 40 · 28 sept – 4 oct». */
  meta: string;
  grain: "día" | "semana";
  totals: Totals;
  buckets: Bucket[];
  /** Semanas con actividad posible dentro de la ventana (para medias semanales). */
  activeWeeks: number;
}

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

/** Fecha local a partir de una clave AAAA-MM-DD (al mediodía, sin saltos por horario de verano). */
export function dateFromKey(key: string) {
  return new Date(`${key}T12:00:00`);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(from: string, to: string) {
  return Math.round((dateFromKey(to).getTime() - dateFromKey(from).getTime()) / 86_400_000);
}

function weekday(date: Date) {
  return date.toLocaleDateString("es-CL", { weekday: "long" });
}

/** Tonelaje de una sesión; los registros antiguos sin `volume` se calculan a partir de sus series. */
export function workoutVolume(workout: WorkoutEntry) {
  return workout.volume ?? (workout.records ? recordsVolume(workout.records) : 0);
}

export function totalsBetween(workouts: WorkoutEntry[], start: string, end: string): Totals {
  const totals: Totals = { sessions: 0, sets: 0, volume: 0, minutes: 0 };
  for (const workout of workouts) {
    if (workout.date < start || workout.date > end) continue;
    totals.sessions += 1;
    totals.sets += workout.sets;
    totals.volume += workoutVolume(workout);
    totals.minutes += workout.durationMinutes;
  }
  return totals;
}

interface Window {
  start: string;
  end: string;
  meta: string;
  grain: PeriodSummary["grain"];
  buckets: Array<Omit<Bucket, keyof Totals> & { from: string; to: string }>;
}

function weekWindow(now: Date, today: string): Window {
  const monday = startOfCurrentWeek(now);
  const days = DAY_LETTERS.map((_, index) => addDays(monday, index));
  const start = localDateKey(days[0]);
  const end = localDateKey(days[6]);
  return {
    start,
    end,
    meta: `Semana ${weekNumber(now)} · ${formatShortDate(start)} – ${formatShortDate(end)}`,
    grain: "día",
    buckets: days.map((day, index) => {
      const key = localDateKey(day);
      return { key, from: key, to: key, short: DAY_LETTERS[index], long: `${weekday(day)} ${formatShortDate(key)}`, current: key === today, future: key > today };
    }),
  };
}

/** Las últimas 12 semanas (la actual incluida), con una etiqueta cada cuatro y «Esta» en la actual. */
function twelveWeeksWindow(now: Date, today: string): Window {
  const monday = startOfCurrentWeek(now);
  const weeks = Array.from({ length: 12 }, (_, index) => addDays(monday, (index - 11) * 7));
  return {
    start: localDateKey(weeks[0]),
    end: today,
    meta: `Últimas 12 semanas · desde el ${formatShortDate(localDateKey(weeks[0]))}`,
    grain: "semana",
    buckets: weeks.map((week, index) => {
      const from = localDateKey(week);
      const last = localDateKey(addDays(week, 6));
      const current = index === weeks.length - 1;
      return { key: from, from, to: last < today ? last : today, short: current ? "Esta" : index % 4 === 0 ? formatShortDate(from) : "", long: current ? "esta semana" : `semana del ${formatShortDate(from)}`, current, future: false };
    }),
  };
}

/** Totales y barras de la ventana elegida. */
export function summarizePeriod(workouts: WorkoutEntry[], period: Period, nowMs: number): PeriodSummary {
  const now = new Date(nowMs);
  const today = localDateKey(now);
  const window = period === "semana" ? weekWindow(now, today) : twelveWeeksWindow(now, today);
  const firstDate = workouts.reduce((first, workout) => (workout.date < first ? workout.date : first), today);
  const from = firstDate > window.start ? firstDate : window.start;
  const elapsed = Math.min(daysBetween(from, today), daysBetween(window.start, window.end)) + 1;
  const inWindow = workouts.filter((workout) => workout.date >= window.start && workout.date <= window.end);

  return {
    period,
    start: window.start,
    end: window.end,
    meta: window.meta,
    grain: window.grain,
    totals: totalsBetween(inWindow, window.start, window.end),
    buckets: window.buckets.map(({ from: bucketFrom, to, ...bucket }) => ({ ...bucket, ...totalsBetween(inWindow, bucketFrom, to) })),
    activeWeeks: period === "semana" ? 1 : Math.max(1, elapsed / 7),
  };
}
