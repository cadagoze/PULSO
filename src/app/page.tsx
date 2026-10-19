"use client";

import { useNow } from "@/lib/use-now";
import { WellnessAssessment } from "@/components/onboarding/wellness-assessment";
import { BodyCheck } from "@/components/home/body-check";
import { DayFood } from "@/components/home/day-food";
import { HomeHeader } from "@/components/home/home-header";
import { TodayHero } from "@/components/home/today-hero";
import { WeekStrip } from "@/components/home/week-strip";
import { InstallCard } from "@/components/install/install-card";
import { todayLine, type DayState } from "@/lib/motivation";
import { useDraft, useProfile, useReadiness, useSettings, useWorkouts } from "@/lib/store";
import { completedSets, totalSets } from "@/lib/training";
import { useRestDay } from "@/lib/use-rest-day";
import { localDateKey } from "@/lib/utils";

/**
 * Inicio responde «¿qué hago hoy?» en pocos segundos: la sesión de hoy con un solo botón, cuánto llevas
 * en la semana, cómo llega tu cuerpo y tu día (comidas, proteína y agua). Nada más compite con «Empezar».
 */
export default function Home() {
  const now = useNow();
  const [profile, setProfile] = useProfile();
  const [readiness] = useReadiness();
  const [draft] = useDraft();
  const [workouts] = useWorkouts();
  const [settings] = useSettings();
  const restDay = useRestDay();

  // Hasta hidratar no sabemos si hay perfil guardado: evitamos mostrar la evaluación por error.
  if (now === 0) return <HomeSkeleton />;
  if (!profile) return <WellnessAssessment onComplete={setProfile} />;

  const today = localDateKey(new Date(now));
  const trainedToday = workouts.some((workout) => workout.date === today);
  const recommendation = readiness.find((entry) => entry.date === today)?.recommendation;
  const draftReady = draft ? totalSets(draft.records) > 0 && completedSets(draft.records) === totalSets(draft.records) : false;
  const state: DayState = draft
    ? draftReady ? "ready" : "running"
    : trainedToday ? "done" : restDay ? "rest" : recommendation === "recovery" ? "recovery" : recommendation === "short" ? "short" : "train";

  return (
    <div className="page home">
      <HomeHeader now={now} line={todayLine({ state, workouts, weeklyGoal: settings.weeklyGoal, pausedWeeks: settings.pausedWeeks, now: new Date(now) })} />
      <div className="home-hero-slot">
        <TodayHero now={now} />
      </div>
      <div className="home-side">
        <WeekStrip now={now} />
        {/* El chequeo sirve antes de entrenar: con la sesión en curso o ya hecha, sobra. */}
        {!draft && !trainedToday && <BodyCheck today={today} />}
        <DayFood now={now} />
        <InstallCard />
      </div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="page home" aria-busy="true">
      <div className="home-skeleton home-skeleton-title" />
      <div className="home-skeleton home-skeleton-hero" />
      <div className="home-skeleton home-skeleton-card" />
    </div>
  );
}
