"use client";

import { entryTotals, nutritionTargets, pruneHistory, waterGoal } from "@/lib/nutrition";
import { useFoodLog, useNutritionProfile, useWater, useWeights } from "@/lib/store";
import { localDateKey } from "@/lib/utils";

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
      return pruneHistory([...current.filter((entry) => entry.date !== date), { date, glasses: value }], date);
    });
  }

  return { glasses, goal, change };
}
