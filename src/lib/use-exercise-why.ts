"use client";

import { useMemo } from "react";
import { profileLimitations, trainingLevel } from "@/lib/generator";
import { exerciseTrend, whyExercise } from "@/lib/selection";
import type { ExerciseWhy } from "@/lib/selection";
import { useFavorites, usePreference, useProfile, useWorkouts } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import type { Exercise } from "@/types";

/** «Por qué está aquí» de un ejercicio fuera del generador (sesión en curso): tu lugar, tus zonas a cuidar, tu nivel y cómo vienes en él. */
export function useExerciseWhy(exercise: Exercise | undefined): ExerciseWhy | null {
  const [preference] = usePreference();
  const [profile] = useProfile();
  const [workouts] = useWorkouts();
  const [favorites] = useFavorites();
  const now = useNow();
  return useMemo(() => (exercise && now ? whyExercise(exercise, {
    location: preference.location,
    limitations: profileLimitations(profile?.limitations),
    level: trainingLevel(profile?.activities, workouts, new Date(now)),
    trend: exerciseTrend(workouts, exercise.id, now),
    favorite: favorites.includes(exercise.id),
  }) : null), [exercise, favorites, now, preference.location, profile?.activities, profile?.limitations, workouts]);
}
