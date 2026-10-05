/** Claves de PULSO en el almacenamiento del navegador (también las usa la sincronización con la nube). */
export const STORAGE_KEYS = {
  profile: "pulso:assessment",
  workouts: "pulso:workouts",
  draft: "pulso:active-workout",
  routine: "pulso:routine",
  routines: "pulso:routines",
  preference: "pulso:training-preference",
  readiness: "pulso:readiness",
  weights: "pulso:weights",
  measurements: "pulso:measurements",
  habits: "pulso:habits",
  meals: "pulso:meals",
  settings: "pulso:settings",
  program: "pulso:program",
  favorites: "pulso:favorites",
  nutrition: "pulso:nutrition",
  foodLog: "pulso:food-log",
  customFoods: "pulso:custom-foods",
  water: "pulso:water",
} as const;

export type StorageKeyName = keyof typeof STORAGE_KEYS;
