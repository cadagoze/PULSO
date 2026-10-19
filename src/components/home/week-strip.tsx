"use client";

import Link from "@/components/ui/app-link";
import { ArrowRight, Check, ChevronRight, Flame } from "lucide-react";
import { NumberMetric } from "@/components/ui";
import { CountUp } from "@/components/ui/count-up";
import { challengeIcons } from "@/components/progress/challenges-tab";
import { weekStreak } from "@/lib/analytics";
import { useChallengeBoard } from "@/lib/use-challenges";
import { useRoutines, useSettings, useWorkouts } from "@/lib/store";
import { cleanDays, nextTrainingDay } from "@/lib/training-days";
import { cn, localDateKey, startOfCurrentWeek } from "@/lib/utils";

const labels = ["L", "M", "M", "J", "V", "S", "D"];
const fullLabels = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

function streakLine(streak: number, met: boolean, remaining: number, paused: boolean, next: string | null) {
  if (paused) return "Semana en pausa: tu racha te espera.";
  if (met) return "Meta semanal cumplida.";
  const missing = remaining === 1 ? "Te falta 1 sesión" : `Te faltan ${remaining} sesiones`;
  const line = streak === 0 ? `${missing} para empezar tu racha.` : `${missing} para sumar otra semana.`;
  return next ? `${line} Próximo entreno: ${next}.` : line;
}

/** La semana como bloque editorial: sesiones hechas en grande, los siete días, la racha y el reto en curso (si hay). */
export function WeekStrip({ now }: { now: number }) {
  const [workouts] = useWorkouts();
  const [settings] = useSettings();
  const [routines] = useRoutines();
  // Tus días fijos de entreno; si no hay, los días de tu primera rutina.
  const fixedDays = cleanDays(settings.trainingDays);
  const planned = new Set(fixedDays.length ? fixedDays : routines[0]?.days ?? []);
  const date = new Date(now);
  const today = localDateKey(date);
  const start = startOfCurrentWeek(date);
  const doneDates = new Set(workouts.map((workout) => workout.date));
  const goal = Math.max(1, settings.weeklyGoal);
  const { streak, currentCount, currentMet, currentPaused } = weekStreak(workouts, goal, settings.pausedWeeks, date);
  const remaining = Math.max(0, goal - currentCount);
  const trainedToday = doneDates.has(today);
  const todayPlanned = fixedDays.includes((date.getDay() + 6) % 7);
  const upcoming = nextTrainingDay(fixedDays, date);
  const nextLabel = !fixedDays.length ? null : todayPlanned && !trainedToday ? "hoy" : upcoming?.label ?? null;

  const days = labels.map((short, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const key = localDateKey(day);
    return { key, short, number: day.getDate(), done: doneDates.has(key), today: key === today, planned: planned.has(index), future: key > today, full: fullLabels[index] };
  });

  return (
    <section className="home-week" aria-labelledby="home-week-title">
      <div className="home-week-head">
        <p className="meta">Esta semana · meta {goal}</p>
        <Link href="/progreso" className="home-week-link">Progreso<ArrowRight size={14} /></Link>
      </div>
      <h2 id="home-week-title" className="sr-only">Tu semana: {currentCount} de {goal} sesiones</h2>
      <div className="home-week-body">
        <NumberMetric size="xl" value={<><CountUp value={currentCount} /><span className="nmetric-soft">/{goal}</span></>} label={currentMet ? "Meta de la semana cumplida" : "sesiones esta semana"} />
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
        <span><b>{streak > 0 ? `Racha de ${streak} ${streak === 1 ? "semana" : "semanas"}` : "Sin racha aún"}</b> · {streakLine(streak, currentMet, remaining, currentPaused, nextLabel)}</span>
      </p>
      <ChallengeLine />
    </section>
  );
}

/** El reto de 30 días en curso (si elegiste uno), en una línea: es parte de lo que llevas esta semana. */
function ChallengeLine() {
  const board = useChallengeBoard();
  const current = board.ready ? board.active[0] : undefined;
  if (!current) return null;
  const Icon = challengeIcons[current.def.kind];
  return (
    <Link href="/herramientas?tab=retos" className="home-week-challenge">
      <Icon size={16} aria-hidden="true" />
      <span className="grow"><b>{current.def.title}</b> · <span className="num">{current.count}/{current.target}</span>{current.daysLeft === 1 ? " · último día" : ` · quedan ${current.daysLeft} días`}</span>
      <ChevronRight size={16} className="subtle" aria-hidden="true" />
    </Link>
  );
}
