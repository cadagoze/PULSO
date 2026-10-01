"use client";

import { useNow } from "@/lib/use-now";
import { WellnessAssessment } from "@/components/onboarding/wellness-assessment";
import { dayOfYear } from "@/components/home/helpers";
import { HomeHeader } from "@/components/home/home-header";
import { LastWorkoutCard } from "@/components/home/last-workout-card";
import { QuickActions } from "@/components/home/quick-actions";
import { ReadinessCard } from "@/components/home/readiness-card";
import { RecoveryCard } from "@/components/home/recovery-card";
import { TodayHero } from "@/components/home/today-hero";
import { WeekStrip } from "@/components/home/week-strip";
import { WellbeingSection } from "@/components/home/wellbeing-section";
import { useProfile, useReadiness } from "@/lib/store";
import { localDateKey } from "@/lib/utils";

export default function Home() {
  const now = useNow();
  const [profile, setProfile] = useProfile();
  const [readiness] = useReadiness();

  // Hasta hidratar no sabemos si hay perfil guardado: evitamos mostrar la evaluación por error.
  if (now === 0) return <HomeSkeleton />;
  if (!profile) return <WellnessAssessment onComplete={setProfile} />;

  const today = localDateKey(new Date(now));
  const todayEntry = readiness.find((entry) => entry.date === today);

  return (
    <div className="page home">
      <HomeHeader now={now} />
      <div className="home-layout">
        <div className="home-col home-col-main">
          <div className="home-slot home-slot-hero">
            <TodayHero now={now} readiness={todayEntry?.recommendation} />
          </div>
          <div className="home-slot home-slot-quick">
            <QuickActions />
          </div>
          <div className="home-slot home-slot-recovery">
            <RecoveryCard now={now} />
          </div>
        </div>
        <div className="home-col home-col-side">
          <div className="home-slot home-slot-ready">
            <ReadinessCard today={today} now={now} />
          </div>
          <div className="home-slot home-slot-week">
            <WeekStrip now={now} />
          </div>
          <div className="home-slot home-slot-last">
            <LastWorkoutCard now={now} />
          </div>
          <div className="home-slot home-slot-well">
            <WellbeingSection seed={dayOfYear(now)} />
          </div>
        </div>
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
