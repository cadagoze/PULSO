import { weekRange } from "@/lib/analytics";
import { estimateOneRepMax } from "@/lib/progression";
import { exerciseById, isWorkingSet } from "@/lib/training";
import { regionOf, weeklyStart, weeklyTarget } from "@/lib/volume";
import type { Region, VolumeGoal } from "@/lib/volume";
import type { BodyArea, ExerciseLevel, WorkoutEntry } from "@/types";

/**
 * Adaptación del volumen: cada semana, por región (pecho, espalda, hombros, brazos, piernas, core), cuántas
 * series de más o de menos que las de partida. Se calcula repasando las últimas semanas completas, sin
 * guardar nada aparte: con los mismos datos, el mismo resultado.
 *
 * Reglas, siempre despacio: se parte del volumen conservador; baja de a 2 series cuando hay señales de
 * fatiga (molestia, dos sesiones difíciles, ejercicios que costaron mucho o un rendimiento que cae en dos o más
 * ejercicios); sube de a 1 serie sólo después de dos semanas buenas seguidas (progreso medible, nada difícil);
 * tras dos semanas sin entrenar, vuelve a empezar conservador. Cuánto sube o baja una persona es individual:
 * por eso se mira su respuesta. No hay descargas fijas cada tantas semanas (no hay evidencia de que mejoren
 * nada): sólo una descarga reactiva, cuando la fatiga se ve en el rendimiento y en el esfuerzo a la vez.
 */

const DAY = 86_400_000;
export const SHIFT_MIN = -3;
const LOOKBACK_WEEKS = 6;

/** Zonas de molestia que afectan a cada región. */
const painRegions: Record<BodyArea, Region[]> = { knees: ["legs"], back: ["back", "core"], shoulders: ["shoulders", "chest"] };

export interface RegionChange {
  region: Region;
  /** Cambio en series por músculo respecto de la semana anterior (negativo: baja). */
  delta: number;
  reason: string;
}

export interface VolumeShift {
  /** Series de más (o de menos) por músculo de cada región para esta semana. */
  shift: Partial<Record<Region, number>>;
  /** Lo que cambió al empezar esta semana, con su motivo. */
  changes: RegionChange[];
  /** Esta semana toca más liviana en todo el cuerpo (menos series, los mismos ejercicios): sólo con señales claras. */
  deload: boolean;
}

interface Signals {
  sessions: number;
  hardSessions: number;
  pain: boolean;
  feelHard: number;
  feelEasy: number;
  progressed: boolean;
  /** Ejercicios cuyo mejor rendimiento de la semana quedó al menos 8 % por debajo de lo reciente. */
  declined: number;
}

const leadRegion = (exerciseId: number): Region | null => {
  const exercise = exerciseById(exerciseId);
  return exercise && exercise.category === "strength" && exercise.primary.length ? regionOf[exercise.primary[0]] : null;
};

function best(workout: WorkoutEntry, exerciseId: number) {
  const sets = workout.records?.find((record) => record.exerciseId === exerciseId)?.sets.filter((set) => set.done && isWorkingSet(set)) ?? [];
  return Math.max(0, ...sets.map((set) => (set.load > 0 ? estimateOneRepMax(set.load, set.value) : set.value)));
}

/** Lo que pasó en una semana con los ejercicios de una región. */
function signalsFor(region: Region, week: WorkoutEntry[], before: WorkoutEntry[]): Signals {
  const signals: Signals = { sessions: 0, hardSessions: 0, pain: false, feelHard: 0, feelEasy: 0, progressed: false, declined: 0 };
  const progressedIds = new Set<number>();
  const declinedIds = new Set<number>();
  for (const workout of week) {
    const involved = (workout.records ?? []).filter((record) => record.sets.some((set) => set.done) && leadRegion(record.exerciseId) === region);
    if (!involved.length) continue;
    signals.sessions += 1;
    if ((workout.effort ?? 0) >= 4) signals.hardSessions += 1;
    if ((workout.painAreas ?? []).some((area) => area !== "other" && painRegions[area].includes(region))) signals.pain = true;
    for (const record of involved) {
      if (record.feel === "pain") signals.pain = true;
      if (record.feel === "hard") signals.feelHard += 1;
      if (record.feel === "easy") signals.feelEasy += 1;
      const prior = Math.max(0, ...before.map((item) => best(item, record.exerciseId)));
      const now = best(workout, record.exerciseId);
      if (prior > 0 && now > prior * 1.01) progressedIds.add(record.exerciseId);
      // Una caída aislada pequeña es ruido (el 1RM varía ~4 % de un día a otro): sólo cuenta una de 8 % o más.
      if (prior > 0 && now > 0 && now < prior * 0.92 && record.feel !== "pain") declinedIds.add(record.exerciseId);
    }
  }
  signals.progressed = progressedIds.size > 0;
  signals.declined = declinedIds.size;
  return signals;
}

const regions: Region[] = ["chest", "back", "shoulders", "arms", "legs", "core"];

export function volumeShift(workouts: WorkoutEntry[], { now, level, goal }: { now: number; level: ExerciseLevel; goal: VolumeGoal }): VolumeShift {
  const range = weeklyTarget(level, goal);
  const maxUp = range.high - weeklyStart(level, goal);
  const weeks = Array.from({ length: LOOKBACK_WEEKS }, (_, index) => {
    const offset = index - LOOKBACK_WEEKS;
    const { start, end } = weekRange(new Date(now), offset);
    const startMs = Date.parse(`${start}T00:00:00`);
    return {
      workouts: workouts.filter((workout) => workout.date >= start && workout.date <= end),
      before: workouts.filter((workout) => Date.parse(workout.completedAt) < startMs && startMs - Date.parse(workout.completedAt) <= 28 * DAY),
    };
  });

  const shift: Partial<Record<Region, number>> = {};
  const changes: RegionChange[] = [];
  const state = new Map<Region, { shift: number; streak: number }>(regions.map((region) => [region, { shift: 0, streak: 0 }]));
  let gap = 0;
  weeks.forEach((week, index) => {
    const last = index === weeks.length - 1;
    if (!week.workouts.length) {
      gap += 1;
      // Dos semanas sin entrenar: se vuelve a empezar conservador.
      if (gap >= 2) for (const item of state.values()) { item.shift = 0; item.streak = 0; }
      return;
    }
    gap = 0;
    for (const region of regions) {
      const item = state.get(region);
      if (!item) continue;
      const signals = signalsFor(region, week.workouts, week.before);
      if (!signals.sessions) continue;
      const before = item.shift;
      let reason = "";
      if (signals.pain || signals.hardSessions >= 2 || signals.feelHard >= 2 || signals.declined >= 2 || (signals.declined >= 1 && signals.hardSessions >= 1)) {
        item.shift = Math.max(SHIFT_MIN, item.shift - 2);
        item.streak = 0;
        reason = signals.pain ? "Marcaste molestia en esa zona: bajamos el volumen para que te recuperes."
          : signals.declined >= 2 ? "Tu rendimiento bajó en varios ejercicios: bajamos el volumen para que te recuperes."
            : "Tus últimas sesiones fueron difíciles: bajamos el volumen para que te recuperes.";
      } else if ((signals.progressed || signals.feelEasy >= 2) && signals.hardSessions === 0 && signals.feelHard === 0) {
        item.streak += 1;
        if (item.streak >= 2 && item.shift < maxUp) {
          item.shift += 1;
          item.streak = 0;
          reason = "Estás progresando bien y recuperándote sin problemas.";
        }
      } else {
        item.streak = 0;
      }
      if (last && item.shift !== before) changes.push({ region, delta: item.shift - before, reason });
    }
  });
  // Descarga reactiva: la fatiga se ve a la vez en el rendimiento (dos o más ejercicios por debajo de lo reciente) y
  // en el esfuerzo (la mitad o más de las sesiones de la semana, difíciles). Menos series, mismos ejercicios.
  const lastWeek = weeks[weeks.length - 1];
  const sessions = lastWeek.workouts.length;
  const hardWeek = sessions >= 2 && lastWeek.workouts.filter((workout) => (workout.effort ?? 0) >= 4).length * 2 >= sessions;
  const declinedExercises = regions.reduce((sum, region) => sum + signalsFor(region, lastWeek.workouts, lastWeek.before).declined, 0);
  const deload = hardWeek && declinedExercises >= 2;
  if (deload) {
    const reason = "Tu rendimiento bajó y tus sesiones fueron difíciles: esta semana, más liviana (menos series, los mismos ejercicios).";
    // Cerca de un 40 % menos de series por músculo, con los mismos ejercicios y la misma frecuencia.
    const lighter = -Math.round(weeklyStart(level, goal) * 0.4);
    for (const [region, item] of state) {
      const before = item.shift;
      item.shift = lighter;
      const existing = changes.findIndex((change) => change.region === region);
      const delta = item.shift - (before - (existing >= 0 ? changes[existing].delta : 0));
      if (existing >= 0) changes.splice(existing, 1);
      if (delta !== 0) changes.push({ region, delta, reason });
    }
  }
  for (const [region, item] of state) if (item.shift !== 0) shift[region] = item.shift;
  return { shift, changes, deload };
}
