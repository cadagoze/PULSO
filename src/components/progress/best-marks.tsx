"use client";

import Link from "@/components/ui/app-link";
import { ArrowRight, Trophy } from "lucide-react";
import { exerciseName, type Unit } from "@/components/progress/format";
import type { PeriodSummary } from "@/components/progress/period";
import { markFromSummary, subviewHref } from "@/components/progress/progress-nav";
import { RecordRow } from "@/components/progress/record-row";
import { sortedWorkouts } from "@/lib/training";
import { formatShortDate } from "@/lib/utils";
import type { WorkoutEntry } from "@/types";

const emptyTitles: Record<PeriodSummary["period"], string> = {
  semana: "Sin récords nuevos esta semana",
  mes: "Sin récords nuevos en 30 días",
  ano: "Sin récords nuevos en 12 meses",
};

/** Los récords del periodo, del más reciente al más antiguo (máximo tres). */
export function BestMarks({ summary, workouts, unit }: { summary: PeriodSummary; workouts: WorkoutEntry[]; unit: Unit }) {
  const top = summary.prs.slice(0, 3);
  const lastHit = sortedWorkouts(workouts).find((workout) => workout.prs?.length);
  const lastPr = lastHit?.prs?.[0];

  return (
    <section className="section prog-marks" aria-labelledby="prog-marks-title">
      <div className="section-head">
        <h2 id="prog-marks-title">Mejores marcas</h2>
        <Link href={subviewHref("records")} onClick={markFromSummary}>Ver todos<ArrowRight size={15} aria-hidden="true" /></Link>
      </div>
      {top.length ? (
        <ul className="list prog-list">
          {top.map((item) => (
            <li key={`${item.workoutId}-${item.pr.exerciseId}-${item.pr.kind}`}>
              <RecordRow pr={item.pr} date={item.date} unit={unit} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="list">
          <div className="list-row">
            <span className="icon-tile muted" aria-hidden="true"><Trophy size={18} /></span>
            <span className="grow">
              <strong>{lastPr ? emptyTitles[summary.period] : "Tus récords aparecerán aquí"}</strong>
              <small>
                {lastHit && lastPr
                  ? `Última marca: ${exerciseName(lastPr.exerciseId)} · ${formatShortDate(lastHit.date)}`
                  : "Repite tus ejercicios: cada mejora de carga o repeticiones queda registrada."}
              </small>
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
