"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronRight, Clock3, Dumbbell, Flame, X } from "lucide-react";
import { exercises } from "@/data/mock-data";
import { PageHeader, ProgressBar, SectionHeader, StatusBadge } from "@/components/ui";
import type { Exercise, ReadinessEntry, WorkoutEntry, TrainingRoutine } from "@/types";
import { defaultRoutine } from "@/lib/training";
import { usePersistentState } from "@/lib/use-persistent-state";
import { localDateKey, weekNumber, workoutsThisWeek } from "@/lib/utils";
import type { AssessmentProfile } from "@/components/onboarding/wellness-assessment";
import { ExerciseTechnique } from "@/components/training/exercise-technique";
import { ReadinessCheckIn } from "@/components/training/readiness-check-in";
import { RoutinePlanner } from "@/components/training/routine-planner";

export default function TrainingPage() {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [filter, setFilter] = useState("Todos");
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!selectedExercise) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedExercise(null);
      if (event.key === "Tab") {
        const controls = document.querySelectorAll<HTMLElement>('.exercise-modal button, .exercise-modal a[href]');
        const first = controls[0]; const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", onKey); previous?.focus(); };
  }, [selectedExercise]);
  const [profile] = usePersistentState<AssessmentProfile | null>("pulso:assessment", null);
  const [workouts] = usePersistentState<WorkoutEntry[]>("pulso:workouts", []);
  const [readinessEntries] = usePersistentState<ReadinessEntry[]>("pulso:readiness", []);
  const [routine] = usePersistentState<TrainingRoutine>("pulso:routine", defaultRoutine);
  const weeklyTarget = routine.days.length;
  const completedThisWeek = workoutsThisWeek(workouts).length;
  const weeklyProgress = Math.min(100, Math.round((completedThisWeek / weeklyTarget) * 100));
  const readiness = readinessEntries.find((entry) => entry.date === localDateKey());
  const baseSessionMinutes = profile?.recommendation.sessionMinutes ?? 20;
  const shortMode = baseSessionMinutes === 10 || (readiness !== undefined && readiness.recommendation !== "planned");
  const sessionMinutes = shortMode ? 10 : baseSessionMinutes;
  const activeExercises = shortMode ? exercises.slice(0, 3).map((exercise) => ({ ...exercise, sets: 2 })) : exercises;
  const sessionHref = shortMode ? "/entrenar/sesion?corta=true" : "/entrenar/sesion";
  return (
    <div className="page-stack">
      <PageHeader eyebrow={`SEMANA ${weekNumber()}`} title="Entrenamiento" subtitle={`Tu objetivo: ${weeklyTarget} sesiones breves, con descanso entre días.`} />
      <ReadinessCheckIn />
      <RoutinePlanner />
      <section className="session-overview">
        <div className="session-top"><div><StatusBadge>SESIÓN SUGERIDA</StatusBadge><h2>{shortMode ? "Una sesión breve para hoy" : "Fuerza para tu día a día"}</h2><p>Esta opción se adapta a tu chequeo. Para seguir tus ejercicios personalizados, inicia la rutina de arriba.</p></div><div className="session-score"><Flame size={22} /><strong>{weeklyProgress}%</strong><span>del objetivo</span></div></div>
        <div className="session-stats"><span><Clock3 size={17} /><strong>{sessionMinutes}</strong><small>min estimados</small></span><span><Dumbbell size={17} /><strong>{activeExercises.length}</strong><small>ejercicios</small></span><span><strong>{completedThisWeek}/{weeklyTarget}</strong><small>sesiones</small></span></div>
        <ProgressBar value={weeklyProgress} />
      </section>
      <section className="exercise-library" id="biblioteca"><SectionHeader title="Aprende cada movimiento" action="Ver recomendaciones" href="/guia" /><p className="library-intro">Mira la posición, conoce la técnica y entrena a tu ritmo.</p><div className="exercise-filters" aria-label="Filtrar ejercicios">{["Todos", "Fuerza", "Cardio"].map((item) => <button key={item} onClick={() => setFilter(item)} aria-pressed={filter === item}>{item}</button>)}</div><div className="exercise-gallery">{exercises.filter((exercise) => filter === "Todos" || (filter === "Cardio" ? exercise.muscle === "Cardio" : exercise.muscle !== "Cardio")).map((exercise) => <button className="exercise-card" key={exercise.id} onClick={() => setSelectedExercise(exercise)} aria-label={`Ver demostración y técnica de ${exercise.name}`}><div className="exercise-card-image"><Image src={exercise.image} alt={exercise.imageAlt} fill sizes="(max-width: 640px) 92vw, (max-width: 1100px) 45vw, 360px" /><span>{exercise.muscle}</span><b>{String(exercise.id).padStart(2, "0")}</b></div><div className="exercise-card-copy"><small>{activeExercises.some((item) => item.id === exercise.id) ? "SESIÓN SUGERIDA" : "BIBLIOTECA DE MOVIMIENTOS"}</small><h3>{exercise.name}</h3><p>{exercise.benefit}</p><footer><span>{shortMode && exercise.id <= 3 ? 2 : exercise.sets} series · {exercise.target}</span><span>Ver técnica <ChevronRight size={16} /></span></footer></div></button>)}</div></section>
      <div className="sticky-action"><Link href={sessionHref} className="button button-primary">Iniciar sesión sugerida <ArrowRight size={18} /></Link></div>
      {selectedExercise && <div className="modal-backdrop" onMouseDown={() => setSelectedExercise(null)}><section className="sheet-modal exercise-modal technique-modal" role="dialog" aria-modal="true" aria-labelledby="exercise-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-handle" /><header><div><span>GUÍA PASO A PASO</span><h2 id="exercise-title">{selectedExercise.name}</h2><p>{selectedExercise.sets} series · {selectedExercise.target}</p></div><button ref={closeRef} className="icon-button" onClick={() => setSelectedExercise(null)} aria-label="Cerrar"><X size={20} /></button></header><ExerciseTechnique exercise={selectedExercise} /><Link href={sessionHref} className="button button-primary">Comenzar mi sesión <ArrowRight size={18} /></Link></section></div>}
    </div>
  );
}
