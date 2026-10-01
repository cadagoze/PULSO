"use client";

import { Flame, Trophy } from "lucide-react";
import { ProgressRing } from "@/components/ui";
import { bestWeekStreak, weekStreak } from "@/lib/analytics";
import type { WorkoutEntry } from "@/types";

interface StreakCardProps {
  workouts: WorkoutEntry[];
  now: Date;
  goal: number;
  pausedWeeks: string[];
}

function weeksLabel(value: number) {
  return value === 1 ? "semana" : "semanas";
}

export function StreakCard({ workouts, now, goal, pausedWeeks }: StreakCardProps) {
  const streak = weekStreak(workouts, goal, pausedWeeks, now);
  const best = Math.max(bestWeekStreak(workouts, goal, pausedWeeks), streak.streak);
  const remaining = Math.max(0, goal - streak.currentCount);
  const message = streak.currentPaused
    ? "Semana en pausa: tu racha está protegida."
    : streak.currentMet
      ? "Meta cumplida. Todo lo extra suma."
      : `Te ${remaining === 1 ? "falta 1 sesión" : `faltan ${remaining} sesiones`} para tu meta.`;

  return (
    <section className="card card-l prog-streak" aria-labelledby="prog-streak-title">
      <h2 id="prog-streak-title" className="sr-only">Meta semanal y racha</h2>
      <ProgressRing
        value={(streak.currentCount / Math.max(1, goal)) * 100}
        size={124}
        stroke={10}
        label={`${streak.currentCount} de ${goal} sesiones esta semana`}
      >
        <strong className="num prog-ring-value">
          {streak.currentCount}
          <small>/{goal}</small>
        </strong>
        <span className="prog-ring-label">sesiones</span>
      </ProgressRing>
      <div className="prog-streak-body">
        <p className="prog-streak-message">{message}</p>
        <div className="prog-streak-stats">
          <div>
            <span className="prog-streak-icon"><Flame size={16} aria-hidden="true" /></span>
            <b className="num">{streak.streak}</b>
            <small>{weeksLabel(streak.streak)} de racha</small>
          </div>
          <div>
            <span className="prog-streak-icon muted"><Trophy size={16} aria-hidden="true" /></span>
            <b className="num">{best}</b>
            <small>mejor racha</small>
          </div>
        </div>
      </div>
    </section>
  );
}
