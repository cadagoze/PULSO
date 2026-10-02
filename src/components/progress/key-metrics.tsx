"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { NumberMetric } from "@/components/ui";
import { minutesLabel, minutesParts, volumeLabel, volumeParts, type Unit } from "@/components/progress/format";
import { useFirstReveal } from "@/components/progress/motion";
import type { PeriodSummary } from "@/components/progress/period";
import { cn } from "@/lib/utils";

const heroLabels: Record<PeriodSummary["period"], string> = {
  semana: "sesiones esta semana",
  mes: "entrenamientos en 30 días",
  ano: "entrenamientos en 12 meses",
};

/** Diferencia con el periodo anterior: lima si sube, neutra si baja (sin rojo: no es un error). */
function Delta({ value, format }: { value: number; format: (abs: number) => string }) {
  if (Math.abs(value) < 0.05) return <span className="prog-delta flat">Sin cambios</span>;
  const up = value > 0;
  return (
    <span className={cn("prog-delta", up ? "up" : "down")}>
      <span aria-hidden="true">{up ? "▲" : "▼"}</span> <span className="num">{format(Math.abs(value))}</span>
      <span className="sr-only">{up ? " más" : " menos"} que en el periodo anterior</span>
    </span>
  );
}

/** Check que aparece una sola vez por semana cuando se cumple la meta. */
function GoalCheck({ weekStart }: { weekStart: string }) {
  const first = useFirstReveal(`goal-${weekStart}`);
  return (
    <span className={cn("prog-goal-check", first && "pop")} aria-hidden="true">
      <Check size={18} strokeWidth={3} />
    </span>
  );
}

function Kpi({ label, value, unit, detail }: { label: string; value: string; unit: string; detail?: ReactNode }) {
  return (
    <div className="prog-kpi">
      <p className="meta">{label}</p>
      <NumberMetric size="m" value={value} unit={unit} label={detail} />
    </div>
  );
}

/** Lo más importante primero: entrenamientos en grande; volumen y tiempo total al lado, con su variación. */
export function KeyMetrics({ summary, goal, unit }: { summary: PeriodSummary; goal: number; unit: Unit }) {
  const { totals, previous, period } = summary;
  const week = period === "semana";
  const met = week && totals.sessions >= goal;
  const volume = volumeParts(totals.volume, unit);
  const minutes = minutesParts(totals.minutes);
  const bodyweight = totals.volume === 0 && totals.sets > 0;

  return (
    <section className="prog-metrics" aria-labelledby="prog-metrics-title">
      <h2 id="prog-metrics-title" className="sr-only">Resumen del periodo</h2>
      <div className={cn("prog-hero", met && "is-met")}>
        <p className="meta">{week ? `Entrenamientos · Meta ${goal} por semana` : "Entrenamientos"}</p>
        <div className="prog-hero-number">
          <NumberMetric
            size="xl"
            value={week ? <>{totals.sessions}<span className="nmetric-soft">/{goal}</span>{met && <GoalCheck weekStart={summary.start} />}</> : totals.sessions.toLocaleString("es-CL")}
            label={
              <>
                {met ? "Meta de la semana cumplida" : heroLabels[period]}
                {previous && <> · <Delta value={totals.sessions - previous.sessions} format={(abs) => abs.toLocaleString("es-CL")} /></>}
              </>
            }
          />
        </div>
      </div>
      <div className="prog-kpis">
        <Kpi
          label="Volumen"
          value={volume.value}
          unit={volume.unit}
          detail={bodyweight ? `${totals.sets.toLocaleString("es-CL")} series con peso corporal` : previous ? <Delta value={totals.volume - previous.volume} format={(abs) => volumeLabel(abs, unit)} /> : undefined}
        />
        <Kpi
          label="Tiempo total"
          value={minutes.value}
          unit={minutes.unit}
          detail={previous ? <Delta value={totals.minutes - previous.minutes} format={minutesLabel} /> : undefined}
        />
      </div>
      {previous && <p className="prog-compare">{summary.compareNote}</p>}
    </section>
  );
}
