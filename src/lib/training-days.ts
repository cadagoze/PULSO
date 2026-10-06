/**
 * Días fijos de entreno: qué días toca entrenar (0 = lunes … 6 = domingo). Sin días elegidos se
 * entrena cualquier día y sólo cuenta la meta semanal.
 */

export const DAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"] as const;
export const DAY_LETTERS = ["L", "M", "X", "J", "V", "S", "D"] as const;

/** Día de la semana con el lunes primero. */
export const weekdayIndex = (date: Date) => (date.getDay() + 6) % 7;

/** Días válidos, sin repetir y ordenados. */
export function cleanDays(days: readonly number[] | undefined) {
  return [...new Set((days ?? []).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b);
}

/** Propuesta al elegir días fijos según la meta semanal: repartidos con descanso entre medio. */
export function suggestedDays(goal: number): number[] {
  const presets: Record<number, number[]> = { 1: [2], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };
  return presets[Math.min(7, Math.max(1, Math.round(goal)))];
}

/** Hoy es descanso: hay días fijos y hoy no es uno de ellos. */
export function isRestDay(days: readonly number[] | undefined, date: Date) {
  const clean = cleanDays(days);
  return clean.length > 0 && !clean.includes(weekdayIndex(date));
}

/** Próximo día de entreno después de hoy (null sin días fijos). */
export function nextTrainingDay(days: readonly number[] | undefined, date: Date) {
  const clean = cleanDays(days);
  if (!clean.length) return null;
  const today = weekdayIndex(date);
  for (let ahead = 1; ahead <= 7; ahead++) {
    const day = (today + ahead) % 7;
    if (clean.includes(day)) return { day, ahead, label: ahead === 1 ? "mañana" : DAY_NAMES[day] };
  }
  return null;
}

/** «L · X · V». */
export const daysLabel = (days: readonly number[]) => cleanDays(days).map((day) => DAY_LETTERS[day]).join(" · ");
