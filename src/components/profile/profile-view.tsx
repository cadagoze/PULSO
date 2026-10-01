"use client";

import { useNow } from "@/lib/use-now";
import { useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { bestWeekStreak, weekRange, weekStreak } from "@/lib/analytics";
import { usePreference, useProfile, useSettings, useWorkouts } from "@/lib/store";
import { AboutSection, WellbeingSection } from "./about-section";
import { AppearanceSection } from "./appearance-section";
import { DataSection } from "./data-section";
import { PlanSection } from "./plan-section";
import { ProfileHeader } from "./profile-header";
import { StreakSection } from "./streak-section";
import { TrainingSection } from "./training-section";

export function ProfileView() {
  const [profile, setProfile] = useProfile();
  const [workouts] = useWorkouts();
  const [preference, setPreference] = usePreference();
  const [settings, update] = useSettings();
  const now = useNow();
  const ready = now !== 0;
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const streak = useMemo(() => {
    if (!ready) return { streak: 0, currentCount: 0, currentPaused: false, best: 0 };
    const current = weekStreak(workouts, settings.weeklyGoal, settings.pausedWeeks, new Date(now));
    return { ...current, best: bestWeekStreak(workouts, settings.weeklyGoal, settings.pausedWeeks) };
  }, [now, ready, settings.pausedWeeks, settings.weeklyGoal, workouts]);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }

  function togglePause(paused: boolean) {
    const start = weekRange(new Date()).start;
    const rest = settings.pausedWeeks.filter((week) => week !== start);
    update({ pausedWeeks: paused ? [...rest, start] : rest });
    showToast(paused ? "Racha en pausa esta semana" : "Racha reactivada");
  }

  return (
    <div className="page prof-page">
      <PageHeader eyebrow="Perfil y ajustes" title="Perfil" subtitle="Tu plan, tus preferencias y tus datos, en un solo lugar." />
      <div className="prof-layout">
        <div className="prof-aside">
          <ProfileHeader
            name={settings.name}
            profile={profile}
            totalWorkouts={workouts.length}
            bestStreak={Math.max(streak.best, streak.streak)}
            ready={ready}
            onRename={(name) => update({ name })}
          />
          <StreakSection
            ready={ready}
            streak={streak.streak}
            currentCount={streak.currentCount}
            weeklyGoal={settings.weeklyGoal}
            paused={streak.currentPaused}
            onTogglePause={togglePause}
          />
        </div>
        <div className="prof-main">
          <PlanSection profile={profile} weeklyGoal={settings.weeklyGoal} onGoalChange={(weeklyGoal) => update({ weeklyGoal })} onProfileChange={setProfile} />
          <TrainingSection settings={settings} update={update} preference={preference} setPreference={setPreference} />
          <AppearanceSection theme={settings.theme} onChange={(theme) => update({ theme })} />
          <WellbeingSection />
          <DataSection workouts={workouts} onToast={showToast} />
        </div>
      </div>
      <AboutSection />
      {toast && (
        <div className="toast" role="status">
          <Check size={17} /> {toast}
        </div>
      )}
    </div>
  );
}
