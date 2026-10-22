"use client";

import { BookOpen } from "lucide-react";
import { muscleLabels } from "@/data/catalog";
import { allMuscles, muscleSetsBetween } from "@/lib/analytics";
import { weeklyTarget } from "@/lib/volume";
import type { VolumeGoal } from "@/lib/volume";
import { formatNumber } from "@/lib/utils";
import type { ExerciseLevel, MuscleGroup, WorkoutEntry } from "@/types";

type State = "low" | "ok" | "high";

const stateLabels: Record<State, string> = { low: "Bajo", ok: "En rango", high: "Alto" };

export interface MuscleVolumeData {
  /** Series semanales por músculo (en «Mes» y «Año», media semanal del periodo). */
  sets: Record<MuscleGroup, number>;
  low: number;
  high: number;
  rows: MuscleGroup[];
  inRange: number;
}

/** Series de trabajo por músculo en el periodo, expresadas por semana para compararlas con la referencia de tu nivel. */
export function muscleVolume(workouts: WorkoutEntry[], start: string, end: string, weeks: number, level: ExerciseLevel, goal: VolumeGoal): MuscleVolumeData {
  const { low, high } = weeklyTarget(level, goal);
  const total = muscleSetsBetween(workouts, start, end);
  const sets = Object.fromEntries(allMuscles.map((muscle) => [muscle, total[muscle] / Math.max(1, weeks)])) as Record<MuscleGroup, number>;
  const rows = [...allMuscles].sort((a, b) => sets[b] - sets[a] || muscleLabels[a].localeCompare(muscleLabels[b]));
  const inRange = rows.filter((muscle) => sets[muscle] >= low && sets[muscle] <= high).length;
  return { sets, low, high, rows, inRange };
}

/** Intensidad 0–1 para el mapa (1 = tope del rango). */
export function muscleHeat(data: MuscleVolumeData) {
  return Object.fromEntries(allMuscles.map((muscle) => [muscle, Math.min(1, data.sets[muscle] / data.high)])) as Record<MuscleGroup, number>;
}

/** Lista completa con la banda del rango eficaz. */
export function MuscleList({ data }: { data: MuscleVolumeData }) {
  const scale = Math.max(data.high * 1.25, ...data.rows.map((muscle) => data.sets[muscle]));
  return (
    <ul className="prog-muscle-list">
      {data.rows.map((muscle) => (
        <MuscleRow key={muscle} muscle={muscle} value={data.sets[muscle]} low={data.low} high={data.high} scale={scale} />
      ))}
    </ul>
  );
}

/** La referencia en una frase, según tu objetivo y tu nivel. */
function evidence(level: ExerciseLevel, goal: VolumeGoal) {
  const { low, high } = weeklyTarget(level, goal);
  if (goal === "muscle") return `${low}–${high} series semanales por músculo es una buena referencia para ganar músculo${level === 1 ? " al empezar" : level === 3 ? ", según cómo te recuperes" : ""}.`;
  if (goal === "strength") return `Para ganar fuerza bastan unas ${low}–${high} series semanales por músculo, con lo principal 2 o 3 veces por semana.`;
  return `Para mantenerte fuerte y funcional bastan unas ${low}–${high} series semanales por músculo.`;
}

export function MuscleEvidence({ level, goal }: { level: ExerciseLevel; goal: VolumeGoal }) {
  return (
    <p className="prog-evidence">
      <BookOpen size={16} aria-hidden="true" />
      <span>
        {evidence(level, goal)} Más no siempre es mejor: cada serie extra suma menos y cuesta más recuperarse. Cuentan las series de trabajo: 1 para el músculo principal y 0,5 para los secundarios.
      </span>
    </p>
  );
}

function MuscleRow({ muscle, value, low, high, scale }: { muscle: MuscleGroup; value: number; low: number; high: number; scale: number }) {
  const state: State = value < low ? "low" : value <= high ? "ok" : "high";
  return (
    <li className={`prog-muscle-row ${state}`}>
      <span className="prog-muscle-name">{muscleLabels[muscle]}</span>
      <span className="prog-muscle-track" aria-hidden="true">
        <span className="prog-muscle-band" style={{ left: `${(low / scale) * 100}%`, width: `${((high - low) / scale) * 100}%` }} />
        <span className="prog-muscle-fill" style={{ width: `${(value / scale) * 100}%` }} />
      </span>
      <span className="prog-muscle-value num">{formatNumber(value)}</span>
      <span className="prog-muscle-state">{stateLabels[state]}</span>
    </li>
  );
}
