import { isMobilityOnly } from "@/lib/energy";
import type { FoodEntry, WaterEntry, WorkoutEntry } from "@/types";

/**
 * Retos de 30 días: una meta concreta que se cuenta sola con lo que ya registras (entrenos, agua,
 * comidas, proteína). Al llegar a la meta queda la medalla; si se acaban los días, se puede reintentar.
 */

export type ChallengeKind = "entrenos-12" | "agua-21" | "comidas-25" | "proteina-20" | "movilidad-10";

export interface ChallengeDef {
  kind: ChallengeKind;
  title: string;
  /** Qué se cuenta, en plural («entrenos», «días»…). */
  unit: string;
  target: number;
  detail: string;
  /** Sólo para quien cuenta calorías (se necesitan los registros de comidas). */
  counting?: boolean;
}

export const CHALLENGE_DAYS = 30;

export const challengeCatalog: ChallengeDef[] = [
  { kind: "entrenos-12", title: "12 entrenos en 30 días", unit: "entrenos", target: 12, detail: "Unos tres por semana. Cualquier sesión cuenta." },
  { kind: "agua-21", title: "21 días con tu meta de agua", unit: "días", target: 21, detail: "Tres de cada cuatro días con todos tus vasos." },
  { kind: "comidas-25", title: "Registra tus comidas 25 días", unit: "días", target: 25, detail: "Anota al menos una comida 25 de los 30 días.", counting: true },
  { kind: "proteina-20", title: "20 días con tu proteína", unit: "días", target: 20, detail: "Llega a tu meta de proteína 20 de los 30 días.", counting: true },
  { kind: "movilidad-10", title: "10 sesiones de movilidad", unit: "sesiones", target: 10, detail: "Diez minutos para soltar el cuerpo, diez veces." },
];

export const challengeDef = (kind: ChallengeKind) => challengeCatalog.find((item) => item.kind === kind);

/** Un reto empezado (o terminado). `start` es el día 1 (AAAA-MM-DD). */
export interface ChallengeEntry {
  id: string;
  kind: ChallengeKind;
  start: string;
  /** Lo abandonaste ese día. */
  endedAt?: string;
}

export interface ChallengeData {
  workouts: WorkoutEntry[];
  foodLog: FoodEntry[];
  water: WaterEntry[];
  waterGoal: number;
  proteinTarget: number | null;
}

const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
};
const daysBetween = (from: string, to: string) => Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86_400_000);

/** Días (AAAA-MM-DD) que suman al reto: uno por cada vez que se cumple lo pedido (los entrenos pueden repetir día). */
function countedDays(kind: ChallengeKind, data: ChallengeData) {
  switch (kind) {
    case "entrenos-12":
      return data.workouts.map((workout) => workout.date);
    case "movilidad-10":
      return data.workouts.filter(isMobilityOnly).map((workout) => workout.date);
    case "agua-21":
      return data.water.filter((entry) => entry.glasses >= data.waterGoal).map((entry) => entry.date);
    case "comidas-25":
      return [...new Set(data.foodLog.map((entry) => entry.date))];
    case "proteina-20": {
      if (!data.proteinTarget) return [];
      const totals = new Map<string, number>();
      for (const entry of data.foodLog) totals.set(entry.date, (totals.get(entry.date) ?? 0) + entry.protein * entry.portions);
      return [...totals].filter(([, protein]) => protein >= (data.proteinTarget ?? Infinity)).map(([date]) => date);
    }
  }
}

export type ChallengeStatus = "active" | "done" | "expired" | "abandoned";

export interface ChallengeProgress {
  def: ChallengeDef;
  count: number;
  target: number;
  /** Último día del reto (día 30). */
  end: string;
  /** Días que quedan contando hoy (0 si terminó). */
  daysLeft: number;
  status: ChallengeStatus;
  /** Día en que se llegó a la meta. */
  doneOn?: string;
}

export function challengeProgress(entry: ChallengeEntry, data: ChallengeData, today: string): ChallengeProgress | null {
  const def = challengeDef(entry.kind);
  if (!def) return null;
  const end = addDays(entry.start, CHALLENGE_DAYS - 1);
  const last = entry.endedAt && entry.endedAt < end ? entry.endedAt : end;
  const days = countedDays(entry.kind, data).filter((date) => date >= entry.start && date <= last).sort();
  const count = days.length;
  const doneOn = count >= def.target ? days[def.target - 1] : undefined;
  const status: ChallengeStatus = doneOn ? "done" : entry.endedAt ? "abandoned" : today > end ? "expired" : "active";
  return { def, count: Math.min(count, def.target), target: def.target, end, daysLeft: status === "active" ? daysBetween(today, end) + 1 : 0, status, doneOn };
}

/** Frase de ritmo para un reto activo: «Te faltan 7 en 18 días: unos 3 por semana». */
export function paceLine(progress: ChallengeProgress) {
  const missing = progress.target - progress.count;
  if (progress.status !== "active" || missing <= 0) return null;
  if (missing > progress.daysLeft && progress.def.unit === "días") return `Te faltan ${missing} días y quedan ${progress.daysLeft}: este no alcanza, pero sigue sumando.`;
  const perWeek = Math.ceil((missing / Math.max(1, progress.daysLeft)) * 7);
  const pace = progress.def.unit === "días" ? (missing === progress.daysLeft ? "todos los días que quedan" : `unos ${Math.min(7, perWeek)} de cada 7 días`) : `unos ${perWeek} por semana`;
  return `Te faltan ${missing} en ${progress.daysLeft} ${progress.daysLeft === 1 ? "día" : "días"}: ${pace}.`;
}
