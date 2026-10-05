"use client";

import { entryTotals, nutritionTargets } from "@/lib/nutrition";
import { useFoodLog, useNutritionProfile, useWeights } from "@/lib/store";
import { localDateKey } from "@/lib/utils";

/** Último peso registrado (kg) o null. */
export function useLatestWeight() {
  const [weights] = useWeights();
  return [...weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.weight ?? null;
}

/** Plan de alimentación y lo registrado hoy, para mostrarlo fuera de Alimentación (Inicio, Perfil). */
export function useNutritionDay(now: number) {
  const [profile] = useNutritionProfile();
  const [log] = useFoodLog();
  const weightKg = useLatestWeight();
  const targets = profile && weightKg && now ? nutritionTargets(profile, weightKg, new Date(now)) : null;
  const today = now ? localDateKey(new Date(now)) : "";
  const totals = entryTotals(log.filter((entry) => entry.date === today));
  return { profile, targets, totals, counting: Boolean(profile && targets && profile.mode === "count") };
}
