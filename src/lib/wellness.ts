/**
 * Bienestar: lo que sostiene el entrenamiento y se anota en segundos. Sueño en horas, pasos del día
 * (a mano: una app web no puede leer Salud ni Google Fit) y ánimo de 1 a 5. Un registro por día.
 */

export type Mood = 1 | 2 | 3 | 4 | 5;

export interface WellnessEntry {
  date: string;
  sleepHours?: number;
  steps?: number;
  mood?: Mood;
  updatedAt: string;
}

export const moodLabels: Record<Mood, string> = { 1: "Muy bajo", 2: "Bajo", 3: "Normal", 4: "Bien", 5: "Muy bien" };

/** Referencias generales para adultos (no son metas médicas). */
export const SLEEP_RANGE = { min: 7, max: 9 } as const;
export const STEPS_REFERENCE = 7000;

const DAY = 86_400_000;

function dayIndex(date: string) {
  return Math.round(new Date(`${date}T12:00:00`).getTime() / DAY);
}

/** Guarda lo de un día (combinando con lo ya anotado); `null` borra un dato. */
export function upsertWellness(
  entries: WellnessEntry[],
  date: string,
  patch: { sleepHours?: number | null; steps?: number | null; mood?: Mood | null },
  stamp = new Date().toISOString(),
): WellnessEntry[] {
  const current = entries.find((entry) => entry.date === date) ?? { date, updatedAt: stamp };
  const next: WellnessEntry = { ...current, updatedAt: stamp };
  for (const key of ["sleepHours", "steps", "mood"] as const) {
    if (!(key in patch)) continue;
    const value = patch[key];
    if (value === null || value === undefined) delete next[key];
    else (next as unknown as Record<string, number>)[key] = value;
  }
  return [...entries.filter((entry) => entry.date !== date), next].sort((a, b) => a.date.localeCompare(b.date));
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

/** Promedios de los últimos 7 días (hoy incluido), sólo con los días anotados. */
export function weekWellness(entries: WellnessEntry[], today: string) {
  const end = dayIndex(today);
  const week = entries.filter((entry) => { const index = dayIndex(entry.date); return index <= end && end - index < 7; });
  const sleep = week.flatMap((entry) => (entry.sleepHours === undefined ? [] : [entry.sleepHours]));
  const steps = week.flatMap((entry) => (entry.steps === undefined ? [] : [entry.steps]));
  const mood = week.flatMap((entry) => (entry.mood === undefined ? [] : [entry.mood]));
  return { sleep: average(sleep), steps: average(steps), mood: average(mood), days: week.length };
}
