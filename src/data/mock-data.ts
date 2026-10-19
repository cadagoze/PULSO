import type { Article, Habit, Meal, User } from "@/types";

export const user: User = {
  name: "Carlos",
  initials: "CA",
  currentWeight: 82.4,
  goalWeight: 78,
};

export { exercises } from "./exercises";

export const habits: Habit[] = [
  { id: 1, title: "Caminar diez minutos", detail: "Después del almuerzo" },
  { id: 2, title: "Agregar verduras", detail: "En al menos una comida" },
];

export const meals: Meal[] = [
  { id: "desayuno", name: "Desayuno", time: "08:15", status: "Registrada", summary: "Proteína · Fruta · Bebida" },
  { id: "almuerzo", name: "Almuerzo", time: "13:30", status: "Registrada", summary: "Proteína · Verduras · Carbohidrato" },
  { id: "once", name: "Once", time: "17:30", status: "Pendiente" },
  { id: "cena", name: "Cena", time: "20:30", status: "Pendiente" },
];

export const articles: Article[] = [
  { id: 1, title: "Subió la balanza: qué mirar antes de preocuparte", category: "Alimentación", readTime: "4 min", featured: true },
  { id: 2, title: "Fuerza y caminatas: una semana que sí cabe en tu agenda", category: "Entrenamiento", readTime: "5 min" },
  { id: 3, title: "Perdiste una semana: cómo retomar sin compensar", category: "Entrenamiento", readTime: "3 min" },
  { id: 4, title: "Tres señales de que hoy necesitas recuperar", category: "Descanso", readTime: "6 min" },
  { id: 5, title: "Arma un plato completo sin pesar alimentos", category: "Alimentación", readTime: "5 min" },
  { id: 6, title: "Cuándo subir repeticiones y cuándo mantener", category: "Entrenamiento", readTime: "4 min" },
];

