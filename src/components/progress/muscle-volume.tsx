"use client";

import { BookOpen } from "lucide-react";
import { MuscleMap } from "@/components/ui/muscle-map";
import { muscleLabels } from "@/data/catalog";
import { allMuscles, muscleSetsBetween, weekRange } from "@/lib/analytics";
import { levelFromActivities } from "@/lib/generator";
import { useProfile } from "@/lib/store";
import { formatNumber } from "@/lib/utils";
import type { MuscleGroup, WorkoutEntry } from "@/types";

type State = "low" | "ok" | "high";

const stateLabels: Record<State, string> = { low: "Bajo", ok: "En rango", high: "Alto" };

export function MuscleVolume({ workouts, now }: { workouts: WorkoutEntry[]; now: Date }) {
  const [profile] = useProfile();
  const beginner = levelFromActivities(profile?.activities) === 1;
  const [low, high] = beginner ? [6, 10] : [10, 20];
  const range = weekRange(now, 0);
  const sets = muscleSetsBetween(workouts, range.start, range.end);
  const rows = [...allMuscles].sort((a, b) => sets[b] - sets[a] || muscleLabels[a].localeCompare(muscleLabels[b]));
  const scale = Math.max(high * 1.25, ...rows.map((muscle) => sets[muscle]));
  const heat = Object.fromEntries(allMuscles.map((muscle) => [muscle, Math.min(1, sets[muscle] / high)])) as Record<MuscleGroup, number>;
  const inRange = rows.filter((muscle) => sets[muscle] >= low && sets[muscle] <= high).length;

  return (
    <section className="card card-l prog-muscles" aria-labelledby="prog-muscles-title">
      <div className="prog-card-head">
        <div>
          <h2 id="prog-muscles-title">Series por músculo esta semana</h2>
          <p className="muted prog-card-sub">
            <span className="num">{inRange}</span> de {rows.length} músculos en el rango de {low}–{high} series
          </p>
        </div>
      </div>
      <div className="prog-muscles-body">
        <ul className="prog-muscle-list">
          {rows.map((muscle) => (
            <MuscleRow key={muscle} muscle={muscle} value={sets[muscle]} low={low} high={high} scale={scale} />
          ))}
        </ul>
        <div className="prog-muscles-map">
          <MuscleMap mode="heat" values={heat} label="Mapa de series semanales por músculo" />
          <div className="prog-map-legend" aria-hidden="true">
            <span>0</span>
            <i />
            <span>{high}+ series</span>
          </div>
        </div>
      </div>
      <p className="prog-evidence">
        <BookOpen size={16} aria-hidden="true" />
        <span>
          10–20 series semanales por músculo es un rango eficaz para ganar músculo.
          {beginner ? " Al comenzar, 6–10 ya dan muy buenos resultados." : ""} Cuentan las series de trabajo: 1 para el músculo principal y 0,5 para los secundarios.
        </span>
      </p>
    </section>
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
