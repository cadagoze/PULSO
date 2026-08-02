"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, ChevronRight, Clock3, Dumbbell, Flame, X } from "lucide-react";
import { exercises, weekDays } from "@/data/mock-data";
import { PageHeader, ProgressBar, SectionHeader, StatusBadge } from "@/components/ui";
import type { Exercise } from "@/types";

export default function TrainingPage() {
  const [selected, setSelected] = useState(4);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  return (
    <div className="page-stack">
      <PageHeader eyebrow="SEMANA 31" title="Entrenamiento" subtitle="Constancia antes que perfección." />
      <section className="week-picker" aria-label="Seleccionar día">{weekDays.map((day, index) => <button key={`${day.short}-${day.number}`} onClick={() => setSelected(index)} className={selected === index ? "selected" : ""} aria-pressed={selected === index}><span>{day.short}</span><strong>{day.number}</strong>{day.status === "done" && <i><Check size={10} /></i>}</button>)}</section>
      <section className="session-overview">
        <div className="session-top"><div><StatusBadge>HOY · FUERZA</StatusBadge><h2>{selected === 4 ? "Fuerza en casa" : selected < 4 ? "Sesión completada" : "Recuperación activa"}</h2><p>Una sesión completa y accesible para trabajar todo el cuerpo.</p></div><div className="session-score"><Flame size={22} /><strong>67%</strong><span>semana</span></div></div>
        <div className="session-stats"><span><Clock3 size={17} /><strong>20</strong><small>minutos</small></span><span><Dumbbell size={17} /><strong>5</strong><small>ejercicios</small></span><span><strong>3</strong><small>series</small></span></div>
        <ProgressBar value={0} />
      </section>
      <section><SectionHeader title="Tu sesión" action="Cómo funciona" href="/guia" /><div className="exercise-list">{exercises.map((exercise, index) => <article className="exercise-row" key={exercise.id}><span className="exercise-number">{String(index + 1).padStart(2, "0")}</span><div className={`exercise-thumb exercise-thumb-${index + 1}`}><Dumbbell size={20} /></div><div className="exercise-copy"><h3>{exercise.name}</h3><p>{exercise.sets} series · {exercise.target}</p><span>{exercise.muscle}</span></div><button className="icon-button" onClick={() => setSelectedExercise(exercise)} aria-label={`Ver ${exercise.name}`}><ChevronRight size={18} /></button></article>)}</div></section>
      <div className="sticky-action"><Link href="/entrenar/sesion" className="button button-primary">Comenzar entrenamiento <ArrowRight size={18} /></Link></div>
      {selectedExercise && <div className="modal-backdrop" onMouseDown={() => setSelectedExercise(null)}><section className="sheet-modal exercise-modal" role="dialog" aria-modal="true" aria-labelledby="exercise-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-handle" /><header><div><span>DETALLE DEL EJERCICIO</span><h2 id="exercise-title">{selectedExercise.name}</h2></div><button className="icon-button" onClick={() => setSelectedExercise(null)} aria-label="Cerrar"><X size={20} /></button></header><div className="exercise-detail"><Dumbbell size={28} /><p><strong>{selectedExercise.sets} series de {selectedExercise.target}</strong><span>Trabaja {selectedExercise.muscle.toLowerCase()}. Mantén un ritmo controlado y detente si sientes dolor.</span></p></div><Link href="/entrenar/sesion" className="button button-primary">Comenzar sesión <ArrowRight size={18} /></Link></section></div>}
    </div>
  );
}
