"use client";

import { MuscleMap } from "@/components/ui/muscle-map";
import { MuscleEvidence, MuscleList, muscleHeat, muscleVolume } from "@/components/progress/muscle-volume";
import { summarizePeriod } from "@/components/progress/period";
import { levelFromActivities, trainingLevel } from "@/lib/generator";
import { useProfile, useWorkouts } from "@/lib/store";
import { useNow } from "@/lib/use-now";

/**
 * Series por músculo de esta semana (detalle de Progreso): el mapa, la lista completa y la referencia de
 * series recomendadas. La recuperación de cada grupo vive en Bienestar.
 */
export function MusclesView() {
  const [profile] = useProfile();
  const [workouts] = useWorkouts();
  const now = useNow();
  if (!now) return null;
  const level = now ? trainingLevel(profile?.activities, workouts, new Date(now)) : levelFromActivities(profile?.activities);
  const week = summarizePeriod(workouts, "semana", now);
  const data = muscleVolume(workouts, week.start, week.end, week.activeWeeks, level);

  return (
    <div className="prog-muscles-view">
      <div className="card prog-muscles-card">
        <div className="prog-muscles-body">
          <div className="prog-muscles-map">
            <MuscleMap mode="heat" values={muscleHeat(data)} label="Mapa de series por músculo esta semana" />
          </div>
          <div className="prog-muscles-info">
            <p className="meta">Series esta semana</p>
            <p className="prog-muscles-note">
              <span className="num">{data.inRange}</span> de {data.rows.length} músculos en el rango de <span className="prog-nowrap">{data.low}–{data.high} series</span>
            </p>
            <div className="prog-heat-scale" aria-hidden="true"><span>0</span><i /><span>{data.high}+</span></div>
          </div>
        </div>
      </div>
      <MuscleList data={data} />
      <MuscleEvidence level={level} />
    </div>
  );
}
