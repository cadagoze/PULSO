import { formatVolume } from "@/lib/analytics";
import { exerciseById } from "@/lib/training";
import { toDisplayWeight } from "@/lib/utils";
import type { PersonalRecordKind, Settings, SetKind } from "@/types";

export type Unit = Settings["unit"];

const LB_PER_KG = 2.20462;

/** Tonelaje en la unidad del usuario (se almacena en kg). */
export function volumeLabel(kg: number, unit: Unit) {
  if (unit === "kg") return formatVolume(kg);
  const lb = kg * LB_PER_KG;
  return lb >= 10_000
    ? `${(lb / 1000).toLocaleString("es-CL", { maximumFractionDigits: 1 })} mil lb`
    : `${Math.round(lb).toLocaleString("es-CL")} lb`;
}

export function weightLabel(kg: number, unit: Unit) {
  return `${toDisplayWeight(kg, unit).toLocaleString("es-CL", { maximumFractionDigits: 1 })} ${unit}`;
}

export function exerciseName(id: number) {
  return exerciseById(id)?.name ?? "Ejercicio";
}

export const kindLetters: Partial<Record<SetKind, string>> = {
  warmup: "C",
  failure: "F",
  drop: "D",
};

export const kindNames: Record<SetKind, string> = {
  warmup: "Calentamiento",
  normal: "Serie de trabajo",
  failure: "Al fallo",
  drop: "Serie descendente",
};

export function monthLabel(monthKey: string) {
  const label = new Date(`${monthKey}-01T12:00:00`).toLocaleDateString("es-CL", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function dayLabel(date: string) {
  const label = new Date(`${date}T12:00:00`).toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" });
  const clean = label.replaceAll(".", "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function longDayLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function signed(value: number, format: (abs: number) => string) {
  if (Math.abs(value) < 0.05) return "=";
  return `${value > 0 ? "▲" : "▼"} ${format(Math.abs(value))}`;
}

export function recordValueLabel(kind: PersonalRecordKind, value: number, unit: Unit) {
  if (kind === "e1rm" || kind === "load") return weightLabel(value, unit);
  if (kind === "volume") return volumeLabel(value, unit);
  if (kind === "reps") return `${value.toLocaleString("es-CL")} reps`;
  return `${value.toLocaleString("es-CL")} s`;
}
