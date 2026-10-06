import { weekStreak } from "@/lib/analytics";
import { localDateKey } from "@/lib/utils";
import type { WorkoutEntry } from "@/types";

const DAY = 86_400_000;

/**
 * Frase de la portada según tu progreso: primera sesión, racha, lo que falta para la meta semanal
 * o volver tras unos días. Corta, directa y desafiante, sin culpar.
 */
export function heroLine({ workouts, weeklyGoal, pausedWeeks = [], minutes, now }: { workouts: WorkoutEntry[]; weeklyGoal: number; pausedWeeks?: string[]; minutes: number; now: Date }) {
  if (!workouts.length) return `Tu primera sesión: ${minutes} minutos. Empieza ahora.`;
  const goal = Math.max(1, weeklyGoal);
  const { streak, currentCount, currentMet } = weekStreak(workouts, goal, pausedWeeks, now);
  if (currentMet) return "Meta cumplida. Hoy vas por más.";
  const last = workouts.reduce((latest, workout) => (workout.date > latest ? workout.date : latest), "");
  const idle = Math.round((new Date(`${localDateKey(now)}T12:00:00`).getTime() - new Date(`${last}T12:00:00`).getTime()) / DAY);
  if (idle >= 5) return `Nadie lo hará por ti. Hoy, ${minutes} minutos.`;
  const remaining = goal - currentCount;
  const missing = remaining === 1 ? "te falta 1 sesión" : `te faltan ${remaining}`;
  if (streak > 0) return `${streak === 1 ? "1 semana seguida" : `${streak} semanas seguidas`} · no la cortes: ${missing}.`;
  if (remaining === 1) return "Te falta 1 sesión para tu meta. Hazla hoy.";
  return `${minutes} minutos. Sin excusas.`;
}
