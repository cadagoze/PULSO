"use client";

import { useMemo } from "react";
import { isLogged } from "@/components/content/meal-log";
import { entryTotals, nutritionTargets, suggestedNutritionProfile, waterGoal } from "@/lib/nutrition";
import { useFoodLog, useMeals, useNutritionProfile, useProfile, useWater, useWeights } from "@/lib/store";
import { localDateKey } from "@/lib/utils";
import { weeklyReview, type WeeklyReview } from "@/lib/weekly-review";

/** Último peso registrado (kg) o null. */
export function useLatestWeight() {
  const [weights] = useWeights();
  return [...weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.weight ?? null;
}

/** Plan de alimentación y lo registrado hoy, para mostrarlo fuera de Nutrición (Inicio, Perfil). */
export function useNutritionDay(now: number) {
  const [profile] = useNutritionProfile();
  const [log] = useFoodLog();
  const weightKg = useLatestWeight();
  const targets = profile && weightKg && now ? nutritionTargets(profile, weightKg, new Date(now)) : null;
  const today = now ? localDateKey(new Date(now)) : "";
  const totals = entryTotals(log.filter((entry) => entry.date === today));
  return { profile, targets, totals, counting: Boolean(profile && targets && profile.mode === "count") };
}

/** Vasos de agua de hoy, la meta según tu peso y cómo sumar o quitar un vaso. */
export function useWaterToday(now: number) {
  const [entries, setEntries] = useWater();
  const goal = waterGoal(useLatestWeight());
  const today = now ? localDateKey(new Date(now)) : "";
  const glasses = entries.find((entry) => entry.date === today)?.glasses ?? 0;

  function change(delta: number) {
    const date = localDateKey();
    setEntries((current) => {
      const value = Math.max(0, Math.min(30, (current.find((entry) => entry.date === date)?.glasses ?? 0) + delta));
      return [...current.filter((entry) => entry.date !== date), { date, glasses: value }];
    });
  }

  return { glasses, goal, change };
}

/**
 * Tu día de comidas para mostrar (Inicio y Comidas): qué comidas registraste (por saciedad o con
 * alimentos), la proteína frente a tu meta y el agua. La meta sale de tu plan o, sin plan, de tu peso
 * y tu objetivo. Con antecedente de TCA no hay números (`protein` en null).
 */
export function useDayMeals(now: number) {
  const { profile, targets, totals, counting } = useNutritionDay(now);
  const [assessment] = useProfile();
  const weightKg = useLatestWeight();
  const [meals] = useMeals();
  const [log] = useFoodLog();
  const water = useWaterToday(now);
  const today = now ? localDateKey(new Date(now)) : "";
  const done = new Set<string>([...meals.filter(isLogged).map((meal) => meal.id), ...log.filter((entry) => entry.date === today).map((entry) => entry.meal)]);
  const safe = profile?.special === "eating-disorder";
  const goal = targets?.protein
    ?? (weightKg && now ? nutritionTargets(suggestedNutritionProfile({ activities: assessment?.activities, goals: assessment?.goals, sex: assessment?.sex }, new Date(now)), weightKg, new Date(now)).protein : null);
  const protein = safe ? null : { value: totals.protein, goal, ...(counting && targets ? { kcal: { value: totals.kcal, goal: targets.kcal } } : {}) };
  return { done, protein, water, safe, counting, targets, profile };
}

/** Revisión semanal de calorías según la tendencia del peso (ver weekly-review.ts). */
export function useWeeklyReview(now: number): WeeklyReview {
  const [profile] = useNutritionProfile();
  const [weights] = useWeights();
  const [log] = useFoodLog();
  const today = now ? localDateKey(new Date(now)) : "";
  return useMemo(() => (profile && today ? weeklyReview({ profile, weights, foodLog: log, today }) : { status: "unavailable" }), [log, profile, today, weights]);
}
