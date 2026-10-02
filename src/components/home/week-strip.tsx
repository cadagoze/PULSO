"use client";

import Link from "next/link";
import { ArrowRight, Check, Flame } from "lucide-react";
import { NumberMetric } from "@/components/ui";
import { weekStreak } from "@/lib/analytics";
import { useRoutines, useSettings, useWorkouts } from "@/lib/store";
import { cn, localDateKey, startOfCurrentWeek } from "@/lib/utils";

const labels = ["L", "M", "M", "J", "V", "S", "D"];
const fullLabels = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

/** Número de semana ISO (lunes a domingo), para la etiqueta editorial. */
function isoWeek(date: Date) {
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  return Math.ceil(((day.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

function streakLine(streak: number, met: boolean, remaining: number, paused: boolean) {
  if (paused) return "Semana en pausa: tu racha te espera.";
  if (met) return "Meta semanal cumplida.";
  const missing = remaining === 1 ? "Te falta 1 sesión" : `Te faltan ${remaining} sesiones`;
  return streak === 0 ? `${missing} para empezar tu racha.` : `${missing} para sumar otra semana.`;
}

/** La semana como bloque editorial: sesiones hechas en grande, los siete días y la racha. */
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
    return { key, short, number: day.getDate(), done: doneDates.has(key), today: key === today, planned: planned.has(index), future: key > today, full: fullLabels[index] };
  });

  return (
    <section className="home-week" aria-labelledby="home-week-title">
      <div className="home-week-head">
        <p className="meta">Semana {String(isoWeek(date)).padStart(2, "0")} · Objetivo {goal} {goal === 1 ? "sesión" : "sesiones"}</p>
        <Link href="/progreso" className="home-week-link">Progreso<ArrowRight size={14} /></Link>
      </div>
      <h2 id="home-week-title" className="sr-only">Tu semana: {currentCount} de {goal} sesiones</h2>
      <div className="home-week-body">
        <NumberMetric size="xl" value={<>{currentCount}<span className="nmetric-soft">/{goal}</span></>} label={currentMet ? "Meta de la semana cumplida" : "sesiones esta semana"} />
        <ol className="home-days">
          {days.map((day) => (
            <li
              key={day.key}
              className={cn("home-day", day.done && "done", day.today && "today", day.planned && !day.done && "planned", day.future && "future")}
              aria-label={`${day.full} ${day.number}${day.done ? ", entrenado" : day.planned ? ", planificado" : ""}${day.today ? ", hoy" : ""}`}
            >
              <span className="home-day-label" aria-hidden="true">{day.short}</span>
              <span className="home-day-dot num" aria-hidden="true">{day.done ? <Check size={14} strokeWidth={3} /> : day.number}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className={cn("home-streak", streak > 0 && "active")}>
        <Flame size={16} aria-hidden="true" />
        <span><b>{streak > 0 ? `Racha de ${streak} ${streak === 1 ? "semana" : "semanas"}` : "Sin racha aún"}</b> · {streakLine(streak, currentMet, remaining, currentPaused)}</span>
      </p>
    </section>
  );
}
