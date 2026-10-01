"use client";

import { Check, Flame } from "lucide-react";
import { ProgressRing } from "@/components/ui";
import { weekStreak } from "@/lib/analytics";
import { useRoutines, useSettings, useWorkouts } from "@/lib/store";
import { cn, localDateKey, startOfCurrentWeek } from "@/lib/utils";

const labels = ["L", "M", "M", "J", "V", "S", "D"];
const fullLabels = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

function streakLine(streak: number, met: boolean, remaining: number, paused: boolean) {
  if (paused) return "Semana en pausa: tu racha te espera.";
  if (met) return "Meta semanal cumplida. ¡Bien hecho!";
  if (streak === 0) return `Te ${remaining === 1 ? "falta 1 sesión" : `faltan ${remaining} sesiones`} para empezar tu racha.`;
  return `Te ${remaining === 1 ? "falta 1 sesión" : `faltan ${remaining} sesiones`} para sumar otra semana.`;
}

export function WeekStrip({ now }: { now: number }) {
  const [workouts] = useWorkouts();
  const [settings] = useSettings();
  const [routines] = useRoutines();
  const planned = new Set(routines[0]?.days ?? []);
  const date = new Date(now);
  const today = localDateKey(date);
  const start = startOfCurrentWeek(date);
  const doneDates = new Set(workouts.map((workout) => workout.date));
  const goal = Math.max(1, settings.weeklyGoal);
  const { streak, currentCount, currentMet, currentPaused } = weekStreak(workouts, goal, settings.pausedWeeks, date);
  const remaining = Math.max(0, goal - currentCount);

  const days = labels.map((short, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const key = localDateKey(day);
    return { key, short, number: day.getDate(), done: doneDates.has(key), today: key === today, planned: planned.has(index), full: fullLabels[index] };
  });

  return (
    <section className="card home-week" aria-labelledby="home-week-title">
      <div className="home-week-top">
        <div className="home-week-copy">
          <p className="eyebrow">Tu semana</p>
          <h2 id="home-week-title">
            <span className="num">{currentCount}</span> de <span className="num">{goal}</span> sesiones
          </h2>
          <p className={cn("home-streak", streak > 0 && "active")}>
            <Flame size={15} />
            {streak > 0 ? `Racha de ${streak} ${streak === 1 ? "semana" : "semanas"}` : "Tu racha empieza esta semana"}
          </p>
          <p className="subtle home-week-hint">{streakLine(streak, currentMet, remaining, currentPaused)}</p>
        </div>
        <ProgressRing value={(currentCount / goal) * 100} size={76} stroke={10} label={`${currentCount} de ${goal} sesiones esta semana`}>
          {currentMet ? <Check size={22} strokeWidth={3} /> : <b className="num home-week-ring">{currentCount}/{goal}</b>}
        </ProgressRing>
      </div>
      <ol className="home-days">
        {days.map((day) => (
          <li
            key={day.key}
            className={cn("home-day", day.done && "done", day.today && "today", day.planned && "planned")}
            aria-label={`${day.full} ${day.number}${day.done ? ", entrenado" : day.planned ? ", planificado" : ""}${day.today ? ", hoy" : ""}`}
          >
            <span className="home-day-label" aria-hidden="true">{day.short}</span>
            <span className="home-day-dot num" aria-hidden="true">
              {day.done ? <Check size={15} strokeWidth={3} /> : day.number}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
