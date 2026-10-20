"use client";

import { useMemo } from "react";
import { useActiveProgram, useTodayPlan } from "@/components/train/today-plan";
import { allMuscles, weekStreak } from "@/lib/analytics";
import { dailyCoach, dailyTip } from "@/lib/daily-coach";
import { SHORT_MINUTES, shortVersion } from "@/lib/short-session";
import { useDraft, useSettings, useWorkouts } from "@/lib/store";
import { durationSeconds, sessionSets } from "@/lib/training";
import { useRestDay } from "@/lib/use-rest-day";
import { localDateKey, toDisplayWeight } from "@/lib/utils";
import type { MuscleGroup } from "@/types";

const fresh = Object.fromEntries(allMuscles.map((muscle) => [muscle, 100])) as Record<MuscleGroup, number>;

/**
 * Inicio en una sola lectura: de dónde sale la sesión de hoy (en curso, programa o a tu medida), sus
 * ejercicios y minutos (también en versión corta), la recomendación del coach con su porqué y el
 * consejo del día. Usa los mismos datos de siempre: nada se guarda aparte.
 */
export function useHomeCoach(now: number) {
  const today = useTodayPlan(now);
  const active = useActiveProgram(now);
  const [draft] = useDraft();
  const [workouts] = useWorkouts();
  const [settings] = useSettings();
  const restDay = useRestDay();

  const date = new Date(now);
  const trainedToday = workouts.some((workout) => workout.date === localDateKey(date));
  const source: "draft" | "program" | "custom" = draft ? "draft" : active?.next ? "program" : "custom";
  const programRecords = active?.records;
  const shortProgram = useMemo(() => (programRecords && today.short ? shortVersion(programRecords, settings.defaultRest, { warmup: today.includeWarmup }) : null), [programRecords, settings.defaultRest, today.includeWarmup, today.short]);
  const records = source === "program" && programRecords ? shortProgram ?? programRecords : today.records;
  const minutes = source === "program" && active ? (today.short ? SHORT_MINUTES : active.program.minutes) : today.estimated;
  const fullMinutes = source === "program" && active ? active.program.minutes : today.fullEstimated;
  const goal = Math.max(1, settings.weeklyGoal);
  const week = { done: weekStreak(workouts, goal, settings.pausedWeeks, date).currentCount, goal };
  const progress = draft ? sessionSets(draft.records) : null;

  const coach = dailyCoach({
    now: date,
    draft: draft && progress ? {
      minutes: Math.floor(durationSeconds(draft, now) / 60),
      done: progress.done,
      total: progress.total,
      ready: progress.total > 0 && progress.done === progress.total,
      paused: draft.runningSince === null,
    } : null,
    trainedToday,
    restDay,
    readiness: today.readiness ?? null,
    recovery: today.recovery ?? fresh,
    focus: today.focus,
    // La recuperación explica el enfoque sólo si lo eligió ella (no tú, ni un programa).
    focusByRecovery: source === "custom" && !today.zone && !today.edited && today.focus === today.suggested,
    workouts,
    week,
    short: today.short,
    minutes,
  });
  const tip = dailyTip({ recommendation: coach.recommendation, records, workouts, unit: settings.unit, toDisplay: (kg) => toDisplayWeight(kg, settings.unit) });
  // La versión corta se ofrece sólo si de verdad ahorra tiempo.
  const canShorten = (coach.recommendation === "train-normal" || coach.recommendation === "train-reduced" || coach.recommendation === "short-session") && fullMinutes > SHORT_MINUTES + 5 && records.length > 1;

  return { today, active, source, coach, tip, records, minutes, fullMinutes, week, trainedToday, restDay, canShorten };
}

export type HomeCoach = ReturnType<typeof useHomeCoach>;
