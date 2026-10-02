import type { Meal } from "@/types";

/** Grupos que se pueden marcar en cada comida, en el orden en que se guardan. */
export const mealGroups = ["Proteína", "Verduras", "Fruta", "Carbohidrato", "Bebida"];

/** Escala de saciedad: de 1 (con hambre) a 5 (muy lleno/a). */
export const satietyLabels: Record<number, string> = {
  1: "Con hambre",
  2: "Algo de hambre",
  3: "Bien",
  4: "Satisfecho/a",
  5: "Muy lleno/a",
};

export interface MealDetail {
  groups: string[];
  satiety: number | null;
  note: string;
}

export const isLogged = (meal: Meal) => meal.status === "Registrada";

// Con espacio duro para que el artículo no quede solo al final de una línea.
const mealArticles: Record<string, string> = { desayuno: "el\u00a0desayuno", almuerzo: "el\u00a0almuerzo", once: "la\u00a0once", cena: "la\u00a0cena" };

/** Nombre de la comida con su artículo, para usarlo dentro de una frase ("Idea para la once"). */
export function mealPhrase(meal: Meal) {
  return mealArticles[meal.id] ?? meal.name.toLocaleLowerCase("es-CL");
}

/** El resumen guarda "Grupo · Grupo · Saciedad 4/5 — nota" para seguir siendo legible como texto. */
export function parseSummary(summary?: string): MealDetail {
  if (!summary) return { groups: [], satiety: null, note: "" };
  const [main, ...noteParts] = summary.split(" — ");
  let satiety: number | null = null;
  const items: string[] = [];
  for (const part of main.split(" · ").map((item) => item.trim()).filter(Boolean)) {
    const match = /^Saciedad (\d)\/5$/.exec(part);
    if (match) satiety = Number(match[1]);
    else items.push(part);
  }
  return { groups: items, satiety, note: noteParts.join(" — ").trim() };
}

export function buildSummary(detail: MealDetail) {
  const main = [...detail.groups, ...(detail.satiety ? [`Saciedad ${detail.satiety}/5`] : [])].join(" · ");
  const note = detail.note.trim().replace(/\s+/g, " ");
  return note ? `${main} — ${note}` : main;
}

/** Idea para la próxima comida pendiente, o una lectura del día cuando ya está todo registrado. */
export function mealIdea(next: Meal | undefined) {
  if (next?.id === "once") return { title: "Una once que evite el picoteo nocturno", detail: "Combina yogur natural o huevo con fruta y pan integral. La proteína ayuda a llegar con menos hambre a la cena." };
  if (next?.id === "cena") return { title: "Cierra el día con una cena simple", detail: "Usa medio plato de verduras, una porción de proteína y agrega carbohidrato si aún tienes hambre." };
  if (next) return { title: "Empieza con proteína y algo fresco", detail: "Una porción de proteína y una fruta o verdura te ayudan a sostener la energía hasta la próxima comida." };
  return { title: "Tu registro de hoy está completo", detail: "No necesitas compensar ni comer perfecto. Observa qué combinación te dio mejor energía y saciedad." };
}

/** Lo registrado hoy: detalle de cada comida, saciedad media y comidas con verduras. */
export function mealStats(meals: Meal[]) {
  const details = meals.filter(isLogged).map((meal) => parseSummary(meal.summary));
  const rated = details.map((detail) => detail.satiety).filter((value): value is number => value !== null);
  return {
    details,
    satiety: rated.length ? rated.reduce((total, value) => total + value, 0) / rated.length : null,
    withVeggies: details.filter((detail) => detail.groups.includes("Verduras")).length,
  };
}
