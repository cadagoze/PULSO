import { normalizeText } from "@/lib/utils";
import { equipmentLabels, muscleLabels } from "@/data/catalog";
import type { Equipment, Exercise, ExerciseCategory, MuscleGroup } from "@/types";

export type CategoryFilter = "all" | ExerciseCategory;
export type EquipmentFilter = "bodyweight" | Equipment;

export interface LibraryFilters {
  query: string;
  muscles: MuscleGroup[];
  category: CategoryFilter;
  equipment: EquipmentFilter | null;
  available: boolean;
  favorites: boolean;
}

export const categoryOptions: Array<{ value: CategoryFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "strength", label: "Fuerza" },
  { value: "cardio", label: "Cardio" },
  { value: "mobility", label: "Movilidad" },
];

export const equipmentOptions: Array<{ value: EquipmentFilter; label: string }> = [
  { value: "bodyweight", label: "Peso corporal" },
  ...(Object.keys(equipmentLabels) as Equipment[]).map((value) => ({ value, label: equipmentLabels[value] })),
];

/** Texto sin tildes ni mayúsculas, para buscar "biceps" y encontrar "Bíceps". */
export const normalize = normalizeText;

function isMuscle(value: string): value is MuscleGroup {
  return value in muscleLabels;
}

function isEquipment(value: string): value is EquipmentFilter {
  return value === "bodyweight" || value in equipmentLabels;
}

export function parseFilters(params: URLSearchParams): LibraryFilters {
  const category = params.get("c");
  const equipment = params.get("e");
  return {
    query: params.get("q") ?? "",
    muscles: (params.get("m") ?? "").split(",").filter(isMuscle),
    category: category === "strength" || category === "cardio" || category === "mobility" ? category : "all",
    equipment: equipment && isEquipment(equipment) ? equipment : null,
    available: params.get("a") === "1",
    favorites: params.get("f") === "1",
  };
}

export function serializeFilters(filters: LibraryFilters) {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query);
  if (filters.muscles.length) params.set("m", filters.muscles.join(","));
  if (filters.category !== "all") params.set("c", filters.category);
  if (filters.equipment) params.set("e", filters.equipment);
  if (filters.available) params.set("a", "1");
  if (filters.favorites) params.set("f", "1");
  return params.toString();
}

export function hasActiveFilters(filters: LibraryFilters) {
  return serializeFilters(filters) !== "";
}

export function matchesEquipment(exercise: Exercise, item: EquipmentFilter) {
  if (item === "bodyweight") return exercise.equipment.length === 0;
  return exercise.equipment.some((option) => option.includes(item));
}

export function searchText(exercise: Exercise) {
  return normalize([exercise.name, exercise.muscle, ...exercise.primary.map((muscle) => muscleLabels[muscle])].join(" "));
}
