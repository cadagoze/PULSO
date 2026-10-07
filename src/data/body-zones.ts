import { normalizeText } from "@/lib/utils";
import type { MuscleGroup } from "@/types";

/** Zonas del cuerpo para pedir una rutina enfocada (el id es el que va en la dirección: ?zona=gluteos). */
export type BodyZone = "pecho" | "espalda" | "hombros" | "brazos" | "abdomen" | "gluteos" | "piernas";

export interface BodyZoneInfo {
  id: BodyZone;
  label: string;
  /** Músculos que cuentan como principales para esta zona. */
  muscles: MuscleGroup[];
  /** Músculos de apoyo: cuentan, pero pesan menos al elegir. */
  support?: MuscleGroup[];
  /** Enfoque más cercano (fotos y descansos). */
  base: "upper" | "lower" | "full";
  hint: string;
}

export const bodyZones: BodyZoneInfo[] = [
  { id: "pecho", label: "Pecho", muscles: ["chest"], base: "upper", hint: "Empujes y aperturas" },
  { id: "espalda", label: "Espalda", muscles: ["back", "lats"], support: ["traps", "lowerBack"], base: "upper", hint: "Remos y jalones" },
  { id: "hombros", label: "Hombros", muscles: ["shoulders"], base: "upper", hint: "Presses y elevaciones" },
  { id: "brazos", label: "Brazos", muscles: ["biceps", "triceps"], support: ["forearms"], base: "upper", hint: "Bíceps y tríceps" },
  { id: "abdomen", label: "Abdomen", muscles: ["abs", "obliques"], base: "full", hint: "Centro y oblicuos" },
  { id: "gluteos", label: "Glúteos", muscles: ["glutes"], base: "lower", hint: "Puentes, bisagras y zancadas" },
  { id: "piernas", label: "Piernas", muscles: ["quads", "hamstrings", "adductors", "calves"], base: "lower", hint: "Sentadillas y zancadas" },
];

export const zoneById = (id: string | null | undefined) => bodyZones.find((zone) => zone.id === id);

/** Zona que mejor calza con los músculos elegidos (p. ej. en el filtro de la biblioteca). */
export function zoneForMuscles(muscles: readonly MuscleGroup[]) {
  if (!muscles.length) return undefined;
  const scored = bodyZones.map((zone) => ({ zone, hits: muscles.filter((muscle) => zone.muscles.includes(muscle) || zone.support?.includes(muscle)).length }));
  const best = scored.sort((a, b) => b.hits - a.hits)[0];
  return best && best.hits > 0 ? best.zone : undefined;
}

/** Palabras con que se busca cada zona («gluteo», «abs», «biceps»…). */
const zoneWords: Record<BodyZone, string[]> = {
  pecho: ["pecho", "pectoral"],
  espalda: ["espalda", "dorsal", "dorsales", "lumbar"],
  hombros: ["hombro", "hombros", "deltoides"],
  brazos: ["brazo", "brazos", "biceps", "triceps", "antebrazo"],
  abdomen: ["abdomen", "abdominal", "abdominales", "abs", "core", "oblicuos", "centro"],
  gluteos: ["gluteo", "gluteos", "cola", "pompis"],
  piernas: ["pierna", "piernas", "cuadriceps", "isquios", "femoral", "pantorrilla", "pantorrillas", "gemelos"],
};

/** Zona que se está buscando por texto, si la búsqueda es una de sus palabras. */
export function zoneForQuery(query: string) {
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  if (!words.length || words.length > 3) return undefined;
  return bodyZones.find((zone) => words.some((word) => zoneWords[zone.id].includes(word)));
}
