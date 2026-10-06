"use client";

import { useCallback, useMemo } from "react";
import type { SetStateAction } from "react";
import { meals as initialMeals } from "@/data/mock-data";
import type { AssessmentProfile } from "@/components/onboarding/wellness-assessment";
import { defaultRoutine, defaultTrainingPreference, routineWithId } from "@/lib/training";
import { useNow } from "@/lib/use-now";
import { removePersistentKey, removePersistentMemory, usePersistentState } from "@/lib/use-persistent-state";
import { localDateKey } from "@/lib/utils";
import type { FoodEntry, FoodItem, Meal, MeasurementEntry, NutritionProfile, ProgramProgress, ReadinessEntry, SavedMeal, Settings, TrainingDraft, TrainingPreference, TrainingRoutine, WaterEntry, WeightEntry, WorkoutEntry } from "@/types";
import { STORAGE_KEYS } from "@/lib/storage-keys";

/** Claves de almacenamiento local. Se conservan las anteriores para no perder registros. */
export { STORAGE_KEYS };

export const defaultSettings: Settings = {
  name: "",
  unit: "kg",
  theme: "system",
  weeklyGoal: 3,
  pausedWeeks: [],
  defaultRest: 90,
  sound: true,
  vibration: true,
  keepAwake: true,
  autoRest: true,
  barWeight: 20,
  plates: [25, 20, 15, 10, 5, 2.5, 1.25],
};

const emptyWorkouts: WorkoutEntry[] = [];
const emptyReadiness: ReadinessEntry[] = [];
const emptyMeasurements: MeasurementEntry[] = [];
const emptyWeights: WeightEntry[] = [];
const emptyFavorites: number[] = [];
const emptySettings: Partial<Settings> = {};
const emptyIds: number[] = [];
const emptyFoodLog: FoodEntry[] = [];
const emptyFoods: FoodItem[] = [];
const emptyWater: WaterEntry[] = [];
const emptySavedMeals: SavedMeal[] = [];
/** Plantilla diaria de comidas: todas pendientes. */
const mealTemplate: Meal[] = initialMeals.map((meal) => ({ id: meal.id, name: meal.name, time: meal.time, status: "Pendiente" as const }));

type Daily<T> = { date: string; value: T };

function isDaily<T>(stored: T | Daily<T>): stored is Daily<T> {
  return typeof stored === "object" && stored !== null && !Array.isArray(stored) && "date" in stored && "value" in stored;
}

/**
 * Estado que se reinicia cada día. Los valores guardados sin fecha (versión anterior) se muestran tal cual
 * hasta el siguiente cambio, que ya se guarda con la fecha de hoy.
 */
function useDailyState<T>(key: string, fresh: T) {
  const [stored, setStored] = usePersistentState<T | Daily<T>>(key, fresh);
  const now = useNow();
  const today = now ? localDateKey(new Date(now)) : null;
  const value = useMemo(() => {
    // Valores sin fecha (versión anterior) se consideran de otro día.
    if (!isDaily(stored)) return fresh;
    return today && stored.date !== today ? fresh : stored.value;
  }, [fresh, stored, today]);
  const setValue = useCallback((next: SetStateAction<T>) => {
    const date = localDateKey();
    return setStored((current) => {
      const base = isDaily(current) && current.date === date ? current.value : fresh;
      return { date, value: typeof next === "function" ? (next as (value: T) => T)(base) : next };
    });
  }, [fresh, setStored]);
  return [value, setValue] as const;
}

export function useProfile() {
  return usePersistentState<AssessmentProfile | null>(STORAGE_KEYS.profile, null);
}

export function useWorkouts() {
  return usePersistentState<WorkoutEntry[]>(STORAGE_KEYS.workouts, emptyWorkouts);
}

export function useDraft() {
  return usePersistentState<TrainingDraft | null>(STORAGE_KEYS.draft, null);
}

export function usePreference() {
  return usePersistentState<TrainingPreference>(STORAGE_KEYS.preference, defaultTrainingPreference);
}

export function useReadiness() {
  return usePersistentState<ReadinessEntry[]>(STORAGE_KEYS.readiness, emptyReadiness);
}

export function useWeights() {
  return usePersistentState<WeightEntry[]>(STORAGE_KEYS.weights, emptyWeights);
}

export function useMeasurements() {
  return usePersistentState<MeasurementEntry[]>(STORAGE_KEYS.measurements, emptyMeasurements);
}

/** Hábitos completados hoy (se reinician cada día). */
export function useHabits() {
  return useDailyState<number[]>(STORAGE_KEYS.habits, emptyIds);
}

/** Comidas de hoy (se reinician cada día). */
export function useMeals() {
  return useDailyState<Meal[]>(STORAGE_KEYS.meals, mealTemplate);
}

export function useProgram() {
  return usePersistentState<ProgramProgress | null>(STORAGE_KEYS.program, null);
}

export function useFavorites() {
  return usePersistentState<number[]>(STORAGE_KEYS.favorites, emptyFavorites);
}

/** Datos para calcular calorías y macros (null hasta completar el cálculo). */
export function useNutritionProfile() {
  return usePersistentState<NutritionProfile | null>(STORAGE_KEYS.nutrition, null);
}

/** Alimentos registrados de los últimos días (cada uno con su fecha y comida). */
export function useFoodLog() {
  return usePersistentState<FoodEntry[]>(STORAGE_KEYS.foodLog, emptyFoodLog);
}

/** Alimentos creados por la persona. */
export function useCustomFoods() {
  return usePersistentState<FoodItem[]>(STORAGE_KEYS.customFoods, emptyFoods);
}

/** Comidas guardadas para registrar con un toque. */
export function useSavedMeals() {
  return usePersistentState<SavedMeal[]>(STORAGE_KEYS.savedMeals, emptySavedMeals);
}

/** Vasos de agua por día (historial de 120 días). */
export function useWater() {
  return usePersistentState<WaterEntry[]>(STORAGE_KEYS.water, emptyWater);
}

/** Ajustes con valores por defecto para campos añadidos después de guardarse. */
export function useSettings() {
  const [stored, setStored] = usePersistentState<Partial<Settings>>(STORAGE_KEYS.settings, emptySettings);
  const [profile] = useProfile();
  const settings = useMemo<Settings>(() => ({
    ...defaultSettings,
    weeklyGoal: profile?.recommendation.sessionsPerWeek ?? defaultSettings.weeklyGoal,
    ...stored,
  }), [profile, stored]);
  const update = useCallback((patch: Partial<Settings>) => setStored((current) => ({ ...current, ...patch })), [setStored]);
  return [settings, update] as const;
}

/** Rutinas guardadas. Si sólo existe la rutina única anterior, se migra al vuelo. */
export function useRoutines() {
  const [stored, setStored] = usePersistentState<TrainingRoutine[] | null>(STORAGE_KEYS.routines, null);
  const [legacy] = usePersistentState<TrainingRoutine | null>(STORAGE_KEYS.routine, null);
  const routines = useMemo(() => (stored ?? [legacy ?? defaultRoutine]).map(routineWithId), [legacy, stored]);
  const setRoutines = useCallback((next: SetStateAction<Array<TrainingRoutine & { id: string }>>) => {
    return setStored((current) => {
      const base = (current ?? [legacy ?? defaultRoutine]).map(routineWithId);
      return typeof next === "function" ? next(base) : next;
    });
  }, [legacy, setStored]);
  return [routines, setRoutines] as const;
}

/** Todas las claves de PULSO, para exportar, importar o borrar datos. */
export function readAllData(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of Object.values(STORAGE_KEYS)) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) data[key] = JSON.parse(raw);
    } catch {
      // Una clave ilegible no impide exportar el resto.
    }
  }
  return data;
}

type Shape = "array" | "object" | "object-or-null" | "array-or-null";

/** Forma esperada de cada clave, para rechazar respaldos dañados antes de escribir. */
const keyShapes: Record<string, Shape> = {
  [STORAGE_KEYS.profile]: "object-or-null",
  [STORAGE_KEYS.workouts]: "array",
  [STORAGE_KEYS.draft]: "object-or-null",
  [STORAGE_KEYS.routine]: "object-or-null",
  [STORAGE_KEYS.routines]: "array-or-null",
  [STORAGE_KEYS.preference]: "object",
  [STORAGE_KEYS.readiness]: "array",
  [STORAGE_KEYS.weights]: "array",
  [STORAGE_KEYS.measurements]: "array",
  [STORAGE_KEYS.habits]: "object",
  [STORAGE_KEYS.meals]: "object",
  [STORAGE_KEYS.settings]: "object",
  [STORAGE_KEYS.program]: "object-or-null",
  [STORAGE_KEYS.favorites]: "array",
  [STORAGE_KEYS.nutrition]: "object-or-null",
  [STORAGE_KEYS.foodLog]: "array",
  [STORAGE_KEYS.customFoods]: "array",
  [STORAGE_KEYS.water]: "array",
  [STORAGE_KEYS.savedMeals]: "array",
};

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function matchesShape(key: string, value: unknown) {
  const shape = keyShapes[key];
  if (shape === "array") return Array.isArray(value);
  if (shape === "array-or-null") return value === null || Array.isArray(value);
  if (shape === "object-or-null") return value === null || isObject(value);
  // Hábitos y comidas pueden venir como arreglo (versión anterior) o con fecha.
  if (key === STORAGE_KEYS.habits || key === STORAGE_KEYS.meals) return Array.isArray(value) || isObject(value);
  return isObject(value);
}

/** Valida un respaldo y devuelve las claves inválidas (vacío si es correcto). */
export function invalidBackupKeys(data: Record<string, unknown>) {
  const invalid: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (!(key in keyShapes) || !matchesShape(key, value)) { invalid.push(key); continue; }
    if (key === STORAGE_KEYS.workouts && !(value as unknown[]).every((item) => isObject(item) && typeof item.id === "string" && typeof item.date === "string" && typeof item.completedAt === "string")) invalid.push(key);
  }
  return invalid;
}

/**
 * Reemplaza los datos de PULSO por los de un respaldo, todo o nada: si una escritura falla,
 * se restauran los valores anteriores. Las claves ausentes del respaldo se conservan.
 * Devuelve cuántas claves se importaron.
 */
export function writeAllData(data: Record<string, unknown>) {
  const invalid = invalidBackupKeys(data);
  if (invalid.length) throw new Error("El respaldo tiene datos con un formato que PULSO no reconoce.");
  const entries = Object.entries(data);
  const previous = new Map(entries.map(([key]) => [key, window.localStorage.getItem(key)]));
  try {
    for (const [key, value] of entries) window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    for (const [key, raw] of previous) {
      try {
        if (raw === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, raw);
      } catch {
        // Si ni siquiera se puede restaurar, se mantiene lo que haya.
      }
    }
    throw new Error("No hay espacio suficiente en este dispositivo para importar el respaldo.");
  }
  for (const [key] of entries) {
    removePersistentMemory(key);
    window.dispatchEvent(new CustomEvent("pulso:storage", { detail: key }));
  }
  return entries.length;
}

export function clearAllData() {
  for (const key of Object.values(STORAGE_KEYS)) removePersistentKey(key);
}
