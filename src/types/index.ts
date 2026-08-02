export interface User {
  name: string;
  initials: string;
  currentWeight: number;
  goalWeight: number;
}

export interface WeightEntry {
  date: string;
  label: string;
  weight: number;
}

export interface Exercise {
  id: number;
  name: string;
  sets: number;
  target: string;
  muscle: string;
  completed: boolean;
}

export interface Habit {
  id: number;
  title: string;
  detail: string;
}

export interface Meal {
  id: string;
  name: string;
  time: string;
  status: "Registrada" | "Pendiente";
  summary?: string;
}

export interface Article {
  id: number;
  title: string;
  category: "Entrenamiento" | "Alimentación" | "Descanso";
  readTime: string;
  featured?: boolean;
}

export interface WeekDay {
  short: string;
  number: number;
  status: "done" | "today" | "rest" | "planned";
}
