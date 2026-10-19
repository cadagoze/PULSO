"use client";

import { useState } from "react";
import { entriesFromSavedMeal, entryFromFood, entryTotals, savedMealFromEntries } from "@/lib/nutrition";
import { useCustomFoods, useFoodLog, useSavedMeals } from "@/lib/store";
import { newId } from "@/lib/training";
import { localDateKey } from "@/lib/utils";
import type { FoodEntry, FoodItem, MealSlot, SavedMeal } from "@/types";

/** Lo que se agregó de una vez: para el aviso («+24 g de proteína», «Meta cumplida»). */
export interface Added {
  kcal: number;
  protein: number;
}

/**
 * El diario de alimentos de hoy: lo registrado hoy y ayer, y cómo agregar (un alimento, una comida
 * guardada o lo de ayer), editar, quitar y guardar comidas. Funciona con o sin calorías contadas.
 */
export function useFoodDiary(now: number) {
  const [log, setLog] = useFoodLog();
  const [customFoods, setCustomFoods] = useCustomFoods();
  const [savedMeals, setSavedMeals] = useSavedMeals();
  // Último alimento agregado en esta visita: sólo él anima su aparición.
  const [fresh, setFresh] = useState<string | null>(null);

  const today = localDateKey(new Date(now));
  const before = new Date(now);
  before.setDate(before.getDate() - 1);
  const yesterday = localDateKey(before);
  const todayEntries = log.filter((entry) => entry.date === today);
  const yesterdayEntries = log.filter((entry) => entry.date === yesterday);
  const totals = entryTotals(todayEntries);

  function add(entries: FoodEntry[]): Added | null {
    if (!entries.length) return null;
    setLog((current) => [...current, ...entries]);
    setFresh(entries[0].id);
    const added = entryTotals(entries);
    return { kcal: added.kcal, protein: added.protein };
  }

  return {
    log,
    customFoods,
    savedMeals,
    fresh,
    todayEntries,
    yesterdayEntries,
    totals,
    /** Un alimento en una comida de hoy (porciones o gramos). */
    addFood(food: FoodItem, meal: MealSlot, amount: { portions: number; grams?: number }) {
      return add([entryFromFood(food, { id: newId("comida"), date: localDateKey(), meal, ...amount })]);
    },
    /** Alimento nuevo (creado o escaneado): queda en «Mis alimentos» (salvo las calorías rápidas) y se registra. */
    createFood(food: FoodItem, meal: MealSlot, amount: { portions: number; grams?: number }) {
      if (food.id !== "rapido") setCustomFoods((current) => [food, ...current.filter((item) => item.id !== food.id)]);
      return add([entryFromFood(food, { id: newId("comida"), date: localDateKey(), meal, ...amount })]);
    },
    addSavedMeal(meal: MealSlot, saved: SavedMeal) {
      return add(entriesFromSavedMeal(saved, { date: localDateKey(), meal, newId: () => newId("comida") }));
    },
    /** Repite en hoy lo que comiste ayer en esa comida. */
    repeatYesterday(meal: MealSlot) {
      return add(yesterdayEntries.filter((entry) => entry.meal === meal).map((entry) => ({ ...entry, id: newId("comida"), date: localDateKey() })));
    },
    updateEntry(id: string, { portions, grams }: { portions: number; grams?: number }) {
      setLog((current) => current.map((entry) => {
        if (entry.id !== id) return entry;
        const next: FoodEntry = { ...entry, portions, grams };
        if (!grams) delete next.grams;
        return next;
      }));
    },
    removeEntry(id: string) {
      setLog((current) => current.filter((entry) => entry.id !== id));
    },
    /** Guarda los alimentos de una comida de hoy para repetirla con un toque (mismo nombre = se actualiza). */
    saveMeal(meal: MealSlot, name: string) {
      const entries = todayEntries.filter((entry) => entry.meal === meal);
      if (!entries.length) return null;
      const existing = savedMeals.find((item) => item.name.toLowerCase() === name.toLowerCase());
      const saved = savedMealFromEntries(entries, { id: existing?.id ?? newId("guardada"), name, meal });
      setSavedMeals((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      return saved;
    },
    deleteSavedMeal(id: string) {
      setSavedMeals((current) => current.filter((item) => item.id !== id));
    },
  };
}

export type FoodDiary = ReturnType<typeof useFoodDiary>;
