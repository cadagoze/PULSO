"use client";

import Link from "@/components/ui/app-link";
import { Check, ChevronRight } from "lucide-react";
import { challengeIcons } from "@/components/progress/challenges-tab";
import { weekStreak } from "@/lib/analytics";
import { useChallengeBoard } from "@/lib/use-challenges";
import { useSettings, useWorkouts } from "@/lib/store";
import { cleanDays, nextTrainingDay, weekdayIndex } from "@/lib/training-days";
import { cn, localDateKey } from "@/lib/utils";

/**
 * «Esta semana», simple: sesiones hechas frente a la meta (● ● ○) y cuándo toca la próxima; con la meta
 * cumplida, sólo eso (y la racha, si suma). El reto de 30 días aparece sólo si tienes uno en curso.
 */
export function WeekStrip({ now }: { now: number }) {
  const [workouts] = useWorkouts();
  const [settings] = useSettings();
  const date = new Date(now);
  const today = localDateKey(date);
  const goal = Math.max(1, settings.weeklyGoal);
  const { streak, currentCount, currentMet, currentPaused } = weekStreak(workouts, goal, settings.pausedWeeks, date);
  const fixedDays = cleanDays(settings.trainingDays);
  const trainedToday = workouts.some((workout) => workout.date === today);
  const todayPlanned = !fixedDays.length || fixedDays.includes(weekdayIndex(date));
  const next = !trainedToday && todayPlanned ? "hoy" : nextTrainingDay(fixedDays, date)?.label ?? null;
  const remaining = Math.max(0, goal - currentCount);
  const missing = remaining === 1 ? "falta 1" : `faltan ${remaining}`;

  return (
    <section className={cn("home-week", currentMet && "is-met")} aria-labelledby="home-week-title">
      <div className="home-section-head">
        <h2 id="home-week-title" className="meta">Esta semana</h2>
        <Link href="/progreso" className="home-section-link">Progreso<ChevronRight size={15} aria-hidden="true" /></Link>
      </div>
      <div className="home-week-row">
        <p className="home-week-count"><b className="num">{currentCount}</b><span className="num"> / {goal}</span> {goal === 1 ? "sesión" : "sesiones"}</p>
        <ol className="home-week-dots" aria-hidden="true">
          {Array.from({ length: Math.max(goal, currentCount) }, (_, index) => <li key={index} className={cn(index < currentCount && "done")} />)}
        </ol>
      </div>
      <p className="home-week-next">
        {currentPaused ? "Semana en pausa: tu racha te espera."
          : currentMet ? <><Check size={15} strokeWidth={2.6} aria-hidden="true" /><span><b>Meta semanal cumplida</b>{streak > 1 ? ` · ${streak} semanas seguidas` : ""}</span></>
            : next ? <span>Próxima: <b>{next}</b> · te {missing}</span>
              : <span>Te {missing} esta semana.</span>}
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
