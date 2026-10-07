"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { useDraft, useRoutines, useSettings } from "@/lib/store";
import { newId } from "@/lib/training";
import { useNow } from "@/lib/use-now";
import { cn, weekNumber } from "@/lib/utils";
import { PlaceChip } from "@/components/train/place-picker";
import { RoutineEditor } from "@/components/train/routine-editor";
import type { Routine } from "@/components/train/routines-section";
import { TodayCard } from "@/components/train/today-card";
import { TodayExercises } from "@/components/train/today-exercises";
import { useActiveProgram, useTodayPlan } from "@/components/train/today-plan";
import type { TodaySource } from "@/components/train/today-plan";
import { AdjustSheet } from "@/components/train/today-sheets";
import { TrainMore } from "@/components/train/train-more";
import { Toast, useToast } from "@/components/ui/toast";
import { ZoneRow } from "@/components/train/zone-picker";

const weekday = new Intl.DateTimeFormat("es-CL", { weekday: "long" });

/**
 * Entrenar, enfocado en el entreno de hoy: la sesión con sus ejercicios y el botón para empezar a la
 * vista. Lugar y equipamiento van en un chip; programas, rutinas, biblioteca, herramientas y el
 * avance de la semana quedan plegados al final.
 */
export function TrainHub() {
  const now = useNow();
  const ready = now !== 0;
  const params = useSearchParams();
  // Enlaces antiguos: `?tab=programas|rutinas|herramientas` o `#objetivo` abren su panel al final.
  const [initialPanel] = useState(() => params.get("tab") ?? (typeof window === "undefined" ? null : window.location.hash.slice(1) || null));
  const [draft] = useDraft();
  const [, setRoutines] = useRoutines();
  const [settings] = useSettings();
  const today = useTodayPlan(now, params.get("zona"));
  const active = useActiveProgram();
  const toast = useToast();

  // Con ?zona=… (desde la biblioteca) se muestra directo la rutina a tu medida de esa zona.
  const [picked, setPicked] = useState<TodaySource | null>(() => (params.get("zona") ? "custom" : null));
  const [listOpen, setListOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [editor, setEditor] = useState<{ routine: Routine; isNew: boolean; open: boolean; key: number } | null>(null);

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
      <PageHeader meta={`Semana ${weekNumber(date)} · ${weekday.format(date)}`} title="Entrenar" actions={<PlaceChip />} />
      <TodayCard
        now={now}
        source={source}
        sources={sources}
        onSource={setPicked}
        today={today}
        active={active}
        listOpen={listOpen}
        onToggleList={() => setListOpen((value) => !value)}
        onAdjust={() => setAdjustOpen(true)}
        notify={toast.show}
      />
      <ZoneRow
        value={today.zone}
        onChange={(zone) => {
          today.setZone(zone);
          if (zone) setPicked("custom");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
      <div className="train-extra">
        <TodayExercises source={source} today={today} active={active} visible={listOpen} onSaveRoutine={saveToday} />
      </div>
      <TrainMore now={now} initial={initialPanel} onCreate={createRoutine} onEdit={(routine) => openEditor(routine, false)} notify={toast.show} />

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
      <PageHeader meta=" " title="Entrenar" />
      <div className="train-hero-slot">
        <div className="train-skeleton train-skeleton-hero" />
      </div>
    </div>
  );
}
