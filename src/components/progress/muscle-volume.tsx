"use client";

import { BookOpen } from "lucide-react";
import { muscleLabels } from "@/data/catalog";
import { allMuscles, muscleSetsBetween } from "@/lib/analytics";
import { weeklySetTarget } from "@/lib/selection";
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
export function muscleVolume(workouts: WorkoutEntry[], start: string, end: string, weeks: number, level: ExerciseLevel): MuscleVolumeData {
  const [low, high] = weeklySetTarget(level);
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

const evidence: Record<ExerciseLevel, string> = {
  1: "Al empezar, 4–8 series semanales por músculo ya dan buenos resultados.",
  2: "8–12 series semanales por músculo es una buena referencia para seguir progresando.",
  3: "Con experiencia, 10–20 series semanales por músculo, según cómo te recuperes.",
};

export function MuscleEvidence({ level }: { level: ExerciseLevel }) {
  return (
    <p className="prog-evidence">
      <BookOpen size={16} aria-hidden="true" />
      <span>
        {evidence[level]} Más no siempre es mejor: cada serie extra suma menos y cuesta más recuperarse. Cuentan las series de trabajo: 1 para el músculo principal y 0,5 para los secundarios.
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
