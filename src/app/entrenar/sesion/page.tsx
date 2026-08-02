"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ChevronLeft, Clock3, HeartPulse, Pause, Play, Plus, X } from "lucide-react";
import { exercises } from "@/data/mock-data";
import { PrimaryButton, ProgressBar, ProgressRing, SecondaryButton } from "@/components/ui";

export default function ActiveSessionPage() {
  return <Suspense fallback={<div className="session-page" />}><ActiveSession /></Suspense>;
}

function ActiveSession() {
  const searchParams = useSearchParams();
  const shortMode = searchParams.get("corta") === "true";
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setNumber, setSetNumber] = useState(1);
  const [seconds, setSeconds] = useState(0);
  const [resting, setResting] = useState(false);
  const [restDuration, setRestDuration] = useState(45);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [painOpen, setPainOpen] = useState(false);
  const activeExercises = shortMode ? exercises.slice(0, 3).map((item) => ({ ...item, sets: 2 })) : exercises;
  const exercise = activeExercises[exerciseIndex];
  const totalSteps = activeExercises.reduce((sum, item) => sum + item.sets, 0);
  const completedSteps = activeExercises.slice(0, exerciseIndex).reduce((sum, item) => sum + item.sets, 0) + setNumber - 1;

  useEffect(() => {
    if (paused || finished) return;
    const timer = window.setInterval(() => setSeconds((value) => {
      if (!resting) return value + 1;
      if (value <= 1) {
        setResting(false);
        return 0;
      }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [paused, resting, finished]);

  function completeSet() {
    if (setNumber < exercise.sets) {
      const duration = shortMode ? 30 : 45;
      setSetNumber((value) => value + 1); setRestDuration(duration); setResting(true); setSeconds(duration);
    } else if (exerciseIndex < activeExercises.length - 1) {
      const duration = shortMode ? 30 : 60;
      setExerciseIndex((value) => value + 1); setSetNumber(1); setRestDuration(duration); setResting(true); setSeconds(duration);
    } else setFinished(true);
  }

  if (finished) return <div className="session-page session-finished"><div className="finish-mark"><Check size={35} /></div><p>SESIÓN COMPLETADA</p><h1>Muy buen trabajo.</h1><span>Terminaste {activeExercises.length} ejercicios y sumaste movimiento a tu semana.</span><div className="finish-stats"><div><strong>{shortMode ? "10 min" : "20 min"}</strong><small>duración estimada</small></div><div><strong>{totalSteps}</strong><small>series</small></div></div><Link href="/" className="button button-primary">Volver a Hoy</Link></div>;

  return (
    <div className="session-page">
      <header className="session-header"><Link href="/entrenar" className="icon-button" aria-label="Cerrar sesión"><X size={20} /></Link><span>FUERZA EN CASA{shortMode ? " · 10 MIN" : ""}</span><button className="icon-button" onClick={() => setPaused(!paused)} aria-label={paused ? "Reanudar" : "Pausar"}>{paused ? <Play size={19} /> : <Pause size={19} />}</button></header>
      <ProgressBar value={(completedSteps / totalSteps) * 100} />
      <div className="session-progress-label"><span>Ejercicio {exerciseIndex + 1} de {activeExercises.length}</span><span>{Math.round((completedSteps / totalSteps) * 100)}%</span></div>
      <section className="active-exercise">
        <p>{resting ? "DESCANSO" : `SERIE ${setNumber} DE ${exercise.sets}`}</p>
        <h1>{resting ? "Recupera el aire" : exercise.name}</h1>
        <span>{resting ? `Después: ${exercise.name}` : exercise.muscle}</span>
        <div className="active-visual"><div className="pulse-orbit" /><DumbbellFigure /></div>
        <ProgressRing value={resting ? ((restDuration - Math.min(seconds, restDuration)) / restDuration) * 100 : 72} size={148}>
          {resting ? <><strong>{seconds}</strong><small>segundos</small></> : <><strong>{exercise.target.split(" ")[0]}</strong><small>{exercise.target.includes("segundos") ? "segundos" : "repeticiones"}</small></>}
        </ProgressRing>
      </section>
      <section className="session-controls">
        {resting ? <PrimaryButton onClick={() => { setResting(false); setSeconds(0); }}>Omitir descanso <ChevronLeft className="flip" size={18} /></PrimaryButton> : <PrimaryButton onClick={completeSet}><Check size={19} /> Serie completada</PrimaryButton>}
        <div className="secondary-actions"><SecondaryButton onClick={() => { setRestDuration(30); setResting(true); setSeconds(30); }}><Plus size={17} /> Descanso</SecondaryButton><SecondaryButton onClick={() => { setPainOpen(true); setPaused(true); }}><HeartPulse size={17} /> Informar dolor</SecondaryButton></div>
      </section>
      <footer className="next-exercise"><div><small>PRÓXIMO</small><strong>{activeExercises[exerciseIndex + 1]?.name ?? "Sesión completa"}</strong></div><Clock3 size={18} /></footer>
      {paused && <div className="pause-overlay"><Pause size={30} /><h2>Sesión en pausa</h2><p>Tómate el tiempo que necesites.</p><PrimaryButton onClick={() => setPaused(false)}><Play size={18} /> Continuar</PrimaryButton><Link href="/entrenar">Cerrar sesión</Link></div>}
      {painOpen && <div className="pause-overlay safety-overlay"><HeartPulse size={34} /><h2>Tu seguridad primero</h2><p>Detén el ejercicio. Si el dolor es intenso, repentino o no mejora, no continúes y busca orientación profesional.</p><PrimaryButton onClick={() => { setPainOpen(false); setPaused(false); }}>Estoy bien, continuar</PrimaryButton><Link href="/entrenar">Finalizar entrenamiento</Link></div>}
    </div>
  );
}

function DumbbellFigure() {
  return <div className="active-figure" aria-hidden="true"><span className="head" /><span className="torso" /><span className="arm left" /><span className="arm right" /><span className="leg left" /><span className="leg right" /></div>;
}
