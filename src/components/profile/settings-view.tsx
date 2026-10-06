"use client";

import { useEffect, useMemo } from "react";
import { PageHeader } from "@/components/ui";
import { weekRange, weekStreak } from "@/lib/analytics";
import { useSettings, useWorkouts } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { AboutSection } from "./about-section";
import { AppearanceSection } from "./appearance-section";
import { DataSection } from "./data-section";
import { NotificationsSection } from "./notifications-section";
import { StreakSection } from "./streak-section";
import { Toast, useToast } from "@/components/ui/toast";
import { TrainingSection } from "./training-section";
import { usePersonalization } from "@/lib/use-personalize";

/** Ajustes: apariencia, entrenamiento, avisos, racha, datos y acerca de, en grupos editoriales. */
export function SettingsView() {
  const [settings, update] = useSettings();
  const { identity } = usePersonalization();
  const [workouts] = useWorkouts();
  const now = useNow();
  const ready = now !== 0;
  const { toast, show } = useToast();

  const streak = useMemo(() => {
    if (!now) return { streak: 0, currentCount: 0, currentPaused: false };
    return weekStreak(workouts, settings.weeklyGoal, settings.pausedWeeks, new Date(now));
  }, [now, settings.pausedWeeks, settings.weeklyGoal, workouts]);

  // Al llegar con «#datos» (desde Perfil) lleva la sección a la vista. Se usa la posición de maqueta:
  // `scrollIntoView` mediría las secciones aún desplazadas por su animación de entrada y se pasaría.
  useEffect(() => {
    if (!ready) return;
    const id = window.location.hash.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    let top = 0;
    for (let node: HTMLElement | null = target; node; node = node.offsetParent as HTMLElement | null) top += node.offsetTop;
    const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    window.scrollTo(0, Math.max(0, top - margin));
  }, [ready]);

  function togglePause(paused: boolean) {
    const start = weekRange(new Date()).start;
    const rest = settings.pausedWeeks.filter((week) => week !== start);
    update({ pausedWeeks: paused ? [...rest, start] : rest });
    show(paused ? "Racha en pausa esta semana" : "Racha reactivada");
  }

  return (
    <div className="page prof-settings">
      <PageHeader backHref="/perfil" meta="Perfil" title="Ajustes" subtitle="Apariencia, entrenamiento, avisos, racha y tus datos." />
      {ready ? (
        <div className="prof-settings-grid">
          <div className="prof-settings-col">
            <AppearanceSection settings={settings} identity={identity} update={update} order={0} />
            <TrainingSection settings={settings} update={update} order={1} />
          </div>
          <div className="prof-settings-col">
            <NotificationsSection onToast={show} order={2} />
            <StreakSection streak={streak.streak} currentCount={streak.currentCount} weeklyGoal={settings.weeklyGoal} paused={streak.currentPaused} onTogglePause={togglePause} order={3} />
            <DataSection workouts={workouts} onToast={show} order={4} />
            <AboutSection order={5} />
          </div>
        </div>
      ) : (
        <div className="prof-settings-grid" aria-busy="true">
          <div className="prof-skeleton prof-skeleton-group" />
          <div className="prof-skeleton prof-skeleton-group" />
        </div>
      )}
      <Toast toast={toast} />
    </div>
  );
}
