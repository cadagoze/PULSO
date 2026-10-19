import { readinessScore } from "@/lib/analytics";
import type { BodyArea, ReadinessEntry } from "@/types";

/**
 * Chequeo rápido de cómo llegas hoy: un toque (Bien, Cansado, Muy cansado) y, si hace falta, dónde
 * molesta. Se guarda con la misma forma que el chequeo anterior (energía, sueño, molestias, puntaje y
 * recomendación), así el historial y el generador siguen funcionando igual.
 */

export type Feel = NonNullable<ReadinessEntry["feel"]>;
export type PainArea = NonNullable<ReadinessEntry["pain"]>[number];
export type Recommendation = ReadinessEntry["recommendation"];

/** «Cansado», «Cansada» o «Cansado/a» según cómo se identifica la persona (si lo dijo). */
export function feelOptions(audience: "female" | "male" | "mixed"): Array<{ value: Feel; label: string }> {
  const ending = audience === "female" ? "a" : audience === "male" ? "o" : "o/a";
  return [
    { value: "good", label: "Bien" },
    { value: "tired", label: `Cansad${ending}` },
    { value: "exhausted", label: `Muy cansad${ending}` },
  ];
}

export const painOptions: Array<{ value: PainArea; label: string }> = [
  { value: "knees", label: "Rodillas" },
  { value: "back", label: "Espalda" },
  { value: "shoulders", label: "Hombros" },
  { value: "other", label: "Otra zona" },
];

/** Qué cambia en la sesión de hoy según el chequeo (un solo texto para Inicio, Entrenar y Bienestar). */
export const readinessAdvice: Record<Recommendation, string> = {
  planned: "Sesión completa.",
  short: "Versión corta: un ejercicio y una serie menos.",
  recovery: "Movilidad suave o una caminata. Recuperarse también es entrenar.",
};

export const painSafety = "Si es dolor agudo o no mejora, no entrenes esa zona y consulta a un profesional.";

/** El chequeo de un día con la forma de siempre. El sueño sale de Bienestar si lo anotaste; si no, queda «normal». */
export function quickReadiness({ date, feel, pain = [], sleepHours, loadRatio, now = new Date() }: {
  date: string;
  feel: Feel;
  pain?: PainArea[];
  sleepHours?: number | null;
  loadRatio: number | null;
  now?: Date;
}): ReadinessEntry {
  const energy: ReadinessEntry["energy"] = feel === "good" ? 3 : feel === "tired" ? 2 : 1;
  const sleep: ReadinessEntry["sleep"] = sleepHours === null || sleepHours === undefined ? 2 : sleepHours < 6 ? 1 : sleepHours < 7 ? 2 : 3;
  const soreness: ReadinessEntry["soreness"] = pain.length ? 2 : 0;
  const recommendation: Recommendation = feel === "exhausted" ? "recovery" : feel === "tired" || pain.length ? "short" : "planned";
  const raw = readinessScore({ energy, sleep, soreness }, loadRatio).score;
  // El puntaje (sólo para el historial) queda dentro de la franja de la recomendación.
  const score = recommendation === "planned" ? Math.max(70, raw) : recommendation === "short" ? Math.min(69, Math.max(40, raw)) : Math.min(39, raw);
  return { date, energy, sleep, soreness, score, recommendation, feel, ...(pain.length ? { pain } : {}), updatedAt: now.toISOString() };
}

/** Cómo llegaste, también en chequeos anteriores al rápido (se deduce de la recomendación). */
export function readinessFeel(entry: ReadinessEntry): Feel {
  if (entry.feel) return entry.feel;
  return entry.recommendation === "planned" ? "good" : entry.recommendation === "short" ? "tired" : "exhausted";
}

/** Zonas que el generador debe cuidar hoy (sin «otra zona», que no se puede asociar a ejercicios). */
export function painLimitations(pain: readonly PainArea[] | undefined): BodyArea[] {
  return (pain ?? []).filter((area): area is BodyArea => area !== "other");
}

const areaNames: Record<BodyArea, string> = { knees: "las rodillas", back: "la espalda", shoulders: "los hombros" };

/** «Hoy evitamos ejercicios que exijan las rodillas y la espalda.» */
export function painNote(pain: readonly PainArea[] | undefined) {
  const areas = painLimitations(pain).map((area) => areaNames[area]);
  if (!areas.length) return pain?.length ? "Evita lo que moleste en esa zona." : null;
  const list = areas.length === 1 ? areas[0] : `${areas.slice(0, -1).join(", ")} y ${areas.at(-1)}`;
  return `Hoy evitamos ejercicios que exijan ${list}.`;
}
