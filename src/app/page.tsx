"use client";

import { useNow } from "@/lib/use-now";
import { WellnessAssessment } from "@/components/onboarding/wellness-assessment";
import { dayOfYear } from "@/components/home/helpers";
import { HomeDigest } from "@/components/home/home-digest";
import { HomeHeader } from "@/components/home/home-header";
import { QuickActions } from "@/components/home/quick-actions";
import { ReadinessCard } from "@/components/home/readiness-card";
import { TodayHero } from "@/components/home/today-hero";
import { WeekStrip } from "@/components/home/week-strip";
import { weekStreak } from "@/lib/analytics";
import { useDraft, useProfile, useReadiness, useSettings, useWorkouts } from "@/lib/store";
import { localDateKey } from "@/lib/utils";
import type { ReadinessEntry } from "@/types";

/** Frase bajo el saludo, según lo que toca hoy. */
function homeLine({ inProgress, goalMet, readiness }: { inProgress: boolean; goalMet: boolean; readiness?: ReadinessEntry["recommendation"] }) {
  if (inProgress) return "Tienes un entrenamiento a medias.";
  if (readiness === "recovery") return "Hoy toca moverte suave y recuperar.";
  if (readiness === "short") return "Hoy, una sesión más corta y bien hecha.";
  if (goalMet) return "Meta semanal cumplida. Hoy, lo que te pida el cuerpo.";
  return "Hoy es un buen día para entrenar.";
}

export default function Home() {
  const now = useNow();
  const [profile, setProfile] = useProfile();
  const [readiness] = useReadiness();
  const [draft] = useDraft();
  const [workouts] = useWorkouts();
  const [settings] = useSettings();

  // Hasta hidratar no sabemos si hay perfil guardado: evitamos mostrar la evaluación por error.
  if (now === 0) return <HomeSkeleton />;
  if (!profile) return <WellnessAssessment onComplete={setProfile} />;

  const today = localDateKey(new Date(now));
  const todayEntry = readiness.find((entry) => entry.date === today);
  const { currentMet } = weekStreak(workouts, Math.max(1, settings.weeklyGoal), settings.pausedWeeks, new Date(now));

  return (
    <div className="page home">
      <HomeHeader now={now} line={homeLine({ inProgress: Boolean(draft), goalMet: currentMet, readiness: todayEntry?.recommendation })} />
      <div className="home-hero-slot">
        <TodayHero now={now} readiness={todayEntry?.recommendation} />
      </div>
      <div className="home-side">
        <WeekStrip now={now} />
        <ReadinessCard today={today} now={now} />
        <QuickActions />
        <HomeDigest now={now} seed={dayOfYear(now)} />
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
