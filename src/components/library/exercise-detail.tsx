"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, Check, ListPlus, Lock, Play } from "lucide-react";
import { categoryLabels, levelLabels, patternLabels } from "@/data/catalog";
import { Button, NumberMetric, SegmentedControl } from "@/components/ui";
import { ExerciseTechnique, equipmentText } from "@/components/exercises/exercise-technique";
import { ExerciseVisual } from "@/components/exercises/exercise-visual";
import { AddToRoutineSheet } from "@/components/library/add-to-routine-sheet";
import { ExerciseAlternatives } from "@/components/library/exercise-alternatives";
import { ExerciseProgress } from "@/components/library/exercise-progress";
import { FavoriteButton } from "@/components/library/favorite-button";
import { availableEquipment, isAvailable } from "@/lib/generator";
import { useStartWorkout } from "@/lib/session";
import { progressedSets } from "@/lib/progression";
import { exerciseById, lastRecordFor } from "@/lib/training";
import { useDraft, usePreference, useWorkouts } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/types";

type Tab = "technique" | "progress" | "alternatives";

const tabs: Array<{ value: Tab; label: string }> = [
  { value: "technique", label: "Técnica" },
  { value: "progress", label: "Mi progreso" },
  { value: "alternatives", label: "Alternativas" },
];

export function ExerciseDetail({ exerciseId }: { exerciseId: number }) {
  const exercise = exerciseById(exerciseId);
  if (!exercise) return null;
  return <Detail key={exercise.id} exercise={exercise} />;
}

function Detail({ exercise }: { exercise: Exercise }) {
  const [tab, setTab] = useState<Tab>("technique");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const [workouts] = useWorkouts();
  const [draft] = useDraft();
  const [preference] = usePreference();
  const start = useStartWorkout();
  const available = isAvailable(exercise, availableEquipment(preference));
  const hasPhoto = Boolean(exercise.image);

  const startNow = () => {
    start({
      name: exercise.name,
      records: [{
        exerciseId: exercise.id,
        unit: exercise.unit,
        sets: progressedSets(exercise, exercise.sets, lastRecordFor(workouts, exercise.id)),
      }],
      source: { type: "free" },
    });
  };

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

  const added = (routineName: string) => {
    setSheetOpen(false);
    showToast(`Agregado a ${routineName}`);
  };

  const [low, high] = exercise.range;
  const perSide = exercise.unilateral ? " por lado" : "";

  // Las mismas acciones viven en línea (escritorio) y en la barra fija sobre la navegación (móvil).
  const actions = (docked: boolean) => (
    <>
      <Button size={docked ? "m" : "l"} className="lib-act-start" onClick={startNow}>
        <Play size={17} fill="currentColor" aria-hidden="true" />
        Entrenar ahora
      </Button>
      <Button variant={docked ? "glass" : "secondary"} size={docked ? "m" : "l"} className="lib-act-add" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
        <ListPlus size={18} aria-hidden="true" className="lib-act-icon" />
        Agregar a rutina
      </Button>
    </>
  );

  return (
    <div className={cn("page lib-detail", draft && "lib-detail-draft")}>
      <header className={cn("lib-hero on-dark grain", hasPhoto ? "lib-hero-photo" : "lib-hero-ill atmosphere")}>
        <div className="lib-hero-media">
          <ExerciseVisual exercise={exercise} size="immersive" eager />
        </div>
        {hasPhoto && <span className="lib-hero-shade" aria-hidden="true" />}
        <div className="lib-hero-bar">
          <Link href="/ejercicios" className="icon-button glass" aria-label="Volver a Ejercicios">
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <FavoriteButton exercise={exercise} variant="glass" size={20} />
        </div>
        <div className="lib-hero-body">
          <p className="meta lib-hero-meta">{exercise.muscle} · {patternLabels[exercise.pattern]}</p>
          <h1>{exercise.name}</h1>
          <ul className="lib-hero-tags" aria-label="Características">
            <li className="photo-tag glass">{categoryLabels[exercise.category]}</li>
            <li className="photo-tag glass">{levelLabels[exercise.level]}</li>
            <li className={cn("photo-tag glass lib-hero-equip", !available && "is-locked")}>
              {available ? <Check size={13} strokeWidth={2.6} aria-hidden="true" /> : <Lock size={12} aria-hidden="true" />}
              {equipmentText(exercise)}
              <span className="sr-only">{available ? ", disponible con tu equipo" : ", requiere equipo que no tienes marcado"}</span>
            </li>
          </ul>
        </div>
      </header>

      <div className="lib-detail-main">
        <section className="lib-brief" aria-labelledby="lib-target-title">
          <h2 id="lib-target-title" className="meta">Objetivo recomendado</h2>
          <div className="lib-target">
            <NumberMetric size="l" value={exercise.sets} label={exercise.sets === 1 ? "serie" : "series"} />
            <span className="lib-target-x" aria-hidden="true">×</span>
            <NumberMetric
              size="l"
              value={low === high ? low : <>{low}<span className="lib-target-dash">–</span>{high}</>}
              unit={exercise.unit === "seconds" ? "s" : undefined}
              label={`${exercise.unit === "reps" ? "repeticiones" : "segundos"}${perSide}`}
            />
          </div>
          <p className="lib-benefit">{exercise.benefit}</p>
        </section>

        <div className="lib-actions">{actions(false)}</div>

        <div className="lib-tabs">
          <SegmentedControl<Tab> label="Secciones del ejercicio" options={tabs} value={tab} onChange={setTab} />
        </div>

        <section key={tab} className="lib-panel rise" role="tabpanel" aria-label={tabs.find((item) => item.value === tab)?.label}>
          {tab === "technique" && <ExerciseTechnique exercise={exercise} showVisual={hasPhoto} showBenefit={false} />}
          {tab === "progress" && <ExerciseProgress exercise={exercise} onStart={startNow} />}
          {tab === "alternatives" && <ExerciseAlternatives exercise={exercise} />}
        </section>
      </div>

      <div className="lib-dock on-dark">{actions(true)}</div>

      <AddToRoutineSheet exercise={exercise} open={sheetOpen} onClose={() => setSheetOpen(false)} onAdded={added} />
      {toast && (
        <div className="toast lib-toast" role="status">
          <Check size={16} aria-hidden="true" />
          {toast}
        </div>
      )}
    </div>
  );
}
