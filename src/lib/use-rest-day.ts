"use client";

import { useSettings, useWorkouts } from "@/lib/store";
import { isRestDay } from "@/lib/training-days";
import { useNow } from "@/lib/use-now";
import { localDateKey } from "@/lib/utils";

/** Hoy es día de descanso (días fijos elegidos, hoy no es uno y aún no entrenas hoy). */
export function useRestDay() {
  const now = useNow();
  const [settings] = useSettings();
  const [workouts] = useWorkouts();
  if (!now) return false;
  const date = new Date(now);
  return isRestDay(settings.trainingDays, date) && !workouts.some((workout) => workout.date === localDateKey(date));
}
