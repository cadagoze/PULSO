"use client";

import { Flame } from "lucide-react";
import { ActivityHeatmap } from "@/components/progress/activity-heatmap";
import { bestWeekStreak, weekStreak } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { WorkoutEntry } from "@/types";

function streakLine(streak: number, met: boolean, paused: boolean, remaining: number) {
  if (paused) return "Semana en pausa: tu racha está protegida.";
  if (met) return "Meta de esta semana cumplida: la racha sigue.";
  const missing = remaining === 1 ? "Te falta 1 sesión" : `Te faltan ${remaining} sesiones`;
  return streak === 0 ? `${missing} para empezar una racha.` : `${missing} para sumar otra semana.`;
}

/** Consistencia como bloque editorial: semanas seguidas cumpliendo la meta, en grande, y la actividad reciente. */
export function ConsistencySection({ workouts, now, goal, pausedWeeks }: { workouts: WorkoutEntry[]; now: Date; goal: number; pausedWeeks: string[] }) {
  const { streak, currentCount, currentMet, currentPaused } = weekStreak(workouts, goal, pausedWeeks, now);
  const best = Math.max(bestWeekStreak(workouts, goal, pausedWeeks), streak);
  const remaining = Math.max(0, goal - currentCount);

  return (
    <section className="prog-consistency" aria-labelledby="prog-consistency-title">
      <h2 id="prog-consistency-title" className="meta">Consistencia</h2>
      <div className={cn("prog-streak", streak > 0 && "is-active")}>
        <p className="prog-streak-figure">
          <span className="num-display prog-streak-number">{String(streak).padStart(2, "0")}</span>
          <Flame className="prog-flame" size={30} strokeWidth={2} aria-hidden="true" />
        </p>
        <p className="meta prog-streak-label">
          {streak === 1 ? "Semana" : "Semanas"} de racha · Mejor: <span className="num">{best}</span>
        </p>
        <p className="prog-streak-line">{streakLine(streak, currentMet, currentPaused, remaining)}</p>
      </div>
      <ActivityHeatmap workouts={workouts} now={now} />
    </section>
  );
}
