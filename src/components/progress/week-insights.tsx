"use client";

import Link from "@/components/ui/app-link";
import { AlarmClock, ArrowRight, Beef, Brain, CalendarDays, GlassWater, Moon, Utensils, Zap, type LucideIcon } from "lucide-react";
import { Toast, useToast } from "@/components/ui/toast";
import { waterGoal } from "@/lib/nutrition";
import { usePushSettings } from "@/lib/push";
import { useFoodLog, useReadiness, useSettings, useWater, useWorkouts } from "@/lib/store";
import { cleanDays } from "@/lib/training-days";
import { useLatestWeight, useNutritionDay } from "@/lib/use-nutrition";
import { cn, localDateKey } from "@/lib/utils";
import { weekInsights, type InsightIcon } from "@/lib/week-insights";

const icons: Record<InsightIcon, LucideIcon> = {
  sleep: Moon,
  energy: Zap,
  stress: Brain,
  protein: Beef,
  food: Utensils,
  days: CalendarDays,
  time: AlarmClock,
  water: GlassWater,
};

/** Progreso: hasta 3 patrones de tus últimas 4 semanas que cruzan chequeo, entrenamiento, comidas y agua. */
export function WeekInsights({ nowMs }: { nowMs: number }) {
  const [workouts] = useWorkouts();
  const [readiness] = useReadiness();
  const [foodLog] = useFoodLog();
  const [water] = useWater();
  const [settings] = useSettings();
  const [push, setPush] = usePushSettings();
  const weight = useLatestWeight();
  const { targets, counting } = useNutritionDay(nowMs);
  const { toast, show } = useToast();

  const report = weekInsights({
    today: localDateKey(new Date(nowMs)),
    workouts,
    readiness,
    foodLog,
    water,
    waterGoal: waterGoal(weight).glasses,
    targets: counting && targets ? { kcal: targets.kcal, protein: targets.protein } : null,
    trainingDays: cleanDays(settings.trainingDays),
    reminderTime: push.enabled && push.prefs.training ? push.prefs.trainingTime : null,
  });
  if (!report.insights.length && !report.missing.length) return null;

  function moveReminder(time: string) {
    setPush((current) => ({ ...current, prefs: { ...current.prefs, trainingTime: time } }));
    show(`Te avisaremos a las ${time}`);
  }

  return (
    <section className="section prog-insights" aria-labelledby="prog-insights-title">
      <div className="prog-insights-head">
        <h2 id="prog-insights-title" className="meta">Tu semana en datos</h2>
        <p className="muted">Lo que muestran tus últimas 4 semanas.</p>
      </div>
      {report.insights.length > 0 && (
        <ul className="insight-list">
          {report.insights.map((insight) => {
            const Icon = icons[insight.icon];
            return (
              <li key={insight.id} className={cn("insight", `is-${insight.tone}`)}>
                <span className="insight-icon" aria-hidden="true"><Icon size={18} /></span>
                <div className="grow">
                  <strong>{insight.title}</strong>
                  <p>{insight.detail}</p>
                  {insight.action?.type === "link" && <Link href={insight.action.href} className="insight-action">{insight.action.label}<ArrowRight size={14} aria-hidden="true" /></Link>}
                  {insight.action?.type === "reminder" && (
                    <button type="button" className="insight-action" onClick={() => insight.action?.type === "reminder" && moveReminder(insight.action.time)}>
                      {insight.action.label}<ArrowRight size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {report.missing.length > 0 && (
        <div className="insight-missing">
          <p className="meta">{report.insights.length ? "Para ver más patrones" : "Para ver tus patrones"}</p>
          <ul>{report.missing.map((line) => <li key={line}>{line}</li>)}</ul>
        </div>
      )}
      <Toast toast={toast} />
    </section>
  );
}
