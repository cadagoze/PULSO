"use client";

import { useNow } from "@/lib/use-now";
import { WellnessAssessment } from "@/components/onboarding/wellness-assessment";
import { DayFuel } from "@/components/home/day-fuel";
import { InstallCard } from "@/components/install/install-card";
import { HomeHeader } from "@/components/home/home-header";
import { ReadinessCard } from "@/components/home/readiness-card";
import { TodayHero } from "@/components/home/today-hero";
import { WeekStrip } from "@/components/home/week-strip";
import { useDraft, useProfile, useReadiness, useWorkouts } from "@/lib/store";
import { localDateKey } from "@/lib/utils";
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
  const [workouts] = useWorkouts();

  // Hasta hidratar no sabemos si hay perfil guardado: evitamos mostrar la evaluación por error.
  if (now === 0) return <HomeSkeleton />;
  if (!profile) return <WellnessAssessment onComplete={setProfile} />;

  const today = localDateKey(new Date(now));
  const todayEntry = readiness.find((entry) => entry.date === today);
  // El chequeo sirve antes de entrenar: con la sesión en curso o ya hecha, sobra.
  const showReadiness = !draft && !workouts.some((workout) => workout.date === today);

  return (
    <div className="page home">
      <HomeHeader now={now} line={homeLine({ inProgress: Boolean(draft), readiness: todayEntry?.recommendation })} />
      {/* Lo primero al abrir: calorías, alimentación y agua; después, el entrenamiento de hoy. */}
      <div className="home-fuel-slot"><DayFuel now={now} /></div>
      <div className="home-hero-slot">
        <TodayHero now={now} readiness={todayEntry?.recommendation} />
      </div>
      {/* Sólo lo que sirve hoy: el chequeo antes de entrenar y la semana. Lo demás vive en su pestaña. */}
      <div className="home-side">
        <InstallCard />
        {showReadiness && <ReadinessCard today={today} now={now} />}
        <WeekStrip now={now} />
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
