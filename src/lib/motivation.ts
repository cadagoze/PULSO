import { weekStreak } from "@/lib/analytics";
import { localDateKey } from "@/lib/utils";
import type { WorkoutEntry } from "@/types";

const DAY = 86_400_000;

/** Lo que pasa hoy, en orden de prioridad para la frase de Inicio. */
export type DayState = "ready" | "running" | "done" | "rest" | "recovery" | "short" | "train";

/**
 * Frase bajo el saludo: disciplina sin ignorar el cuerpo. Directa para entrenar, nunca empuja a
 * seguir con cansancio, dolor o enfermedad, y no culpa por los días sin entrenar.
 */
export function todayLine({ state, workouts, weeklyGoal, pausedWeeks = [], now }: { state: DayState; workouts: WorkoutEntry[]; weeklyGoal: number; pausedWeeks?: string[]; now: Date }) {
  if (state === "ready") return "Entrenamiento completo: guárdalo para que cuente en tu semana.";
  if (state === "running") return "Tienes un entrenamiento a medias. Sigue cuando quieras.";
  if (state === "done") return "Hoy ya entrenaste. Ahora toca recuperar: come bien, hidrátate y duerme.";
  if (state === "rest") return "Hoy toca recuperar. Moverse suave también suma.";
  if (state === "recovery") return "Hoy, movimiento suave. Escuchar al cuerpo también es disciplina.";
  if (state === "short") return "Hoy, una versión más corta. Constancia antes que perfección.";
  if (!workouts.length) return "Tu primera sesión está lista.";
  const goal = Math.max(1, weeklyGoal);
  const { currentCount, currentMet } = weekStreak(workouts, goal, pausedWeeks, now);
  if (currentMet) return "Meta de la semana cumplida. Entrena fuerte, recupérate bien.";
  const last = workouts.reduce((latest, workout) => (workout.date > latest ? workout.date : latest), "");
  const idle = Math.round((new Date(`${localDateKey(now)}T12:00:00`).getTime() - new Date(`${last}T12:00:00`).getTime()) / DAY);
  if (idle >= 5) return "Volver es lo que cuenta. Hoy, a tu ritmo.";
  if (goal - currentCount === 1) return "Te falta 1 sesión para tu meta de la semana.";
  return "Hoy toca entrenar.";
}
