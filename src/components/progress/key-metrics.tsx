"use client";

import { Check } from "lucide-react";
import { NumberMetric } from "@/components/ui";
import { CountUp } from "@/components/ui/count-up";
import { minutesParts, volumeParts, type Unit } from "@/components/progress/format";
import { useFirstReveal } from "@/components/progress/motion";
import type { PeriodSummary } from "@/components/progress/period";
import { cn } from "@/lib/utils";

/** Check que aparece una sola vez por semana cuando se cumple la meta. */
function GoalCheck({ weekStart }: { weekStart: string }) {
  const first = useFirstReveal(`goal-${weekStart}`);
  return (
    <span className={cn("prog-goal-check", first && "pop")} aria-hidden="true">
      <Check size={18} strokeWidth={3} />
    </span>
  );
}

function Kpi({ label, value, unit, detail }: { label: string; value: string; unit: string; detail: string }) {
  return (
    <div className="prog-kpi">
      <p className="meta">{label}</p>
      <NumberMetric size="m" value={value} unit={unit} label={detail} />
    </div>
  );
}

/**
 * Las cuatro cifras de la semana: entrenamientos (contra tu meta), volumen, tiempo y constancia (semanas
 * seguidas cumpliendo la meta). Sin variaciones ni comparaciones: lo que sirve para decidir la próxima sesión.
 */
export function KeyMetrics({ summary, goal, unit, streak, best }: { summary: PeriodSummary; goal: number; unit: Unit; streak: number; best: number }) {
  const { totals } = summary;
  const met = totals.sessions >= goal;
  const volume = volumeParts(totals.volume, unit);
  const minutes = minutesParts(totals.minutes);
  const bodyweight = totals.volume === 0 && totals.sets > 0;

  return (
    <section className="prog-metrics" aria-labelledby="prog-metrics-title">
      <h2 id="prog-metrics-title" className="sr-only">Tu semana</h2>
      <div className={cn("prog-hero", met && "is-met")}>
        <p className="meta">Entrenamientos · esta semana</p>
        <div className="prog-hero-number">
          <NumberMetric
            size="xl"
            value={<><CountUp value={totals.sessions} /><span className="nmetric-soft">/{goal}</span>{met && <GoalCheck weekStart={summary.start} />}</>}
            label={met ? "Meta de la semana cumplida" : "sesiones esta semana"}
          />
        </div>
      </div>
      <div className="prog-kpis">
        <Kpi label="Volumen" value={volume.value} unit={volume.unit} detail={bodyweight ? `${totals.sets} series con tu peso` : "esta semana"} />
        <Kpi label="Tiempo" value={minutes.value} unit={minutes.unit} detail="esta semana" />
        <Kpi label="Constancia" value={String(streak)} unit="sem" detail={best > streak ? `Tu mejor racha: ${best}` : "seguidas con la meta"} />
      </div>
    </section>
  );
}
