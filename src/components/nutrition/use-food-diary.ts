"use client";

import { useState } from "react";
import { entriesFromSavedMeal, entryFromFood, entryTotals, savedMealFromEntries } from "@/lib/nutrition";
import { useCustomFoods, useFoodLog, useSavedMeals } from "@/lib/store";
import { newId } from "@/lib/training";
import { localDateKey } from "@/lib/utils";
import type { FoodEntry, FoodItem, MealSlot, SavedMeal } from "@/types";

/** Lo que se agregó de una vez: para el aviso («+24 g de proteína», «Meta cumplida», «3 alimentos»). */
export interface Added {
  kcal: number;
  protein: number;
  count: number;
}

/** Un alimento elegido en el buscador con su cantidad; `isNew` si se creó o escaneó (queda en «Mis alimentos»). */
export interface PickedFood {
  food: FoodItem;
  portions: number;
  grams?: number;
  isNew?: boolean;
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
    return { kcal: added.kcal, protein: added.protein, count: entries.length };
  }

  const entriesFor = (meal: MealSlot, items: PickedFood[]) =>
    items.map(({ food, portions, grams }) => entryFromFood(food, { id: newId("comida"), date: localDateKey(), meal, portions, grams }));
  const savedEntries = (meal: MealSlot, saved: SavedMeal) => entriesFromSavedMeal(saved, { date: localDateKey(), meal, newId: () => newId("comida") });
  const yesterdayFor = (meal: MealSlot) => yesterdayEntries.filter((entry) => entry.meal === meal).map((entry) => ({ ...entry, id: newId("comida"), date: localDateKey() }));

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
      return add(entriesFor(meal, [{ food, ...amount }]));
    },
    /**
     * Varios alimentos de una vez (lo elegido en el buscador) y, si se pide, también una comida guardada o lo
     * de ayer. Los nuevos (creados o escaneados) quedan en «Mis alimentos», salvo las calorías rápidas.
     */
    addFoods(meal: MealSlot, items: PickedFood[], { saved, yesterday = false }: { saved?: SavedMeal; yesterday?: boolean } = {}) {
      const created = items.filter((item) => item.isNew && item.food.id !== "rapido").map((item) => item.food);
      if (created.length) setCustomFoods((current) => [...created, ...current.filter((food) => !created.some((item) => item.id === food.id))]);
      return add([...entriesFor(meal, items), ...(saved ? savedEntries(meal, saved) : []), ...(yesterday ? yesterdayFor(meal) : [])]);
    },
    addSavedMeal(meal: MealSlot, saved: SavedMeal) {
      return add(savedEntries(meal, saved));
    },
    /** Repite en hoy lo que comiste ayer en esa comida. */
    repeatYesterday(meal: MealSlot) {
      return add(yesterdayFor(meal));
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

