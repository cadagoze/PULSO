import type { Article, Exercise, Habit, Meal, User, WeekDay, WeightEntry } from "@/types";

export const user: User = {
  name: "Carlos",
  initials: "CA",
  currentWeight: 82.4,
  goalWeight: 78,
};

export const weightHistory: WeightEntry[] = [
  { date: "2026-07-05", label: "5 jul", weight: 84 },
  { date: "2026-07-09", label: "9 jul", weight: 83.7 },
  { date: "2026-07-13", label: "13 jul", weight: 83.8 },
  { date: "2026-07-17", label: "17 jul", weight: 83.1 },
  { date: "2026-07-21", label: "21 jul", weight: 82.9 },
  { date: "2026-07-25", label: "25 jul", weight: 82.5 },
  { date: "2026-07-29", label: "29 jul", weight: 82.7 },
  { date: "2026-08-02", label: "Hoy", weight: 82.4 },
];

export const exercises: Exercise[] = [
  { id: 1, name: "Sentadilla a silla", sets: 3, target: "10 repeticiones", muscle: "Piernas", completed: false },
  { id: 2, name: "Flexiones inclinadas", sets: 3, target: "8 repeticiones", muscle: "Pecho y brazos", completed: false },
  { id: 3, name: "Puente de glúteos", sets: 3, target: "12 repeticiones", muscle: "Glúteos", completed: false },
  { id: 4, name: "Plancha adaptada", sets: 3, target: "25 segundos", muscle: "Centro", completed: false },
  { id: 5, name: "Marcha rápida", sets: 1, target: "3 minutos", muscle: "Cardio", completed: false },
];

export const habits: Habit[] = [
  { id: 1, title: "Caminar diez minutos", detail: "Después del almuerzo" },
  { id: 2, title: "Agregar verduras", detail: "En al menos una comida" },
  { id: 3, title: "Tomar agua", detail: "Durante la tarde" },
];

export const meals: Meal[] = [
  { id: "desayuno", name: "Desayuno", time: "08:15", status: "Registrada", summary: "Proteína · Fruta · Bebida" },
  { id: "almuerzo", name: "Almuerzo", time: "13:30", status: "Registrada", summary: "Proteína · Verduras · Carbohidrato" },
  { id: "once", name: "Once", time: "17:30", status: "Pendiente" },
  { id: "cena", name: "Cena", time: "20:30", status: "Pendiente" },
];

export const articles: Article[] = [
  { id: 1, title: "Por qué el peso cambia cada día", category: "Alimentación", readTime: "4 min", featured: true },
  { id: 2, title: "Cómo combinar fuerza y caminatas", category: "Entrenamiento", readTime: "5 min" },
  { id: 3, title: "Cómo volver después de una pausa", category: "Entrenamiento", readTime: "3 min" },
  { id: 4, title: "Sueño y recuperación", category: "Descanso", readTime: "6 min" },
  { id: 5, title: "Cómo crear una comida equilibrada", category: "Alimentación", readTime: "5 min" },
  { id: 6, title: "La importancia de avanzar gradualmente", category: "Entrenamiento", readTime: "4 min" },
];

export const weekDays: WeekDay[] = [
  { short: "L", number: 27, status: "done" },
  { short: "M", number: 28, status: "rest" },
  { short: "M", number: 29, status: "done" },
  { short: "J", number: 30, status: "rest" },
  { short: "V", number: 31, status: "today" },
  { short: "S", number: 1, status: "planned" },
  { short: "D", number: 2, status: "rest" },
];
