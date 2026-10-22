"use client";

import { useEffect, useMemo, useState } from "react";
import { Share2 } from "lucide-react";
import type { CSSProperties } from "react";
import { ButtonLink, PageHeader } from "@/components/ui";
import { RoutineCard } from "@/components/ui/cards";
import { KeyMetrics } from "@/components/progress/key-metrics";
import { LearnedCard } from "@/components/progress/learned-card";
import { MoreList } from "@/components/progress/more-list";
import { summarizePeriod, type PeriodSummary } from "@/components/progress/period";
import { defaultMetric, PeriodChart } from "@/components/progress/period-chart";
import { clearFromSummary } from "@/components/progress/progress-nav";
import { WeekShareSheet } from "@/components/progress/week-share-sheet";
import { learnedFrom } from "@/lib/adaptation";
import { bestWeekStreak, weekStreak } from "@/lib/analytics";
import { useSettings, useWorkouts } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

/** Una frase bajo el título: lo que falta para la meta de la semana, sin presión. */
function headline(week: PeriodSummary, goal: number, state: { met: boolean; paused: boolean }) {
  if (state.paused) return "Semana en pausa: tu racha está protegida.";
  if (state.met) return "Meta semanal cumplida. Lo que sumes, suma.";
  const remaining = goal - week.totals.sessions;
  return remaining === 1 ? "Te falta 1 sesión para tu meta semanal." : `Te faltan ${remaining} sesiones para tu meta semanal.`;
}

const rise = (index: number) => ({ "--i": index }) as CSSProperties;

/**
 * Progreso, primero lo que sirve para decidir: entrenamientos, volumen, tiempo y constancia de la semana,
 * y la tendencia de las últimas 12 semanas. El resto (historial, récords, cuerpo, músculos y logros) en
 * «Ver detalles»; el test físico y los retos, en Herramientas.
 */
export function SummaryTab() {
  const [workouts] = useWorkouts();
  const [settings] = useSettings();
  const now = useNow();
  const [sharing, setSharing] = useState(false);
  // La hoja de compartir se monta la primera vez que se abre (y queda para su animación de cierre).
  const [shareMounted, setShareMounted] = useState(false);
  const day = now ? Math.floor(now / 3_600_000) : 0;

  // Al volver al resumen, la próxima vista secundaria vuelve a contar como abierta desde aquí.
  useEffect(() => {
    clearFromSummary();
  }, []);

  const goal = Math.max(1, settings.weeklyGoal);
  // Se recalcula por hora (o al registrar algo), no cada minuto.
  const data = useMemo(() => {
    if (!day) return null;
    const at = day * 3_600_000;
    const date = new Date(at);
    return {
      week: summarizePeriod(workouts, "semana", at),
      trend: summarizePeriod(workouts, "doce", at),
      streak: weekStreak(workouts, goal, settings.pausedWeeks, date),
      best: bestWeekStreak(workouts, goal, settings.pausedWeeks, date),
      learned: learnedFrom(workouts, settings.swappedOut, at),
    };
  }, [day, goal, settings.pausedWeeks, settings.swappedOut, workouts]);

  if (!now || !data) return <ProgressSkeleton />;

  const { week, trend, streak, best, learned } = data;
  const empty = workouts.length === 0;

  return (
    <div className="page prog-page">
      <div className="prog-top">
        <PageHeader
          meta={week.meta}
          title="Progreso"
          subtitle={empty ? "Aquí verás tus entrenamientos, tu constancia y tus mejores marcas." : headline(week, goal, { met: streak.currentMet, paused: streak.currentPaused })}
          actions={!empty && <button type="button" className="icon-button" onClick={() => { setShareMounted(true); setSharing(true); }} aria-label="Compartir mi semana"><Share2 size={19} /></button>}
        />
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
              action={<ButtonLink href="/entrenar" size="l">Ir a entrenar</ButtonLink>}
              className="prog-empty-cover"
            />
          </div>
          <div className="prog-area-more rise" style={rise(1)}><MoreList workouts={workouts} nowMs={now} /></div>
        </div>
      ) : (
        <div className={cn("prog-summary", learned.length > 0 && "has-learned")}>
          <div className="prog-area-metrics rise" style={rise(0)}><KeyMetrics summary={week} goal={goal} unit={settings.unit} streak={streak.streak} best={Math.max(best, streak.streak)} /></div>
          <div className="prog-area-chart rise" style={rise(1)}>
            <PeriodChart summary={trend} metric={defaultMetric(trend)} unit={settings.unit} title={defaultMetric(trend) === "volume" ? "Volumen por semana · 12 semanas" : "Tiempo por semana · 12 semanas"} />
          </div>
          {learned.length > 0 && <div className="prog-area-learned rise" style={rise(2)}><LearnedCard items={learned} /></div>}
          <div className="prog-area-more rise" style={rise(3)}><MoreList workouts={workouts} nowMs={now} /></div>
        </div>
      )}
      {!empty && shareMounted && <WeekShareSheet open={sharing} onClose={() => setSharing(false)} now={now} />}
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
