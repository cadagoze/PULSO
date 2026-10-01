"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, Check, ListPlus, Play, Target } from "lucide-react";
import { categoryLabels, levelLabels, patternLabels } from "@/data/catalog";
import { Segmented } from "@/components/ui";
import { ExerciseTechnique, equipmentText, targetText } from "@/components/exercises/exercise-technique";
import { AddToRoutineSheet } from "@/components/library/add-to-routine-sheet";
import { ExerciseAlternatives } from "@/components/library/exercise-alternatives";
import { ExerciseProgress } from "@/components/library/exercise-progress";
import { FavoriteButton } from "@/components/library/favorite-button";
import { ExerciseVisual } from "@/components/exercises/exercise-visual";
import { useStartWorkout } from "@/lib/session";
import { progressedSets } from "@/lib/progression";
import { exerciseById, lastRecordFor } from "@/lib/training";
import { useDraft, useWorkouts } from "@/lib/store";
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
  const start = useStartWorkout();

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

  return (
    <div className={cn("page lib-detail", draft && "lib-detail-draft")}>
      <Link href="/ejercicios" className="lib-back">
        <ArrowLeft size={18} aria-hidden="true" />
        Ejercicios
      </Link>

      <header className="lib-hero">
        <ExerciseVisual exercise={exercise} size="hero" eager className="lib-hero-visual" />
        <div className="lib-hero-info">
          <div className="lib-hero-title">
            <div>
              <p className="eyebrow">{exercise.muscle}</p>
              <h1>{exercise.name}</h1>
            </div>
            <FavoriteButton exercise={exercise} className="lib-hero-fav" size={20} />
          </div>
          <div className="lib-badges">
            <span className="badge">{categoryLabels[exercise.category]}</span>
            <span className="badge badge-muted">{patternLabels[exercise.pattern]}</span>
            <span className="badge badge-muted">{levelLabels[exercise.level]}</span>
            <span className="badge badge-muted">{equipmentText(exercise)}</span>
          </div>
          <p className="lib-hero-benefit">{exercise.benefit}</p>
          <div className="lib-actions">
            <button type="button" className="btn btn-primary" onClick={startNow}>
              <Play size={18} aria-hidden="true" />
              Entrenar ahora
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setSheetOpen(true)}>
              <ListPlus size={18} aria-hidden="true" />
              Agregar a rutina
            </button>
          </div>
        </div>
      </header>

      <div className="lib-tabs">
        <Segmented<Tab> label="Secciones del ejercicio" options={tabs} value={tab} onChange={setTab} />
      </div>

      <section className="lib-panel" role="tabpanel" aria-label={tabs.find((item) => item.value === tab)?.label}>
        {tab === "technique" && (
          <div className="lib-technique">
            <aside className="lib-target">
              <Target size={18} aria-hidden="true" />
              <div>
                <p className="eyebrow">Objetivo recomendado</p>
                <p className="num">{targetText(exercise)}</p>
              </div>
            </aside>
            <ExerciseTechnique exercise={exercise} showVisual={false} />
          </div>
        )}
        {tab === "progress" && <ExerciseProgress exercise={exercise} onStart={startNow} />}
        {tab === "alternatives" && <ExerciseAlternatives exercise={exercise} />}
      </section>

      <AddToRoutineSheet exercise={exercise} open={sheetOpen} onClose={() => setSheetOpen(false)} onAdded={added} />
      {toast && (
        <div className="toast" role="status">
          <Check size={16} aria-hidden="true" />
          {toast}
        </div>
      )}
    </div>
  );
}
