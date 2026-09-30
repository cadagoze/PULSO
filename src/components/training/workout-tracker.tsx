"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Timer } from "lucide-react";
import { exercises } from "@/data/mock-data";
import { usePersistentState } from "@/lib/use-persistent-state";
import { clockLabel, completedSets, defaultRecords, defaultRoutine, durationSeconds } from "@/lib/training";
import { localDateKey } from "@/lib/utils";
import { ExerciseDemo } from "./exercise-demo";
import { ExerciseTechnique } from "./exercise-technique";
import type { TrainingDraft, TrainingRoutine, WorkoutEntry } from "@/types";

export function WorkoutTracker() {
  const params = useSearchParams();
  const short = params.get("corta") === "true";
  const custom = params.get("rutina") === "true";
  const [routine] = usePersistentState<TrainingRoutine>("pulso:routine", defaultRoutine);
  const [draft,setDraft] = usePersistentState<TrainingDraft | null>("pulso:active-workout", null);
  const [workouts,setWorkouts] = usePersistentState<WorkoutEntry[]>("pulso:workouts", []);
  const [now,setNow] = useState(() => Date.now());
  const [saved,setSaved] = useState<WorkoutEntry | null>(null);
  const [error,setError] = useState("");
  const [finishOpen,setFinishOpen] = useState(false);
  const [effort,setEffort] = useState<WorkoutEntry["effort"]>(3);
  const [pain,setPain] = useState(false);
  const [timer,setTimer] = useState<{key:string; until:number; remaining:number} | null>(null);
  useEffect(() => { const interval = window.setInterval(() => setNow(Date.now()), 500); return () => window.clearInterval(interval); }, []);
  const displayNow = now || (draft?.runningSince ?? 0);
  function start() {
    const timestamp = Date.now(); setNow(timestamp);
    setDraft({ id:globalThis.crypto?.randomUUID?.() ?? `${timestamp}-${Math.random().toString(36).slice(2)}`, name:custom ? routine.name : short ? "Sesión breve" : "Fuerza en casa", records:(custom ? routine.records : defaultRecords(short)).map((record) => ({...record, sets:record.sets.map((set) => ({...set,done:false}))})), elapsedSeconds:0, runningSince:timestamp, restUntil:null, notes:"", restSeconds:custom ? routine.restSeconds : 45 });
  }
  function togglePause() {
    if (!draft) return;
    const time = Date.now();
    if (timer) setTimer(draft.runningSince === null ? {...timer,until:time + timer.remaining * 1000} : {...timer,remaining:Math.max(0,Math.ceil((timer.until-time)/1000))});
    setNow(time); setDraft({...draft,elapsedSeconds:durationSeconds(draft,time),runningSince:draft.runningSince === null ? time : null,restUntil:null});
  }
  function updateSet(recordIndex:number,setIndex:number,field:"value"|"load",value:number) {
    if (!draft) return;
    setDraft({...draft,records:draft.records.map((record,index) => index !== recordIndex ? record : {...record,sets:record.sets.map((set,i) => i !== setIndex ? set : {...set,[field]:value})})});
  }
  function checkSet(recordIndex:number,setIndex:number) {
    if (!draft) return;
    const record = draft.records[recordIndex]; const set = record.sets[setIndex];
    if (!set.done && (!Number.isFinite(set.value) || set.value <= 0 || set.value > (record.unit === "reps" ? 200 : 3600) || !Number.isFinite(set.load) || set.load < 0 || set.load > 500)) {setError("Revisa el registro: repeticiones 1–200, tiempo 1–3600 s y carga 0–500 kg.");return;}
    setError("");setTimer(null);setNow(Date.now());
    setDraft({...draft,restUntil:set.done ? null : Date.now()+draft.restSeconds*1000,records:draft.records.map((item,index) => index !== recordIndex ? item : {...item,sets:item.sets.map((row,i) => i !== setIndex ? row : {...row,done:!row.done})})});
  }
  function finish() {
    if (!draft || !completedSets(draft.records)) return;
    const time = Date.now();
    const records = draft.records.map((record) => ({...record,sets:record.sets.filter((set) => set.done)})).filter((record) => record.sets.length);
    const workout:WorkoutEntry = {id:draft.id,name:draft.name,date:localDateKey(),completedAt:new Date(time).toISOString(),durationMinutes:Math.round(durationSeconds(draft,time)/6)/10,exerciseCount:records.length,sets:completedSets(records),mode:short ? "short" : "full",records,notes:draft.notes,effort,feltPain:pain,feedbackAt:new Date(time).toISOString()};
    setWorkouts((items) => [workout,...items.filter((item) => item.id !== workout.id)]); setDraft(null); setSaved(workout); setFinishOpen(false);
  }
  if (saved) return <div className="session-page tracker-finished"><Check size={46}/><h1>Entrenamiento registrado</h1><p>{saved.name}</p><div className="tracker-stats"><span><b>{saved.sets}</b>series realizadas</span><span><b>{saved.durationMinutes}</b>minutos reales</span></div><p>El historial contiene sólo las series que marcaste como realizadas.</p><Link href="/progreso" className="button button-primary">Ver mi historial</Link><Link href="/">Volver al inicio</Link></div>;
  if (!draft) return <div className="session-page tracker-finished"><Timer size={40}/><h1>{custom ? routine.name : short ? "Tu sesión breve" : "Fuerza en casa"}</h1><p>Registra lo que realmente haces en cada serie. Las imágenes y la técnica te acompañan durante el entrenamiento.</p><p>El cronómetro comienza al pulsar el botón. Tu sesión se guarda automáticamente en este dispositivo.</p><button className="button button-primary" onClick={start}>Iniciar registro</button><Link href="/entrenar">Volver a ejercicios</Link></div>;
  const done = completedSets(draft.records); const total = draft.records.reduce((sum,record) => sum+record.sets.length,0);
  const rest = draft.restUntil ? Math.max(0,Math.ceil((draft.restUntil-displayNow)/1000)) : 0;
  return <div className="session-page tracker-session"><header className="tracker-toolbar"><Link href="/" onClick={() => setDraft({...draft,elapsedSeconds:durationSeconds(draft,Date.now()),runningSince:null,restUntil:null})}>Guardar y salir</Link><strong>{clockLabel(durationSeconds(draft,displayNow))}</strong><button className="button button-secondary" onClick={togglePause}>{draft.runningSince === null ? "Reanudar" : "Pausar"}</button></header><h1>{draft.name}</h1><p>{done} de {total} series realizadas · Guardado automático</p>
    {draft.runningSince === null && <aside className="tracker-banner" role="status">Sesión en pausa. Reanuda para continuar registrando.</aside>}
    {rest > 0 && <aside className="tracker-banner" role="status"><span>Descanso · <b>{rest} s</b></span><button onClick={() => setDraft({...draft,restUntil:Date.now()+(rest+30)*1000})}>+30 s</button><button onClick={() => setDraft({...draft,restUntil:null})}>Omitir</button></aside>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {draft.records.map((record,recordIndex) => { const exercise=exercises.find((item) => item.id===record.exerciseId); if (!exercise) return null; const previous=workouts.find((workout) => workout.records?.some((item) => item.exerciseId===record.exerciseId))?.records?.find((item) => item.exerciseId===record.exerciseId);
      return <section className="tracker-panel" key={exercise.id}><div className="tracker-heading"><div><small>{exercise.muscle}</small><h2>{exercise.name}</h2></div><span>{record.sets.filter((set) => set.done).length}/{record.sets.length} series</span></div><ExerciseDemo exercise={exercise}/><details className="technique-details"><summary>Ver técnica, respiración y adaptación</summary><ExerciseTechnique exercise={exercise}/></details><p className="previous-record">{previous ? `Última vez: ${previous.sets.map((set) => `${set.value} ${record.unit === "reps" ? "rep" : "s"}${set.load ? ` · ${set.load} kg` : ""}`).join(" / ")}` : "Primer registro de este ejercicio. Construye tu punto de partida."}</p><div className="set-table"><div className="set-labels"><span>Serie</span><span>{record.unit === "reps" ? "Rep." : "Segundos"}</span><span>Carga extra kg</span><span>Hecha</span></div>{record.sets.map((set,index) => <div className={set.done ? "set-row done" : "set-row"} key={index}><b>{index+1}</b><input aria-label={`${exercise.name} serie ${index+1} ${record.unit === "reps" ? "repeticiones" : "segundos"}`} type="number" inputMode="numeric" min={1} max={record.unit === "reps" ? 200 : 3600} disabled={set.done || draft.runningSince === null} value={set.value || ""} onChange={(event) => updateSet(recordIndex,index,"value",Number(event.target.value))}/><input aria-label={`${exercise.name} serie ${index+1} carga adicional kg`} type="number" inputMode="decimal" min={0} max={500} step="0.5" disabled={set.done || draft.runningSince === null} value={set.load} onChange={(event) => updateSet(recordIndex,index,"load",Number(event.target.value))}/><button aria-label={`${set.done ? "Desmarcar" : "Completar"} ${exercise.name} serie ${index+1}`} aria-pressed={set.done} disabled={draft.runningSince === null} onClick={() => checkSet(recordIndex,index)}><Check size={18}/></button>{record.unit === "seconds" && !set.done && <button className="set-timer" disabled={draft.runningSince === null || set.value <= 0} onClick={() => {setNow(Date.now());setTimer({key:`${recordIndex}-${index}`,until:Date.now()+set.value*1000,remaining:set.value});}}>{timer?.key === `${recordIndex}-${index}` ? `${draft.runningSince === null ? timer.remaining : Math.max(0,Math.ceil((timer.until-displayNow)/1000))} s · Reiniciar` : "Iniciar temporizador"}</button>}</div>)}</div><small className="tracker-help">Carga extra: usa 0 si trabajas sólo con tu peso corporal.</small></section>;
    })}
    <label className="tracker-notes">Notas del entrenamiento<textarea maxLength={1000} value={draft.notes} placeholder="Cómo te sentiste, ajustes de técnica…" onChange={(event) => setDraft({...draft,notes:event.target.value})}/></label>
    <button className="button button-primary" disabled={!done} onClick={() => setFinishOpen(true)}>Revisar y guardar · {done} {done === 1 ? "serie" : "series"}</button>
    <details className="technique-details"><summary>Opciones de la sesión</summary><div className="discard-draft"><p>Descartar elimina sólo este borrador. El historial de entrenamientos se conserva.</p><button className="button button-secondary" onClick={() => { if (window.confirm("¿Descartar esta sesión en curso? Se perderán sus series sin guardar.")) {setDraft(null);setTimer(null);setFinishOpen(false);} }}>Descartar borrador</button></div></details>
    {finishOpen && <section className="tracker-panel finish-review" aria-label="Revisar entrenamiento"><h2>Antes de guardar</h2><p>Guardarás {done} de {total} series. Las pendientes no se contabilizan.</p><label>Esfuerzo percibido<select value={effort} onChange={(event) => setEffort(Number(event.target.value) as WorkoutEntry["effort"])}>{["Muy fácil","Fácil","Moderado","Difícil","Máximo"].map((label,index) => <option key={label} value={index+1}>{index+1} · {label}</option>)}</select></label><label><input type="checkbox" checked={pain} onChange={(event) => setPain(event.target.checked)}/> Sentí molestias</label><button className="button button-primary" onClick={finish}>Guardar entrenamiento</button><button className="button button-secondary" onClick={() => setFinishOpen(false)}>Seguir registrando</button></section>}
  </div>;
}
