"use client";

import Link from "@/components/ui/app-link";
import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { MetricGrid, NumberMetric } from "@/components/ui";
import { CountUp } from "@/components/ui/count-up";
import { volumeParts } from "@/components/progress/format";
import { recordValueLabel } from "@/components/progress/format";
import { weeklySeries } from "@/lib/analytics";
import { useSettings, useWorkouts } from "@/lib/store";
import { exerciseById } from "@/lib/training";

const CONSISTENCY_WEEKS = 8;

/** Progreso resumido en Perfil: la semana, el volumen, la última marca y la constancia de las últimas semanas. */
export function ProgressSummary({ now }: { now: number }) {
  const [workouts] = useWorkouts();
  const [settings] = useSettings();
  const goal = Math.max(1, settings.weeklyGoal);
  const weeks = weeklySeries(workouts, CONSISTENCY_WEEKS + 1, new Date(now));
  const current = weeks[weeks.length - 1];
  // Constancia: semanas ya cerradas con la meta cumplida (la actual sigue abierta).
  const closed = weeks.slice(0, -1);
  const met = closed.filter((week) => week.sessions >= goal).length;
  const volume = volumeParts(current.volume, settings.unit);
  const lastRecord = workouts.reduce<{ at: string; hit: NonNullable<(typeof workouts)[number]["prs"]>[number] } | null>((latest, workout) => {
    const hit = workout.prs?.[0];
    return hit && (!latest || workout.completedAt > latest.at) ? { at: workout.completedAt, hit } : latest;
  }, null);
  const recordExercise = lastRecord ? exerciseById(lastRecord.hit.exerciseId) : undefined;

  return (
    <section className="prof-progress rise" style={{ "--i": 2 } as CSSProperties} aria-labelledby="prof-progress-title">
      <div className="prof-progress-head">
        <h2 id="prof-progress-title" className="meta">Tu progreso</h2>
        <Link href="/progreso" className="prof-progress-link">Ver todo<ArrowRight size={14} aria-hidden="true" /></Link>
      </div>
      <MetricGrid>
        <NumberMetric size="s" value={<><CountUp value={current.sessions} /><span className="nmetric-soft">/{goal}</span></>} label="sesiones esta semana" />
        <NumberMetric size="s" value={volume.value} unit={volume.unit} label="volumen esta semana" />
        <NumberMetric size="s" value={met} unit={`de ${closed.length}`} label="semanas con la meta cumplida" />
        {lastRecord && recordExercise ? (
          <NumberMetric size="s" value={recordValueLabel(lastRecord.hit.kind, lastRecord.hit.value, settings.unit)} label={`Última marca · ${recordExercise.name}`} />
        ) : (
          <NumberMetric size="s" value={<span className="nmetric-soft">—</span>} label="Tu primera marca llega entrenando" />
        )}
      </MetricGrid>
    </section>
  );
}
