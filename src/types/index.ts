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
  benefit: string;
  cue: string;
  phases: [string, string, string];
  image: string;
  imageAlt: string;
  setup: string;
  breathing: string;
  adaptation: string;
  avoid: string;
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
  date: string;
  short: string;
  number: number;
  status: "done" | "today" | "rest" | "planned";
}

export interface WorkoutEntry {
  name?: string;
  records?: ExerciseRecord[];
  notes?: string;
  id: string;
  date: string;
  completedAt: string;
  durationMinutes: number;
  exerciseCount: number;
  sets: number;
  mode: "short" | "full";
  effort?: 1 | 2 | 3 | 4 | 5;
  feltPain?: boolean;
  feedbackAt?: string;
}

export interface SetRecord { value: number; load: number; done: boolean }
export interface ExerciseRecord { exerciseId: number; unit: "reps" | "seconds"; sets: SetRecord[] }
export interface TrainingRoutine { name: string; days: number[]; restSeconds: number; records: ExerciseRecord[] }
export interface TrainingDraft { id: string; name: string; records: ExerciseRecord[]; elapsedSeconds: number; runningSince: number | null; restUntil: number | null; notes: string; restSeconds: number }

export interface ReadinessEntry {
  date: string;
  energy: 1 | 2 | 3;
  sleep: 1 | 2 | 3;
  soreness: 0 | 1 | 2;
  score: number;
  recommendation: "recovery" | "short" | "planned";
  updatedAt: string;
}
