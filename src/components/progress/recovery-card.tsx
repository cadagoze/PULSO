"use client";

import type { MuscleGroup } from "@/types";

// Recuperación muscular (antes en Inicio): ahora vive en Progreso, junto al volumen por músculo.

const groups: Array<{ label: string; muscles: MuscleGroup[]; ready: string; recovering: string }> = [
  { label: "Piernas", muscles: ["quads", "hamstrings", "glutes", "calves"], ready: "listas", recovering: "recuperándose" },
  { label: "Pecho", muscles: ["chest"], ready: "listo", recovering: "recuperándose" },
  { label: "Espalda", muscles: ["back", "lats"], ready: "lista", recovering: "recuperándose" },
  { label: "Hombros", muscles: ["shoulders"], ready: "listos", recovering: "recuperándose" },
  { label: "Brazos", muscles: ["biceps", "triceps"], ready: "listos", recovering: "recuperándose" },
  { label: "Core", muscles: ["abs", "obliques"], ready: "listo", recovering: "recuperándose" },
];

export interface RecoveryLine {
  label: string;
  state: string;
  ready: boolean;
}

/** Grupos más frescos y más cargados, en frases cortas: «Piernas listas», «Espalda recuperándose». */
export function recoveryLines(recovery: Record<MuscleGroup, number>): RecoveryLine[] {
  const scored = groups.map((group) => ({
    ...group,
    value: group.muscles.reduce((sum, muscle) => sum + recovery[muscle], 0) / group.muscles.length,
  }));
  const tired = scored.filter((group) => group.value < 85).sort((a, b) => a.value - b.value);
  const ready = scored.filter((group) => group.value >= 85);
  return [
    ...tired.slice(0, 2).map((group) => ({ label: group.label, state: group.recovering, ready: false })),
    ...ready.slice(0, tired.length ? 2 : 3).map((group) => ({ label: group.label, state: group.ready, ready: true })),
  ];
}

export function recoverySummary(recovery: Record<MuscleGroup, number>, hasWorkouts: boolean) {
  if (!hasWorkouts) return "Aún no hay registros: todos tus músculos están frescos para empezar.";
  const tired = recoveryLines(recovery).some((line) => !line.ready);
  return tired ? "Estimado según tus sesiones de las últimas 72 horas." : "Todo recuperado: buen día para entrenar lo que quieras.";
}
