"use client";

import { useMemo } from "react";
import { useFavorites, useNutritionProfile, usePreference, useProfile, useSettings, useWorkouts } from "@/lib/store";
import { planAdjustments, planInputFor } from "@/lib/training-plan";
import type { PlanAdjustment } from "@/lib/training-plan";
import { useLatestWeight } from "@/lib/use-nutrition";
import { volumeShift } from "@/lib/volume-adaptation";

/**
 * Lo que PULSO ajustó en las series de esta semana (por región, con su motivo): sale de cómo te fue las
 * últimas semanas y se calcula en el teléfono. Con `enabled` en falso no calcula nada.
 */
export function useWeekAdjustments(now: number, enabled = true): PlanAdjustment[] {
  const [workouts] = useWorkouts();
  const [settings] = useSettings();
  const [profile] = useProfile();
  const [nutrition] = useNutritionProfile();
  const [preference] = usePreference();
  const [favorites] = useFavorites();
  const bodyKg = useLatestWeight();
  const hour = Math.floor(now / 3_600_000) * 3_600_000;
  return useMemo(() => {
    if (!enabled || !hour) return [];
    const input = planInputFor({ profile, nutritionGoal: nutrition?.goal, settings, preference, workouts, favorites, bodyKg, now: hour });
    const { changes } = volumeShift(workouts, { now: hour, level: input.level ?? 1, goal: input.goal ?? "strength" });
    return changes.length ? planAdjustments(input, changes) : [];
  }, [bodyKg, enabled, favorites, hour, nutrition?.goal, preference, profile, settings, workouts]);
}
