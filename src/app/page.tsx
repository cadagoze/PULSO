"use client";

import { useNow } from "@/lib/use-now";
import { useNutritionDay } from "@/lib/use-nutrition";
import { WellnessAssessment } from "@/components/onboarding/wellness-assessment";
import { DayFuel } from "@/components/home/day-fuel";
import { HomeDigest } from "@/components/home/home-digest";
import { InstallCard } from "@/components/install/install-card";
import { HomeHeader } from "@/components/home/home-header";
import { QuickActions } from "@/components/home/quick-actions";
import { ReadinessCard } from "@/components/home/readiness-card";
import { TodayHero } from "@/components/home/today-hero";
import { WeekStrip } from "@/components/home/week-strip";
import { useDraft, useProfile, useReadiness } from "@/lib/store";
import { localDateKey, localDaySeed } from "@/lib/utils";
import type { ReadinessEntry } from "@/types";

/** Frase bajo el saludo, según lo que toca hoy (el progreso de la semana va en la portada). */
function homeLine({ inProgress, readiness }: { inProgress: boolean; readiness?: ReadinessEntry["recommendation"] }) {
  if (inProgress) return "Dejaste un entrenamiento a medias. Termínalo.";
  if (readiness === "recovery") return "Hoy se recupera. Moverse suave también es disciplina.";
  if (readiness === "short") return "Poco tiempo no es excusa: sesión corta y bien hecha.";
  return "Sin excusas. Hoy se entrena.";
}

export default function Home() {
  const now = useNow();
  const [profile, setProfile] = useProfile();
  const [readiness] = useReadiness();
  const [draft] = useDraft();
  const { counting } = useNutritionDay(now);

  // Hasta hidratar no sabemos si hay perfil guardado: evitamos mostrar la evaluación por error.
  if (now === 0) return <HomeSkeleton />;
  if (!profile) return <WellnessAssessment onComplete={setProfile} />;

  const today = localDateKey(new Date(now));
  const todayEntry = readiness.find((entry) => entry.date === today);

  return (
    <div className="page home">
      <HomeHeader now={now} line={homeLine({ inProgress: Boolean(draft), readiness: todayEntry?.recommendation })} />
      {/* Si cuentas calorías, lo primero al abrir es cuánto llevas; si no, la sesión de hoy. */}
      {counting && <div className="home-fuel-slot"><DayFuel now={now} /></div>}
      <div className="home-hero-slot">
        <TodayHero now={now} readiness={todayEntry?.recommendation} />
      </div>
      <div className="home-side">
        {!counting && <DayFuel now={now} />}
        <InstallCard />
        <WeekStrip now={now} />
        <ReadinessCard today={today} now={now} />
        <QuickActions />
        <HomeDigest now={now} seed={localDaySeed(now)} />
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
