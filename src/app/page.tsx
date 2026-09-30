"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowRight, Check, Dumbbell } from "lucide-react";
import { WellnessAssessment, type AssessmentProfile } from "@/components/onboarding/wellness-assessment";
import { usePersistentState } from "@/lib/use-persistent-state";
import { defaultRoutine, completedSets } from "@/lib/training";
import { currentWeekDays, formatLongDate, workoutsThisWeek } from "@/lib/utils";
import { exercises } from "@/data/mock-data";
import type { TrainingDraft, TrainingRoutine, WorkoutEntry } from "@/types";

export default function Home() {
  const [profile,setProfile] = usePersistentState<AssessmentProfile|null>("pulso:assessment",null);
  const [routine] = usePersistentState<TrainingRoutine>("pulso:routine",defaultRoutine);
  const [draft] = usePersistentState<TrainingDraft|null>("pulso:active-workout",null);
  const [workouts] = usePersistentState<WorkoutEntry[]>("pulso:workouts",[]);
  const [assessment,setAssessment] = useState(false);
  const week = workoutsThisWeek(workouts);
  const days = currentWeekDays(workouts);
  const target = routine.days.length;
  const activeDays = new Set(week.map((workout) => workout.date)).size;
  const latest = [...workouts].sort((a,b) => b.completedAt.localeCompare(a.completedAt))[0];
  if (!profile || assessment) return <WellnessAssessment onComplete={(value) => {setProfile(value);setAssessment(false);}} onCancel={profile ? () => setAssessment(false) : undefined}/>;
  return <div className="page-stack training-home"><header className="home-header"><div className="wordmark">PULSO<span>.</span></div><button className="button button-secondary" onClick={() => setAssessment(true)}>Mi evaluación</button></header><section className="training-hero"><div><small>{formatLongDate()}</small><h1>Tu próximo paso.<br/><em>Más movimiento.</em></h1><p>Tu salud en movimiento. Planifica, entrena y registra tu avance, serie a serie.</p><Link href={draft ? "/entrenar/sesion" : "/entrenar"} className="button button-primary">{draft ? "Retomar mi entrenamiento" : "Preparar mi entrenamiento"}<ArrowRight size={18}/></Link></div><Image src="/images/pulso-strength-at-home.png" alt="Sentadilla hacia una silla como parte del entrenamiento en casa" width={640} height={640} priority/></section>
    {draft && <aside className="tracker-banner"><div><strong>Entrenamiento en curso</strong><p>{draft.name} · {completedSets(draft.records)} series registradas. Puedes continuar donde quedaste.</p></div><Link href="/entrenar/sesion">Retomar →</Link></aside>}
    <div className="tracker-stats"><span><b>{activeDays}/{target}</b>días activos esta semana</span><span><b>{week.reduce((sum,item) => sum+item.sets,0)}</b>series realizadas</span><span><b>{Math.round(week.reduce((sum,item) => sum+item.durationMinutes,0))}</b>minutos registrados</span></div>
    <section className="tracker-panel"><div className="tracker-heading"><div><small>CONSTANCIA, A TU RITMO</small><h2>Tu semana de entrenamiento</h2></div><Link href="/entrenar">Editar plan →</Link></div><div className="training-calendar">{days.map((day,index) => <div key={day.date} className={day.status === "done" ? "done" : routine.days.includes(index) ? "planned" : ""}><span>{day.short}</span><b>{day.number}</b><small>{day.status === "done" ? <Check size={16}/> : routine.days.includes(index) ? "Entrenar" : "Libre"}</small></div>)}</div><p className="tracker-help">Los días marcados siguen tu rutina. Las sesiones realizadas aparecen con un check.</p></section>
    <div className="training-home-grid"><section className="tracker-panel"><small>TU RUTINA</small><h2>{routine.name}</h2><p>{routine.records.length} ejercicios · Descanso de {routine.restSeconds} segundos</p><ul className="routine-preview">{routine.records.map((record) => <li key={record.exerciseId}><Dumbbell size={16}/><span>{exercises.find((item) => item.id === record.exerciseId)?.name}</span><b>{record.sets.length} series</b></li>)}</ul><Link href={draft ? "/entrenar/sesion" : "/entrenar/sesion?rutina=true"} className="button button-primary">{draft ? "Continuar sesión" : "Comenzar rutina"}</Link></section><section className="tracker-panel"><small>ÚLTIMA ACTIVIDAD</small><h2>{latest ? latest.name ?? "Entrenamiento registrado" : "Tu primer registro te espera"}</h2><p>{latest ? `${latest.date} · ${latest.sets} series · ${latest.durationMinutes} min` : "Al finalizar tu entrenamiento, aquí aparecerá tu última sesión con sus resultados."}</p><Link href="/progreso" className="button button-secondary">Consultar historial</Link><hr/><h3>Aprende antes de empezar</h3><p>Encuentra imágenes, posición inicial y claves de ejecución para los cinco ejercicios de tu biblioteca.</p><Link href="/entrenar#biblioteca">Explorar ejercicios →</Link></section></div>
  </div>;
}
