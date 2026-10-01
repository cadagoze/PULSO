// ─── Ejercicios ──────────────────────────────────────────────────────────────

export type MuscleGroup =
  | "chest" | "back" | "lats" | "traps" | "shoulders" | "biceps" | "triceps" | "forearms"
  | "abs" | "obliques" | "lowerBack" | "glutes" | "quads" | "hamstrings" | "adductors" | "calves";

export type MovementPattern =
  | "squat" | "hinge" | "lunge" | "horizontal-push" | "vertical-push" | "horizontal-pull" | "vertical-pull"
  | "core" | "carry" | "isolation" | "cardio" | "mobility";

export type ExerciseCategory = "strength" | "cardio" | "mobility";
export type HomeEquipment = "dumbbells" | "barbell" | "kettlebell" | "bands" | "bench" | "pullup-bar";
export type Equipment = HomeEquipment | "machine" | "cable";
/** Alias conservado por compatibilidad con registros anteriores. */
export type TrainingEquipment = HomeEquipment;
export type TrainingLocation = "home" | "gym";
export type BodyArea = "knees" | "back" | "shoulders";
export type ExerciseLevel = 1 | 2 | 3;

export interface Exercise {
  id: number;
  name: string;
  category: ExerciseCategory;
  pattern: MovementPattern;
  /** Músculos principales y secundarios: alimentan el mapa muscular, el volumen y la recuperación. */
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  /** Etiqueta visible, p. ej. "Pecho y tríceps". */
  muscle: string;
  /** Alternativas de equipamiento: cada grupo interno se necesita completo. Vacío = peso corporal. */
  equipment: Equipment[][];
  level: ExerciseLevel;
  unit: "reps" | "seconds";
  sets: number;
  /** Rango objetivo en repeticiones o segundos según `unit`. */
  range: [number, number];
  /** Incremento de carga sugerido en kg. 0 = ejercicio sin carga externa. */
  increment: number;
  barbell?: boolean;
  unilateral?: boolean;
  /** Zonas que el ejercicio exige: se evita si la evaluación indica cuidarlas. */
  stresses?: BodyArea[];
  easier?: number;
  harder?: number;
  benefit: string;
  cue: string;
  phases: [string, string, string];
  setup: string;
  breathing: string;
  adaptation: string;
  avoid: string;
  image?: string;
  imageAlt?: string;
}

export interface TrainingPreference { location: TrainingLocation; equipment: TrainingEquipment[] }

// ─── Registro de entrenamiento ───────────────────────────────────────────────

export type SetKind = "warmup" | "normal" | "failure" | "drop";

export interface SetRecord {
  value: number;
  /** Carga externa siempre en kg (se convierte para mostrar si el usuario usa lb). */
  load: number;
  done: boolean;
  kind?: SetKind;
  /** Repeticiones en reserva al terminar la serie (0 = al fallo). */
  rir?: number;
}

export interface ExerciseRecord {
  exerciseId: number;
  unit: "reps" | "seconds";
  sets: SetRecord[];
  restSeconds?: number;
  note?: string;
  /** Ejercicios con el mismo grupo se alternan como superserie. */
  group?: string;
}

export interface TrainingRoutine {
  id?: string;
  name: string;
  days: number[];
  restSeconds: number;
  records: ExerciseRecord[];
  updatedAt?: string;
}

export type WorkoutSource =
  | { type: "generated" }
  | { type: "routine"; routineId: string }
  | { type: "program"; programId: string; week: number; day: number }
  | { type: "free" };

export interface TrainingDraft {
  id: string;
  name: string;
  records: ExerciseRecord[];
  elapsedSeconds: number;
  runningSince: number | null;
  restUntil: number | null;
  /** Duración del descanso en curso, para dibujar el progreso del temporizador. */
  restTotal?: number;
  notes: string;
  restSeconds: number;
  location?: TrainingLocation;
  equipment?: TrainingEquipment[];
  source?: WorkoutSource;
  startedAt?: string;
}

export type PersonalRecordKind = "e1rm" | "load" | "reps" | "volume" | "seconds";

export interface PersonalRecordHit {
  exerciseId: number;
  kind: PersonalRecordKind;
  value: number;
  previous: number;
}

export interface WorkoutEntry {
  id: string;
  name?: string;
  date: string;
  completedAt: string;
  durationMinutes: number;
  exerciseCount: number;
  sets: number;
  mode: "short" | "full";
  records?: ExerciseRecord[];
  notes?: string;
  effort?: 1 | 2 | 3 | 4 | 5;
  feltPain?: boolean;
  feedbackAt?: string;
  location?: TrainingLocation;
  equipment?: TrainingEquipment[];
  source?: WorkoutSource;
  /** Tonelaje en kg (series realizadas × repeticiones × carga). */
  volume?: number;
  prs?: PersonalRecordHit[];
  /** Carga de entrenamiento: esfuerzo (1–10) × minutos. */
  load?: number;
  kind?: "strength" | "interval";
}

// ─── Programas ───────────────────────────────────────────────────────────────

export interface ProgramItem {
  exerciseId: number;
  sets: number;
  range: [number, number];
  restSeconds: number;
}

export interface ProgramDay {
  name: string;
  focus: string;
  items: ProgramItem[];
}

export interface Program {
  id: string;
  name: string;
  summary: string;
  goal: "strength" | "muscle" | "conditioning" | "mobility" | "foundation";
  level: ExerciseLevel;
  weeks: number;
  minutes: number;
  location: TrainingLocation | "any";
  equipmentNote: string;
  days: ProgramDay[];
  /** Series extra (o menos) por ejercicio en cada semana; la última suele ser descarga. */
  weekSetDelta: number[];
  weekNotes: string[];
}

export interface ProgramProgress {
  programId: string;
  startedAt: string;
  /** Claves "semana-día" completadas, p. ej. "1-2". */
  completed: string[];
}

// ─── Bienestar y cuerpo ──────────────────────────────────────────────────────

export interface ReadinessEntry {
  date: string;
  energy: 1 | 2 | 3;
  sleep: 1 | 2 | 3;
  soreness: 0 | 1 | 2;
  stress?: 1 | 2 | 3;
  score: number;
  recommendation: "recovery" | "short" | "planned";
  updatedAt: string;
}

export interface WeightEntry {
  date: string;
  label: string;
  weight: number;
}

export interface MeasurementEntry {
  date: string;
  waist?: number;
  chest?: number;
  hips?: number;
  arm?: number;
  thigh?: number;
}

export interface Settings {
  name: string;
  unit: "kg" | "lb";
  theme: "system" | "light" | "dark";
  weeklyGoal: number;
  /** Semanas (lunes, AAAA-MM-DD) en que la racha está en pausa. */
  pausedWeeks: string[];
  defaultRest: number;
  sound: boolean;
  vibration: boolean;
  keepAwake: boolean;
  autoRest: boolean;
  barWeight: number;
  plates: number[];
}

export interface IntervalPreset {
  id: string;
  name: string;
  detail: string;
  work: number;
  rest: number;
  rounds: number;
}

// ─── Contenido y hábitos ─────────────────────────────────────────────────────

export interface User {
  name: string;
  initials: string;
  currentWeight: number;
  goalWeight: number;
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
