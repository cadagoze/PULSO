import { normalizeText } from "@/lib/utils";
import { equipmentLabels, levelLabels, muscleLabels, muscleRegions } from "@/data/catalog";
import type { Equipment, Exercise, ExerciseCategory, ExerciseLevel, MuscleGroup } from "@/types";

export type CategoryFilter = "all" | ExerciseCategory;
export type EquipmentFilter = "bodyweight" | Equipment;

export interface LibraryFilters {
  query: string;
  muscles: MuscleGroup[];
  category: CategoryFilter;
  equipment: EquipmentFilter | null;
  level: ExerciseLevel | null;
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

export const levelOptions: Array<{ value: ExerciseLevel; label: string }> = ([1, 2, 3] as const).map((value) => ({ value, label: levelLabels[value] }));

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
  const level = Number(params.get("l"));
  return {
    query: params.get("q") ?? "",
    muscles: (params.get("m") ?? "").split(",").filter(isMuscle),
    category: category === "strength" || category === "cardio" || category === "mobility" ? category : "all",
    equipment: equipment && isEquipment(equipment) ? equipment : null,
    level: level === 1 || level === 2 || level === 3 ? level : null,
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
  if (filters.level) params.set("l", String(filters.level));
  if (filters.available) params.set("a", "1");
  if (filters.favorites) params.set("f", "1");
  return params.toString();
}

export function hasActiveFilters(filters: LibraryFilters) {
  return serializeFilters(filters) !== "";
}

/** Filtros que sólo viven en la hoja (músculo, equipo y nivel): el número del botón «Filtros». */
export function sheetFilterCount(filters: LibraryFilters) {
  return filters.muscles.length + (filters.equipment ? 1 : 0) + (filters.level ? 1 : 0);
}

export function matchesEquipment(exercise: Exercise, item: EquipmentFilter) {
  if (item === "bodyweight") return exercise.equipment.length === 0;
  return exercise.equipment.some((option) => option.includes(item));
}

export function searchText(exercise: Exercise) {
  return normalize([exercise.name, exercise.muscle, ...exercise.primary.map((muscle) => muscleLabels[muscle])].join(" "));
}

// ─── Grupos de la vista general ───────────────────────────────────────────

export type LibraryGroup = "upper" | "core" | "lower" | Exclude<ExerciseCategory, "strength">;

export const groupLabels: Record<LibraryGroup, string> = {
  upper: "Tren superior",
  core: "Centro",
  lower: "Tren inferior",
  cardio: "Cardio",
  mobility: "Movilidad",
};

const groupOrder: LibraryGroup[] = ["upper", "core", "lower", "cardio", "mobility"];

/** Zona del cuerpo de un ejercicio de fuerza según su primer músculo principal; cardio y movilidad van aparte. */
export function groupOf(exercise: Exercise): LibraryGroup {
  if (exercise.category !== "strength") return exercise.category;
  return muscleRegions.find((region) => region.muscles.includes(exercise.primary[0]))?.id ?? "core";
}

/** Agrupa conservando el orden de la biblioteca (de peso corporal a máquinas). */
export function groupExercises(items: Exercise[]) {
  const groups = new Map<LibraryGroup, Exercise[]>();
  for (const exercise of items) {
    const id = groupOf(exercise);
    groups.set(id, [...(groups.get(id) ?? []), exercise]);
  }
  return groupOrder.filter((id) => groups.has(id)).map((id) => ({ id, label: groupLabels[id], items: groups.get(id) ?? [] }));
}
