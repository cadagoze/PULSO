"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Zap } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { useDraft, useRoutines, useSettings } from "@/lib/store";
import { newId } from "@/lib/training";
import { useNow } from "@/lib/use-now";
import { cn, weekNumber } from "@/lib/utils";
import { PlacePicker } from "@/components/train/place-picker";
import { RoutineEditor } from "@/components/train/routine-editor";
import { RoutinesSection } from "@/components/train/routines-section";
import type { Routine } from "@/components/train/routines-section";
import { SuggestedRoutines } from "@/components/train/suggested-routines";
import { TodayCard } from "@/components/train/today-card";
import { TodayExercises } from "@/components/train/today-exercises";
import { useActiveProgram, useTodayPlan } from "@/components/train/today-plan";
import type { TodaySource } from "@/components/train/today-plan";
import { AdjustSheet } from "@/components/train/today-sheets";
import { ToolsRow } from "@/components/train/tools-row";
import { useMediaQuery } from "@/components/train/shared";
import { Toast, useToast } from "@/components/ui/toast";

/** Enlaces antiguos a las pestañas (`?tab=`): ahora llevan a su sección dentro de la misma pantalla. */
const tabSections: Record<string, string> = { rutinas: "rutinas", programas: "programas", herramientas: "herramientas" };

const weekday = new Intl.DateTimeFormat("es-CL", { weekday: "long" });

/**
 * Entrenar en un solo recorrido: dónde entrenas y con qué, tu rutina de hoy (la misma que en Inicio),
 * rutinas sugeridas, tus rutinas y herramientas.
 */
export function TrainHub() {
  const now = useNow();
  const ready = now !== 0;
  const params = useSearchParams();
  const tab = params.get("tab");
  const [draft] = useDraft();
  const [, setRoutines] = useRoutines();
  const [settings] = useSettings();
  const today = useTodayPlan(now);
  const active = useActiveProgram();
  const wide = useMediaQuery("(min-width: 1024px)");
  const toast = useToast();

  const [picked, setPicked] = useState<TodaySource | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [editor, setEditor] = useState<{ routine: Routine; isNew: boolean; open: boolean; key: number } | null>(null);

  // Al llegar desde un enlace con `?tab=`, se desplaza a esa sección cuando ya hay contenido.
  useEffect(() => {
    const id = tab ? tabSections[tab] : undefined;
    if (!ready || !id) return;
    const frame = window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    return () => window.cancelAnimationFrame(frame);
  }, [ready, tab]);

  if (!ready) return <TrainSkeleton />;

  // Orden por defecto, igual que la portada de Inicio: a medias, programa con sesión pendiente, a tu medida.
  const sources: TodaySource[] = [...(draft ? ["draft" as const] : []), ...(active ? ["program" as const] : []), "custom"];
  const preferred: TodaySource = draft ? "draft" : active?.next ? "program" : "custom";
  const source = picked && sources.includes(picked) ? picked : preferred;

  function openEditor(routine: Routine, isNew: boolean) {
    setEditor((current) => ({ routine, isNew, open: true, key: (current?.key ?? 0) + 1 }));
  }

  function createRoutine() {
    openEditor({ id: newId("rutina"), name: "", days: [], restSeconds: settings.defaultRest, records: [] }, true);
  }

  function saveRoutine(routine: Routine) {
    setRoutines((current) => current.some((item) => item.id === routine.id)
      ? current.map((item) => (item.id === routine.id ? routine : item))
      : [...current, routine]);
    setEditor((current) => (current ? { ...current, open: false } : null));
    toast.show("Rutina guardada");
  }

  function saveToday() {
    setRoutines((current) => [
      ...current,
      { id: newId("rutina"), name: today.name, days: [], restSeconds: today.restSeconds, records: today.fullRecords, updatedAt: new Date().toISOString() },
    ]);
    toast.show("Guardada en tus rutinas");
  }

  const date = new Date(now);

  return (
    <div className={cn("page train-page", draft && "has-resume")}>
      <PageHeader meta={`Semana ${weekNumber(date)} · ${weekday.format(date)}`} title="Entrenar" subtitle="Entrenamiento que se adapta a tu vida." />
      <PlacePicker />
      <TodayCard
        now={now}
        source={source}
        sources={sources}
        onSource={setPicked}
        today={today}
        active={active}
        listOpen={wide ? null : listOpen}
        onToggleList={() => setListOpen((value) => !value)}
        onAdjust={() => setAdjustOpen(true)}
        notify={toast.show}
      />
      <div className="train-extra">
        <TodayExercises source={source} today={today} active={active} visible={wide || listOpen} onSaveRoutine={saveToday} />
        {!today.readiness && (
          <Link href="/" className="train-hint">
            <span className="train-hint-icon" aria-hidden="true"><Zap size={15} /></span>
            <span className="grow">¿Cómo llegas hoy? Haz el chequeo en Inicio y ajustamos tu rutina.</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
      </div>
      <div className="train-more">
        <SuggestedRoutines onCreate={createRoutine} />
        <RoutinesSection onCreate={createRoutine} onEdit={(routine) => openEditor(routine, false)} notify={toast.show} />
        <ToolsRow />
      </div>

      <AdjustSheet open={adjustOpen} onClose={() => setAdjustOpen(false)} today={today} />
      {editor && (
        <RoutineEditor
          key={`editor-${editor.key}`}
          open={editor.open}
          routine={editor.routine}
          isNew={editor.isNew}
          onClose={() => setEditor((current) => (current ? { ...current, open: false } : null))}
          onSave={saveRoutine}
        />
      )}
      <Toast toast={toast.toast} className={cn("train-toast", draft && "is-raised")} />
    </div>
  );
}

/** Esqueleto mientras se hidrata (evita que el control de lugar salte de Casa a Gimnasio). */
export function TrainSkeleton() {
  return (
    <div className="page train-page" aria-busy="true">
      <PageHeader meta=" " title="Entrenar" subtitle="Entrenamiento que se adapta a tu vida." />
      <div className="train-place">
        <div className="train-skeleton train-skeleton-segmented" />
        <div className="train-skeleton train-skeleton-chips" />
      </div>
      <div className="train-hero-slot">
        <div className="train-skeleton train-skeleton-hero" />
      </div>
    </div>
  );
}
