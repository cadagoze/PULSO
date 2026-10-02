"use client";

import { useEffect } from "react";
import type { CSSProperties } from "react";
import { ButtonLink, PageHeader, SegmentedControl } from "@/components/ui";
import { RoutineCard } from "@/components/ui/cards";
import { BestMarks } from "@/components/progress/best-marks";
import { ConsistencySection } from "@/components/progress/consistency-section";
import { KeyMetrics } from "@/components/progress/key-metrics";
import { MoreList } from "@/components/progress/more-list";
import { MusclesSection } from "@/components/progress/muscles-section";
import { periods, summarizePeriod, type Period, type PeriodSummary } from "@/components/progress/period";
import { defaultMetric, PeriodChart, type ChartMetric } from "@/components/progress/period-chart";
import { clearFromSummary } from "@/components/progress/progress-nav";
import { WeightSummary } from "@/components/progress/weight-summary";
import { weekStreak } from "@/lib/analytics";
import { useSettings, useWorkouts } from "@/lib/store";
import { useNow } from "@/lib/use-now";

/** Una frase bajo el título: la meta de la semana o la constancia media del periodo. */
function headline(summary: PeriodSummary, goal: number, state: { met: boolean; paused: boolean }) {
  if (summary.period === "semana") {
    if (state.paused) return "Semana en pausa: tu racha está protegida.";
    if (state.met) return "Meta semanal cumplida. Todo lo extra suma.";
    const remaining = goal - summary.totals.sessions;
    return remaining === 1 ? "Te falta 1 sesión para tu meta semanal." : `Te faltan ${remaining} sesiones para tu meta semanal.`;
  }
  const scope = summary.period === "mes" ? "en los últimos 30 días" : "en los últimos 12 meses";
  if (!summary.totals.sessions) return `Sin entrenamientos ${scope}.`;
  const average = summary.totals.sessions / summary.activeWeeks;
  const label = average.toLocaleString("es-CL", { maximumFractionDigits: 1 });
  const noun = label === "1" ? "sesión" : "sesiones";
  if (Math.abs(average - goal) < 0.05) return `Promedias ${label} ${noun} por semana: justo tu meta.`;
  if (average > goal) return `Promedias ${label} ${noun} por semana, por encima de tu meta.`;
  return `Promedias ${label} ${noun} por semana. Tu meta es ${goal}.`;
}

const rise = (index: number) => ({ "--i": index }) as CSSProperties;

/** Resumen del periodo: lo más importante primero (entrenamientos, volumen, tiempo), un gráfico y el resto en bloques ligeros. */
export function SummaryTab({ period, onPeriod, metric, onMetric }: { period: Period; onPeriod: (period: Period) => void; metric: ChartMetric | null; onMetric: (metric: ChartMetric) => void }) {
  const [workouts] = useWorkouts();
  const [settings] = useSettings();
  const now = useNow();

  // Al volver al resumen, la próxima vista secundaria vuelve a contar como abierta desde aquí.
  useEffect(() => {
    clearFromSummary();
  }, []);

  if (!now) return <ProgressSkeleton />;

  const goal = Math.max(1, settings.weeklyGoal);
  const empty = workouts.length === 0;
  const summary = summarizePeriod(workouts, empty ? "semana" : period, now);
  const date = new Date(now);
  const streak = weekStreak(workouts, goal, settings.pausedWeeks, date);

  return (
    <div className="page prog-page">
      <div className="prog-top">
        <PageHeader
          meta={summary.meta}
          title="Progreso"
          subtitle={empty ? "Aquí verás tu semana, tu constancia y tus mejores marcas." : headline(summary, goal, { met: streak.currentMet, paused: streak.currentPaused })}
        />
        {!empty && <SegmentedControl options={periods} value={period} onChange={onPeriod} label="Periodo del resumen" className="prog-periods" />}
      </div>

      {empty ? (
        <div className="prog-summary prog-summary-empty">
          <div className="prog-area-cover rise" style={rise(0)}>
            <RoutineCard
              size="l"
              number="00"
              numberLabel="Entrenamientos"
              eyebrow="Tu primera semana"
              title="Tu progreso empieza con la primera sesión"
              meta={[`0 de ${goal} sesiones esta semana`]}
              action={<ButtonLink href="/entrenar" size="l">Preparar entrenamiento</ButtonLink>}
              className="prog-empty-cover"
            />
          </div>
          <div className="prog-area-weight rise" style={rise(1)}><WeightSummary period="semana" nowMs={now} /></div>
          <div className="prog-area-more rise" style={rise(2)}><MoreList workouts={workouts} nowMs={now} /></div>
        </div>
      ) : (
        <div className="prog-summary">
          <div className="prog-area-metrics rise" style={rise(0)}><KeyMetrics summary={summary} goal={goal} unit={settings.unit} /></div>
          <div className="prog-area-chart rise" style={rise(1)}>
            <PeriodChart key={period} summary={summary} metric={metric ?? defaultMetric(summary)} onMetric={onMetric} unit={settings.unit} />
          </div>
          <div className="prog-area-consistency rise" style={rise(2)}><ConsistencySection workouts={workouts} now={date} goal={goal} pausedWeeks={settings.pausedWeeks} /></div>
          <div className="prog-area-marks rise" style={rise(3)}><BestMarks summary={summary} workouts={workouts} unit={settings.unit} /></div>
          <div className="prog-area-weight rise" style={rise(4)}><WeightSummary period={period} nowMs={now} /></div>
          <div className="prog-area-muscles rise" style={rise(5)}><MusclesSection workouts={workouts} summary={summary} nowMs={now} /></div>
          <div className="prog-area-more rise" style={rise(6)}><MoreList workouts={workouts} nowMs={now} /></div>
        </div>
      )}
    </div>
  );
}

export function ProgressSkeleton() {
  return (
    <div className="page prog-page" aria-busy="true">
      <div className="prog-top">
        <PageHeader meta=" " title="Progreso" />
      </div>
      <div className="prog-skeleton prog-skeleton-number" aria-hidden="true" />
      <div className="prog-skeleton prog-skeleton-chart" aria-hidden="true" />
    </div>
  );
}
