import { recordsVolume } from "@/lib/training";
import { formatShortDate, localDateKey, startOfCurrentWeek, weekNumber } from "@/lib/utils";
import type { PersonalRecordHit, WorkoutEntry } from "@/types";

/** Periodos del resumen. «Semana» es la semana de la meta (lunes a domingo); «Mes» y «Año» son ventanas móviles. */
export type Period = "semana" | "mes" | "ano";

export const periods: Array<{ value: Period; label: string }> = [
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
  { value: "ano", label: "Año" },
];

export function isPeriod(value: string | null): value is Period {
  return periods.some((period) => period.value === value);
}

export interface Totals {
  sessions: number;
  sets: number;
  volume: number;
  minutes: number;
}

export interface Bucket extends Totals {
  key: string;
  /** Etiqueta del eje (L, M… / 3, 10… / E, F…). Vacía si ese punto no lleva etiqueta. */
  short: string;
  /** Nombre completo para la lectura y el lector de pantalla: «miércoles 30 sept», «septiembre 2026». */
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
  grain: "día" | "mes";
  totals: Totals;
  /** Mismo tramo del periodo anterior; `null` si no hay historial previo con qué comparar. */
  previous: Totals | null;
  compareNote: string;
  buckets: Bucket[];
  /** Semanas con actividad posible dentro de la ventana (para medias semanales). */
  activeWeeks: number;
  prs: Array<{ pr: PersonalRecordHit; date: string; workoutId: string }>;
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

function clean(label: string) {
  return label.replaceAll(".", "");
}

function weekday(date: Date) {
  return date.toLocaleDateString("es-CL", { weekday: "long" });
}

function monthLong(date: Date) {
  return date.toLocaleDateString("es-CL", { month: "long" });
}

function monthShort(date: Date) {
  return clean(date.toLocaleDateString("es-CL", { month: "short" }));
}

/** Tonelaje de una sesión; los registros antiguos sin `volume` se calculan a partir de sus series. */
export function workoutVolume(workout: WorkoutEntry) {
  return workout.volume ?? (workout.records ? recordsVolume(workout.records) : 0);
}

function emptyTotals(): Totals {
  return { sessions: 0, sets: 0, volume: 0, minutes: 0 };
}

export function totalsBetween(workouts: WorkoutEntry[], start: string, end: string): Totals {
  const totals = emptyTotals();
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
  previousStart: string;
  previousEnd: string;
  meta: string;
  compareNote: string;
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
    // La semana en curso se compara con la anterior hasta el mismo día, para que el lunes no parezca una caída.
    previousStart: localDateKey(addDays(monday, -7)),
    previousEnd: localDateKey(addDays(now, -7)),
    meta: `Semana ${weekNumber(now)} · ${formatShortDate(start)} – ${formatShortDate(end)}`,
    compareNote: `Comparado con la semana pasada hasta el ${weekday(now)}.`,
    grain: "día",
    buckets: days.map((day, index) => {
      const key = localDateKey(day);
      return { key, from: key, to: key, short: DAY_LETTERS[index], long: `${weekday(day)} ${formatShortDate(key)}`, current: key === today, future: key > today };
    }),
  };
}

function monthWindow(now: Date, today: string): Window {
  const first = addDays(now, -29);
  const days = Array.from({ length: 30 }, (_, index) => addDays(first, index));
  const start = localDateKey(first);
  let lastMonth = -1;
  return {
    start,
    end: today,
    previousStart: localDateKey(addDays(first, -30)),
    previousEnd: localDateKey(addDays(first, -1)),
    meta: `Últimos 30 días · ${formatShortDate(start)} – ${formatShortDate(today)}`,
    compareNote: "Comparado con los 30 días anteriores.",
    grain: "día",
    buckets: days.map((day, index) => {
      const key = localDateKey(day);
      // Una etiqueta por semana, contando hacia atrás desde hoy; el mes aparece cuando cambia.
      const tick = (days.length - 1 - index) % 7 === 0;
      let short = "";
      if (tick) {
        short = day.getMonth() === lastMonth ? String(day.getDate()) : `${day.getDate()} ${monthShort(day)}`;
        lastMonth = day.getMonth();
      }
      return { key, from: key, to: key, short, long: `${weekday(day)} ${formatShortDate(key)}`, current: key === today, future: false };
    }),
  };
}

function yearWindow(now: Date, today: string): Window {
  const months = Array.from({ length: 12 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - 11 + index, 1, 12));
  const start = localDateKey(months[0]);
  const lastDayLastYear = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0, 12).getDate();
  return {
    start,
    end: today,
    previousStart: localDateKey(new Date(now.getFullYear() - 1, now.getMonth() - 11, 1, 12)),
    previousEnd: localDateKey(new Date(now.getFullYear() - 1, now.getMonth(), Math.min(now.getDate(), lastDayLastYear), 12)),
    meta: `Últimos 12 meses · ${monthShort(months[0])} ${months[0].getFullYear()} – ${monthShort(now)} ${now.getFullYear()}`,
    compareNote: "Comparado con los 12 meses anteriores.",
    grain: "mes",
    buckets: months.map((month, index) => {
      const from = localDateKey(month);
      const lastDay = localDateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0, 12));
      const name = monthLong(month);
      return { key: from.slice(0, 7), from, to: lastDay < today ? lastDay : today, short: name.charAt(0).toUpperCase(), long: `${name} ${month.getFullYear()}`, current: index === 11, future: false };
    }),
  };
}

/** Totales, comparación, barras y récords del periodo elegido. */
export function summarizePeriod(workouts: WorkoutEntry[], period: Period, nowMs: number): PeriodSummary {
  const now = new Date(nowMs);
  const today = localDateKey(now);
  const window = period === "semana" ? weekWindow(now, today) : period === "mes" ? monthWindow(now, today) : yearWindow(now, today);
  const hasHistory = workouts.some((workout) => workout.date < window.start);
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
    previous: hasHistory ? totalsBetween(workouts, window.previousStart, window.previousEnd) : null,
    compareNote: window.compareNote,
    buckets: window.buckets.map(({ from: bucketFrom, to, ...bucket }) => ({ ...bucket, ...totalsBetween(inWindow, bucketFrom, to) })),
    activeWeeks: period === "semana" ? 1 : Math.max(1, elapsed / 7),
    prs: [...inWindow]
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .flatMap((workout) => (workout.prs ?? []).map((pr) => ({ pr, date: workout.date, workoutId: workout.id }))),
  };
}
