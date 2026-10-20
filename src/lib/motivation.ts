import type { DailyRecommendation } from "@/lib/daily-coach";
import { localDateKey } from "@/lib/utils";
import type { WorkoutEntry } from "@/types";

const DAY = 86_400_000;

/**
 * Frase corta bajo el saludo: disciplina sin ignorar el cuerpo. No repite lo que dice la portada (la
 * recomendación y su porqué): acompaña. Nunca empuja con cansancio o dolor ni culpa por los días sin entrenar.
 */
export function todayLine({ recommendation, workouts, week, now }: { recommendation: DailyRecommendation; workouts: WorkoutEntry[]; week: { done: number; goal: number }; now: Date }) {
  if (recommendation === "resume-session") return "Tu entrenamiento te espera.";
  if (recommendation === "done") return "Buen trabajo hoy.";
  if (recommendation === "recovery" || recommendation === "mobility") return "Recuperar también es avanzar.";
  if (recommendation === "train-reduced" || recommendation === "short-session") return "Entrena según cómo responde tu cuerpo.";
  if (!workouts.length) return "Tu primera sesión está lista.";
  if (week.done >= week.goal) return "Vas muy bien esta semana.";
  const last = workouts.reduce((latest, workout) => (workout.date > latest ? workout.date : latest), "");
  const idle = Math.round((new Date(`${localDateKey(now)}T12:00:00`).getTime() - new Date(`${last}T12:00:00`).getTime()) / DAY);
  if (idle >= 5) return "Constancia antes que perfección.";
  return "Hoy toca avanzar.";
}
