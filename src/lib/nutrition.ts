import type { ActivityLevel, FoodEntry, FoodItem, MealSlot, NutritionGoal, NutritionProfile, Sex } from "@/types";

/** Nivel de actividad diaria (incluye el entrenamiento) y su factor sobre el metabolismo basal. */
export const activityLevels: Array<{ value: ActivityLevel; label: string; detail: string; factor: number }> = [
  { value: "sedentary", label: "Sedentaria", detail: "Trabajo sentado y casi sin entrenar", factor: 1.2 },
  { value: "light", label: "Ligera", detail: "Caminas a diario o entrenas 1–2 días", factor: 1.375 },
  { value: "moderate", label: "Moderada", detail: "Entrenas 3–4 días o pasas de pie", factor: 1.55 },
  { value: "active", label: "Alta", detail: "Entrenas 5–6 días o trabajo físico", factor: 1.725 },
  { value: "very-active", label: "Muy alta", detail: "Entrenamiento intenso diario o trabajo muy físico", factor: 1.9 },
];

export const goalLabels: Record<NutritionGoal, string> = { lose: "Bajar grasa", maintain: "Mantener", gain: "Ganar músculo" };
/** Versión corta para el selector de tres opciones («Ganar músculo» no cabe en un tercio de pantalla). */
export const goalShortLabels: Record<NutritionGoal, string> = { ...goalLabels, gain: "Ganar masa" };

/** Ritmos por objetivo, como % sobre el gasto diario. El primero recomendado va marcado. */
export const paceOptions: Record<NutritionGoal, Array<{ value: number; label: string; recommended?: boolean }>> = {
  lose: [
    { value: -10, label: "Suave" },
    { value: -15, label: "Moderado", recommended: true },
    { value: -20, label: "Rápido" },
  ],
  maintain: [{ value: 0, label: "Mantener", recommended: true }],
  gain: [
    { value: 5, label: "Moderado", recommended: true },
    { value: 10, label: "Rápido" },
  ],
};

export function defaultAdjustment(goal: NutritionGoal) {
  return paceOptions[goal].find((option) => option.recommended)?.value ?? 0;
}

/** Mínimo diario que PULSO nunca propone bajar. */
export const calorieFloor: Record<Sex, number> = { female: 1200, male: 1500 };
const KCAL_PER_KG = 7700;

export function ageFrom(birthYear: number, now = new Date()) {
  return now.getFullYear() - birthYear;
}

/** Metabolismo basal (Mifflin-St Jeor). */
export function basalMetabolism({ sex, weightKg, heightCm, age }: { sex: Sex; weightKg: number; heightCm: number; age: number }) {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
}

export interface NutritionTargets {
  bmr: number;
  /** Gasto diario estimado (mantención). */
  tdee: number;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  waterLiters: number;
  /** Cambio de peso esperado por semana, en kg (negativo = bajar). */
  weeklyChangeKg: number;
  /** Por qué el objetivo no sigue el ritmo elegido: mínimo seguro, situación especial o menor de edad. */
  limited: "floor" | "special" | "minor" | null;
  custom: boolean;
}

/** Proteína por kg según objetivo (más alta en déficit para conservar músculo). */
const proteinPerKg: Record<NutritionGoal, number> = { lose: 2, maintain: 1.6, gain: 1.8 };

/**
 * Calorías y macros del día. Mantención = basal × actividad; el ritmo se aplica como % y nunca baja
 * del mínimo seguro ni del basal. Con embarazo/lactancia, antecedente de TCA o menos de 18 años no hay déficit.
 */
export function nutritionTargets(profile: NutritionProfile, weightKg: number, now = new Date()): NutritionTargets {
  const age = ageFrom(profile.birthYear, now);
  const factor = activityLevels.find((level) => level.value === profile.activity)?.factor ?? 1.375;
  const bmr = basalMetabolism({ sex: profile.sex, weightKg, heightCm: profile.heightCm, age });
  const tdee = bmr * factor;
  const minor = age < 18;
  const restricted = minor || profile.special !== "none";
  const adjustment = restricted ? 0 : Math.max(-25, Math.min(15, profile.adjustment));

  let kcal = tdee * (1 + adjustment / 100);
  let limited: NutritionTargets["limited"] = restricted ? (minor ? "minor" : "special") : null;
  const floor = Math.max(calorieFloor[profile.sex], bmr);
  if (adjustment < 0 && kcal < floor) {
    kcal = floor;
    limited = "floor";
  }
  const custom = typeof profile.customKcal === "number";
  if (custom) kcal = Math.max(profile.customKcal ?? kcal, calorieFloor[profile.sex]);
  kcal = Math.round(kcal / 10) * 10;

  // Con IMC alto, la proteína se calcula sobre un peso de referencia (IMC 25) para no exagerarla.
  const heightM = profile.heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const proteinWeight = bmi > 30 ? 25 * heightM * heightM : weightKg;
  const protein = Math.round(proteinWeight * proteinPerKg[profile.goal]);
  const fat = Math.max(Math.round((kcal * 0.27) / 9), Math.round(weightKg * 0.6));
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee / 10) * 10,
    kcal,
    protein,
    fat,
    carbs,
    fiber: Math.round((kcal / 1000) * 14),
    waterLiters: waterGoal(weightKg).liters,
    weeklyChangeKg: Math.round((((kcal - tdee) * 7) / KCAL_PER_KG) * 100) / 100,
    limited,
    custom,
  };
}

/** Valores iniciales razonables a partir de la evaluación (actividad y objetivo). */
/** Objetivo a partir de la evaluación inicial, mientras no hay un plan de alimentación. */
export function goalFromAssessment(goals: string[] = []): NutritionGoal {
  return goals[0] === "weight" ? "lose" : "maintain";
}

export function suggestedNutritionProfile({ activities = [], goals = [] }: { activities?: string[]; goals?: string[] }, now = new Date()): NutritionProfile {
  const activity: ActivityLevel = activities.includes("regular") ? "moderate" : activities.includes("some") || activities.includes("walking") ? "light" : "sedentary";
  const goal = goalFromAssessment(goals);
  return { sex: "female", birthYear: now.getFullYear() - 35, heightCm: 165, activity, goal, adjustment: defaultAdjustment(goal), special: "none", mode: "count", updatedAt: now.toISOString() };
}

// ─── Registro de alimentos ─────────────────────────────────────────────────

export const mealSlots: Array<{ value: MealSlot; label: string }> = [
  { value: "desayuno", label: "Desayuno" },
  { value: "almuerzo", label: "Almuerzo" },
  { value: "once", label: "Once" },
  { value: "cena", label: "Cena" },
  { value: "colacion", label: "Colaciones" },
];

/** Comida que corresponde a la hora: desayuno hasta las 11, almuerzo hasta las 16, once hasta las 19:30 y cena hasta las 23. */
export function mealSlotAt(date: Date): MealSlot {
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour < 5 || hour >= 23) return "colacion";
  if (hour < 11) return "desayuno";
  if (hour < 16) return "almuerzo";
  if (hour < 19.5) return "once";
  return "cena";
}

export interface Totals { kcal: number; protein: number; carbs: number; fat: number }

/** Suma de calorías y macros (cada registro guarda valores por porción y cuántas porciones). */
export function entryTotals(entries: FoodEntry[]): Totals {
  return entries.reduce<Totals>((sum, entry) => ({
    kcal: sum.kcal + entry.kcal * entry.portions,
    protein: sum.protein + entry.protein * entry.portions,
    carbs: sum.carbs + entry.carbs * entry.portions,
    fat: sum.fat + entry.fat * entry.portions,
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

export function entryFromFood(food: FoodItem, { id, date, meal, portions }: { id: string; date: string; meal: MealSlot; portions: number }): FoodEntry {
  return { id, date, meal, foodId: food.id, name: food.name, portion: food.portion, portions, kcal: food.kcal, protein: food.protein, carbs: food.carbs, fat: food.fat };
}

/** Días de registro que se conservan (suficiente para tendencias sin llenar el almacenamiento). */
export const FOOD_LOG_DAYS = 120;

/** Conserva los últimos FOOD_LOG_DAYS días de un historial (alimentos, agua). */
export function pruneHistory<T extends { date: string }>(entries: T[], today: string) {
  const limit = new Date(`${today}T12:00:00`);
  limit.setDate(limit.getDate() - FOOD_LOG_DAYS);
  const cutoff = limit.toISOString().slice(0, 10);
  return entries.filter((entry) => entry.date >= cutoff);
}

// ─── Agua ──────────────────────────────────────────────────────────────────

export const GLASS_ML = 250;

/**
 * Meta de agua para beber: 35 ml/kg es el agua total del día y cerca del 20 % llega con la comida, así que
 * se beben unos 28 ml/kg, en vasos de 250 ml (entre 6 y 14). Sin peso registrado, 8 vasos (2 L).
 */
export function waterGoal(weightKg: number | null) {
  const glasses = weightKg ? Math.min(14, Math.max(6, Math.round((weightKg * 28) / GLASS_ML))) : 8;
  return { glasses, liters: (glasses * GLASS_ML) / 1000 };
}

export function formatLiters(glasses: number) {
  return ((glasses * GLASS_ML) / 1000).toLocaleString("es-CL", { maximumFractionDigits: 2 });
}

/** Alimentos usados más recientemente (sin repetir), para registrar con un toque. */
export function recentFoods(entries: FoodEntry[], limit = 8) {
  const seen = new Set<string>();
  const recent: FoodEntry[] = [];
  for (const entry of [...entries].reverse()) {
    if (entry.foodId === "rapido" || seen.has(entry.foodId)) continue;
    seen.add(entry.foodId);
    recent.push(entry);
    if (recent.length >= limit) break;
  }
  return recent;
}

export const formatKcal = (value: number) => Math.round(value).toLocaleString("es-CL");
export const formatGrams = (value: number) => `${Math.round(value)} g`;
