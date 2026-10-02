"use client";

import { useEffect, useMemo } from "react";
import { PageHeader } from "@/components/ui";
import { weekRange, weekStreak } from "@/lib/analytics";
import { useSettings, useWorkouts } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { AboutSection } from "./about-section";
import { AppearanceSection } from "./appearance-section";
import { DataSection } from "./data-section";
import { StreakSection } from "./streak-section";
import { Toast, useToast } from "./toast";
import { TrainingSection } from "./training-section";

/** Ajustes: apariencia, entrenamiento, racha, datos y acerca de, en grupos editoriales. */
export function SettingsView() {
  const [settings, update] = useSettings();
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
      <PageHeader backHref="/perfil" meta="Perfil" title="Ajustes" subtitle="Tus preferencias y tus datos viven en este dispositivo." />
      {ready ? (
        <div className="prof-settings-grid">
          <div className="prof-settings-col">
            <AppearanceSection theme={settings.theme} onChange={(theme) => update({ theme })} order={0} />
            <TrainingSection settings={settings} update={update} order={1} />
          </div>
          <div className="prof-settings-col">
            <StreakSection streak={streak.streak} currentCount={streak.currentCount} weeklyGoal={settings.weeklyGoal} paused={streak.currentPaused} onTogglePause={togglePause} order={2} />
            <DataSection workouts={workouts} onToast={show} order={3} />
            <AboutSection order={4} />
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
