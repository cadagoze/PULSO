import { bodyAreaLabels } from "@/data/catalog";
import { equipmentLabel, fullGym } from "@/data/equipment";
import type { AssessmentProfile } from "@/components/onboarding/wellness-assessment";
import { toDisplayWeight } from "@/lib/utils";
import type { BodyArea, Settings, TrainingPreference, WeightEntry } from "@/types";

const lowerFirst = (text: string) => text.charAt(0).toLocaleLowerCase("es-CL") + text.slice(1);

/** Iniciales para el avatar sin foto («Ana María» → «AM»). Vacío si no hay nombre. */
export function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("es-CL"))
    .join("");
}

/** Mes y año de la evaluación («ago 2026»), o null si no hay fecha válida. */
export function memberSince(profile: AssessmentProfile | null) {
  if (!profile?.createdAt) return null;
  const date = new Date(profile.createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("es-CL", { month: "short", year: "numeric" }).replace(".", "");
}

/** El foco del plan para la portada: «Fuerza» en grande y «que puedas sostener» debajo. */
export function splitFocus(focus: string) {
  const [head = "", ...rest] = focus.trim().split(/\s+/);
  return { head, rest: rest.join(" ") };
}

/** «Sentirme más fuerte + Mejorar mi peso» → «Sentirme más fuerte y mejorar mi peso». */
export function goalsSentence(goalLabel: string) {
  const parts = goalLabel
    .split(" + ")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, index) => (index === 0 ? part : lowerFirst(part)));
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} y ${parts.at(-1)}`;
}

/** Dónde y con qué entrenas: «Casa» + «Mancuernas + bandas», «Gimnasio» + «Gimnasio completo». */
export function placeSummary(preference: TrainingPreference) {
  if (preference.location === "gym") {
    const gym = preference.gymEquipment;
    return { place: "Gimnasio", gear: !gym || fullGym.every((id) => gym.includes(id)) ? "Máquinas, poleas y pesos libres" : `${gym.length} de ${fullGym.length} equipos` };
  }
  const labels = preference.equipment.map(equipmentLabel);
  if (!labels.length) return { place: "Casa", gear: "Peso corporal" };
  const shown = labels.slice(0, 3).map((label, index) => (index === 0 ? label : lowerFirst(label)));
  const extra = labels.length - shown.length;
  return { place: "Casa", gear: `${shown.join(" + ")}${extra > 0 ? ` + ${extra} más` : ""}` };
}

/** Zonas a cuidar de la evaluación (sin «ninguna»), con la respuesta libre al final. */
export function careAreas(profile: AssessmentProfile) {
  const areas: string[] = profile.limitations
    .filter((item): item is BodyArea => item !== "none")
    .map((item) => bodyAreaLabels[item]);
  const custom = profile.customAnswers?.limitations?.trim();
  if (custom) areas.push(custom);
  return areas;
}

/** Registro de peso más reciente (por fecha), sin depender del orden guardado. */
export function latestWeight(entries: WeightEntry[]) {
  return entries.reduce<WeightEntry | null>((latest, entry) => (!latest || entry.date > latest.date ? entry : latest), null);
}

/** Peso en la unidad del usuario, con un decimal como máximo («81,5»). */
export function weightNumber(kg: number, unit: Settings["unit"]) {
  return toDisplayWeight(kg, unit).toLocaleString("es-CL", { maximumFractionDigits: 1 });
}
