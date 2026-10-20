import { muscleRecovery } from "@/lib/analytics";
import type { MuscleGroup, WorkoutEntry } from "@/types";

const DAY = 86_400_000;

// Recuperación muscular en frases cortas (Bienestar): qué grupos están listos y cuáles se recuperan.

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

export interface RecoveryOutlook {
  label: string;
  ready: boolean;
  /** Cuándo estará lista si aún se recupera: «mañana», «en 2 días». */
  eta: string | null;
}

/**
 * Para Inicio, en una línea: hasta tres grupos, primero los que se recuperan (con cuándo estarán listos)
 * y luego piernas, pecho y espalda si están listos. Sin entrenamientos recientes, todo listo.
 */
export function recoveryOutlook(workouts: WorkoutEntry[], now: number): RecoveryOutlook[] {
  const at = (offset: number) => muscleRecovery(workouts, now + offset * DAY);
  const days = [at(0), at(1), at(2)];
  const value = (recovery: Record<MuscleGroup, number>, muscles: MuscleGroup[]) => muscles.reduce((sum, muscle) => sum + recovery[muscle], 0) / muscles.length;
  const items = groups.map((group) => {
    const ready = value(days[0], group.muscles) >= 85;
    const eta = ready ? null : value(days[1], group.muscles) >= 85 ? "mañana" : value(days[2], group.muscles) >= 85 ? "en 2 días" : "en 3 días";
    return { label: group.label, ready, eta };
  });
  const recovering = items.filter((item) => !item.ready);
  const main = items.filter((item) => item.ready && ["Piernas", "Pecho", "Espalda"].includes(item.label));
  return [...recovering, ...main].slice(0, 3);
}
