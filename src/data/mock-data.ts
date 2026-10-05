import type { Article, Habit, Meal, TrainingEquipment, User, WeekDay, WeightEntry } from "@/types";

export const equipmentOptions: Array<{ value: TrainingEquipment; label: string }> = [
  { value: "dumbbells", label: "Mancuernas" },
  { value: "barbell", label: "Barra y discos" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "bands", label: "Bandas" },
  { value: "bench", label: "Banco" },
  { value: "pullup-bar", label: "Barra de dominadas" },
];

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

export const weekDays: WeekDay[] = [
  { date: "2026-07-27", short: "L", number: 27, status: "done" },
  { date: "2026-07-28", short: "M", number: 28, status: "rest" },
  { date: "2026-07-29", short: "M", number: 29, status: "done" },
  { date: "2026-07-30", short: "J", number: 30, status: "rest" },
  { date: "2026-07-31", short: "V", number: 31, status: "today" },
  { date: "2026-08-01", short: "S", number: 1, status: "planned" },
  { date: "2026-08-02", short: "D", number: 2, status: "rest" },
];
