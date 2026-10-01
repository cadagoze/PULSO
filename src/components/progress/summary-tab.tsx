"use client";

import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { ActivityHeatmap } from "@/components/progress/activity-heatmap";
import { LoadCard } from "@/components/progress/load-card";
import { MuscleVolume } from "@/components/progress/muscle-volume";
import { StreakCard } from "@/components/progress/streak-card";
import { WeekHero } from "@/components/progress/week-hero";
import { WeeklyChart } from "@/components/progress/weekly-chart";
import { useSettings, useWorkouts } from "@/lib/store";
import { useNow } from "@/lib/use-now";

export function SummaryTab() {
  const [workouts] = useWorkouts();
  const [settings] = useSettings();
  const now = useNow();

  if (!now) return <div className="prog-skeleton" aria-hidden="true" />;
  const date = new Date(now);

  return (
    <div className="prog-stack">
      {!workouts.length && (
        <EmptyState
          icon={<BarChart3 size={20} />}
          title="Tu progreso empieza con la primera sesión"
          action={<Link href="/entrenar" className="btn btn-primary">Preparar entrenamiento</Link>}
        >
          Cuando registres entrenamientos verás aquí tu semana, tu constancia y cómo se reparte el trabajo por músculo.
        </EmptyState>
      )}
      <div className="prog-summary-top">
        <WeekHero workouts={workouts} now={date} unit={settings.unit} />
        <StreakCard workouts={workouts} now={date} goal={settings.weeklyGoal} pausedWeeks={settings.pausedWeeks} />
      </div>
      <div className="prog-summary-grid">
        <WeeklyChart workouts={workouts} now={date} goal={settings.weeklyGoal} unit={settings.unit} />
        <ActivityHeatmap workouts={workouts} now={date} />
      </div>
      <MuscleVolume workouts={workouts} now={date} />
      <LoadCard workouts={workouts} now={now} />
    </div>
  );
}
