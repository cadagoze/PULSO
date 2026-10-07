import type { Settings } from "@/types";

/**
 * Personalización visual: qué fotos mostrar y qué color de acento usar. Por defecto se decide según
 * cómo te identificas (evaluación o, si no, el cálculo de calorías) y siempre se puede cambiar en Ajustes.
 */

export type Identity = "female" | "male" | "unspecified";
export type Audience = "female" | "male" | "mixed";
export type AccentName = "fire" | "magenta" | "violet" | "lime" | "electric";
export type PhotoPreference = "auto" | "female" | "male" | "mixed";

export const accentOptions: Array<{ value: AccentName; label: string; swatch: string }> = [
  { value: "fire", label: "Fuego", swatch: "#ff351f" },
  { value: "magenta", label: "Magenta", swatch: "#ff2e88" },
  { value: "violet", label: "Violeta", swatch: "#9b6bff" },
  { value: "lime", label: "Lima", swatch: "#c9ff68" },
  { value: "electric", label: "Eléctrico", swatch: "#2fb8ff" },
];

export const photoOptions: Array<{ value: PhotoPreference; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "female", label: "Mujeres" },
  { value: "male", label: "Hombres" },
  { value: "mixed", label: "Mixtas" },
];

/** Cómo te identificas: lo de la evaluación manda; si no está, el sexo del cálculo de calorías. */
export function identityFrom(assessmentSex?: Identity, nutritionSex?: "female" | "male"): Identity {
  return assessmentSex ?? nutritionSex ?? "unspecified";
}

export function audienceFor(preference: PhotoPreference | undefined, identity: Identity): Audience {
  if (preference && preference !== "auto") return preference;
  return identity === "unspecified" ? "mixed" : identity;
}

/** Color automático: magenta para mujeres, fuego para el resto; lo elegido en Ajustes manda. */
export function accentFor(choice: AccentName | undefined, identity: Identity): AccentName {
  return choice ?? (identity === "female" ? "magenta" : "fire");
}

/** Elige una foto de la lista que corresponde; las mixtas intercalan ambas y cambian cada día. */
export function pickPhoto<T>(sets: { female: T[]; male: T[] }, audience: Audience, seed: number): T {
  const list = audience === "mixed" ? sets.male.flatMap((item, index) => [item, sets.female[index % sets.female.length]]) : sets[audience];
  return list[Math.abs(seed) % list.length];
}

export type PersonalSettings = Pick<Settings, "accent" | "photos">;
