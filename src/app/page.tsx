"use client";

import { Lightbulb } from "lucide-react";
import { useNow } from "@/lib/use-now";
import { WellnessAssessment } from "@/components/onboarding/wellness-assessment";
import { BodyStatus } from "@/components/home/body-status";
import { DayFood } from "@/components/home/day-food";
import { HomeHeader } from "@/components/home/home-header";
import { ProgressNote } from "@/components/home/progress-note";
import { TodayHero } from "@/components/home/today-hero";
import { useHomeCoach } from "@/components/home/use-home-coach";
import { WeekStrip } from "@/components/home/week-strip";
import { InstallCard } from "@/components/install/install-card";
import { todayLine } from "@/lib/motivation";
import { useDraft, useProfile, useWorkouts } from "@/lib/store";
import { localDateKey } from "@/lib/utils";

/**
 * Inicio, el coach del día: tus datos → una lectura → una recomendación → un botón. Primero qué hacer
 * hoy (con su porqué y, si hace falta, la versión corta); después cómo responde tu cuerpo, la semana, un
 * dato de progreso y la alimentación en breve. Lo secundario sólo aparece cuando aplica.
 */
export default function Home() {
  const now = useNow();
  const [profile, setProfile] = useProfile();

  // Hasta hidratar no sabemos si hay perfil guardado: evitamos mostrar la evaluación por error.
  if (now === 0) return <HomeSkeleton />;
  if (!profile) return <WellnessAssessment onComplete={setProfile} />;
  return <CoachHome now={now} />;
}

function CoachHome({ now }: { now: number }) {
  const home = useHomeCoach(now);
  const [draft] = useDraft();
  const [workouts] = useWorkouts();
  const date = new Date(now);

  return (
    <div className="page home">
      <HomeHeader now={now} line={todayLine({ recommendation: home.coach.recommendation, workouts, week: home.week, now: date })} />
      <div className="home-hero-slot">
        <TodayHero now={now} home={home} />
        {home.tip && (
          <p className="home-tip">
            <Lightbulb size={16} aria-hidden="true" />
            <span>{home.tip}</span>
          </p>
        )}
      </div>
      <div className="home-side">
        {/* El chequeo sirve antes de entrenar: con la sesión en curso o ya hecha, queda sólo la recuperación. */}
        <BodyStatus now={now} today={localDateKey(date)} check={!draft && !home.trainedToday} />
        <WeekStrip now={now} />
        <ProgressNote now={now} />
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
