import { mealIdeas } from "@/data/foods";
import { mealSlotAt, type NutritionTargets, type Totals } from "@/lib/nutrition";
import { localDateKey } from "@/lib/utils";
import type { FoodEntry, FoodItem, MealSlot } from "@/types";

export interface FoodIdea {
  food: FoodItem;
  portions: number;
  kcal: number;
  protein: number;
  /** Ya lo has registrado antes. */
  usual: boolean;
}

export interface DayGap {
  kcalLeft: number;
  proteinLeft: number;
  /** Comida de esta hora: ahí se agregan las ideas. */
  meal: MealSlot;
  /** Proteína si falta (10 g o más); si no, sólo energía. */
  focus: "protein" | "energy";
  ideas: FoodIdea[];
}

const MAIN_MEALS: MealSlot[] = ["desayuno", "almuerzo", "once", "cena"];

/** «Ideas para la once», «para el almuerzo», «para una colación». */
export const forMeal: Record<MealSlot, string> = { desayuno: "el desayuno", almuerzo: "el almuerzo", once: "la once", cena: "la cena", colacion: "una colación" };
const IDEAS = 3;

/**
 * Lo que falta para el objetivo del día e ideas para la comida de ahora: alimentos que caben en la
 * parte de las calorías restantes que le toca a esta comida y, si falta proteína, los que más aportan
 * por caloría. Sólo ideas propias de esta comida (las típicas y lo que sueles comer en ella), con lo
 * habitual primero, sin repetir categoría ni lo ya registrado en esta comida hoy.
 * Con el día cubierto o casi, no sugiere nada: nunca empuja a comer por sobre el objetivo.
 */
export function dayGap({ targets, totals, now, catalog, history }: {
  targets: Pick<NutritionTargets, "kcal" | "protein">;
  totals: Totals;
  now: Date;
  catalog: FoodItem[];
  history: FoodEntry[];
}): DayGap | null {
  const kcalLeft = Math.round(targets.kcal - totals.kcal);
  const proteinLeft = Math.round(targets.protein - totals.protein);
  if (kcalLeft < 120 || (kcalLeft < 200 && proteinLeft < 10)) return null;

  const meal = mealSlotAt(now);
  const index = MAIN_MEALS.indexOf(meal);
  const mealsLeft = index < 0 ? 1 : MAIN_MEALS.length - index;
  const budget = Math.min(kcalLeft, Math.max(150, kcalLeft / mealsLeft));
  const focus = proteinLeft >= 10 ? "protein" : "energy";

  // Veces que lo comiste: en esta comida cuenta doble.
  const today = localDateKey(now);
  const times = new Map<string, number>();
  const here = new Set<string>();
  const eatenNow = new Set<string>();
  const lastPortions = new Map<string, number>();
  for (const entry of history) {
    if (entry.foodId === "rapido") continue;
    times.set(entry.foodId, (times.get(entry.foodId) ?? 0) + (entry.meal === meal ? 2 : 1));
    lastPortions.set(entry.foodId, entry.portions);
    if (entry.meal !== meal) continue;
    here.add(entry.foodId);
    if (entry.date === today) eatenNow.add(entry.foodId);
  }
  const curated = new Set(mealIdeas[meal]);
  const byId = new Map(catalog.map((food) => [food.id, food]));
  const scored: Array<FoodIdea & { score: number }> = [];

  for (const id of new Set([...here, ...curated])) {
    const food = byId.get(id);
    if (!food || food.alcohol || eatenNow.has(id)) continue;
    // Bebidas y dulces sólo si están entre las ideas de esta comida.
    if (!curated.has(id) && (food.category === "bebidas" || food.category === "snacks")) continue;
    let portions = lastPortions.get(id) ?? 1;
    while (portions > 0.5 && food.kcal * portions > budget) portions -= 0.5;
    const kcal = food.kcal * portions;
    const protein = food.protein * portions;
    if (kcal > budget || kcal < 20) continue;
    const familiar = 1 + Math.min(times.get(id) ?? 0, 6) * 0.15;
    let score: number;
    if (focus === "protein") {
      if (protein < 6) continue;
      score = ((protein * 4) / kcal) * (0.6 + 0.4 * Math.min(1, protein / Math.max(10, proteinLeft))) * familiar;
    } else {
      score = (0.5 + (0.5 * kcal) / budget) * familiar;
    }
    scored.push({ food, portions, kcal: Math.round(kcal), protein: Math.round(protein), usual: times.has(id), score });
  }

  scored.sort((a, b) => b.score - a.score || a.food.id.localeCompare(b.food.id));
  const ideas: FoodIdea[] = [];
  const categories = new Set<string>();
  for (const { food, portions, kcal, protein, usual } of scored) {
    if (categories.has(food.category)) continue;
    categories.add(food.category);
    ideas.push({ food, portions, kcal, protein, usual });
    if (ideas.length === IDEAS) break;
  }
  return { kcalLeft, proteinLeft, meal, focus, ideas };
}
