import type {
  BodyArea,
  Equipment,
  ExerciseCategory,
  ExerciseLevel,
  MovementPattern,
  MuscleGroup,
  Program,
} from "@/types";

export const muscleLabels: Record<MuscleGroup, string> = {
  chest: "Pecho",
  back: "Espalda media",
  lats: "Dorsales",
  traps: "Trapecios",
  shoulders: "Hombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  forearms: "Antebrazos",
  abs: "Abdomen",
  obliques: "Oblicuos",
  lowerBack: "Espalda baja",
  glutes: "Glúteos",
  quads: "Cuádriceps",
  hamstrings: "Isquiotibiales",
  adductors: "Aductores",
  calves: "Pantorrillas",
};

export const patternLabels: Record<MovementPattern, string> = {
  squat: "Sentadilla",
  hinge: "Bisagra de cadera",
  lunge: "Zancada",
  "horizontal-push": "Empuje horizontal",
  "vertical-push": "Empuje vertical",
  "horizontal-pull": "Tracción horizontal",
  "vertical-pull": "Tracción vertical",
  core: "Centro",
  carry: "Acarreo",
  isolation: "Aislamiento",
  cardio: "Cardio",
  mobility: "Movilidad",
};

export const equipmentLabels: Record<Equipment, string> = {
  dumbbells: "Mancuernas",
  barbell: "Barra y discos",
  kettlebell: "Kettlebell",
  bands: "Bandas",
  bench: "Banco",
  "pullup-bar": "Barra de dominadas",
  machine: "Máquina",
  cable: "Polea",
};

export const categoryLabels: Record<ExerciseCategory, string> = {
  strength: "Fuerza",
  cardio: "Cardio",
  mobility: "Movilidad",
};

export const bodyAreaLabels: Record<BodyArea, string> = {
  knees: "Rodillas",
  back: "Espalda",
  shoulders: "Hombros",
};

export const levelLabels: Record<ExerciseLevel, string> = {
  1: "Principiante",
  2: "Intermedio",
  3: "Avanzado",
};

export const goalLabels: Record<Program["goal"], string> = {
  strength: "Fuerza",
  muscle: "Músculo",
  conditioning: "Acondicionamiento",
  mobility: "Movilidad",
  foundation: "Base",
};

export const muscleRegions: Array<{ id: "upper" | "core" | "lower"; label: string; muscles: MuscleGroup[] }> = [
  {
    id: "upper",
    label: "Tren superior",
    muscles: ["chest", "back", "lats", "traps", "shoulders", "biceps", "triceps", "forearms"],
  },
  { id: "core", label: "Centro", muscles: ["abs", "obliques", "lowerBack"] },
  { id: "lower", label: "Tren inferior", muscles: ["glutes", "quads", "hamstrings", "adductors", "calves"] },
];
