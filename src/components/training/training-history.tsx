"use client";
import Link from "next/link";
import { useState } from "react";
import { exercises } from "@/data/mock-data";
import { usePersistentState } from "@/lib/use-persistent-state";
import { workoutsThisWeek } from "@/lib/utils";
import type { WorkoutEntry } from "@/types";

export function TrainingHistory() {
  const [workouts] = usePersistentState<WorkoutEntry[]>("pulso:workouts", []);
  const [filter,setFilter] = useState("all");
  const week = workoutsThisWeek(workouts);
  const filtered = [...workouts].filter((workout) => filter === "all" || workout.records?.some((record) => record.exerciseId === Number(filter))).sort((a,b) => b.completedAt.localeCompare(a.completedAt));
  function download() {
    const blob = new Blob([JSON.stringify({exportedAt:new Date().toISOString(),workouts},null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href=url; anchor.download="pulso-entrenamientos.json"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  return <><div className="tracker-stats"><span><b>{week.length}</b>sesiones esta semana</span><span><b>{week.reduce((sum,item) => sum+item.sets,0)}</b>series registradas</span><span><b>{Math.round(week.reduce((sum,item) => sum+item.durationMinutes,0))}</b>minutos esta semana</span></div><section className="tracker-panel"><div className="tracker-heading"><div><small>TU DIARIO DE ENTRENAMIENTO</small><h2>Historial y marcas</h2></div><button className="button button-secondary" disabled={!workouts.length} onClick={download}>Exportar</button></div><label className="tracker-filter">Filtrar por ejercicio<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Todos los ejercicios</option>{exercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></label>{filter !== "all" && <p className="previous-record">Mejor registro: {(() => { const records = filtered.flatMap((workout) => workout.records ?? []).filter((record) => record.exerciseId === Number(filter)); const values = records.flatMap((record) => record.sets.map((set) => set.value)); return values.length ? `${Math.max(...values)} ${records[0].unit === "reps" ? "repeticiones" : "segundos"} en una serie. Compara también la carga y la técnica.` : "Aún no tienes series registradas."; })()}</p>}
    {!filtered.length && <div className="tracker-empty"><h3>{workouts.length ? "Sin registros para este ejercicio" : "Tu progreso comienza con una sesión"}</h3><p>Registra tus series y aquí verás fechas, repeticiones, carga y tiempo.</p><Link href="/entrenar" className="button button-primary">Preparar entrenamiento</Link></div>}
    {filtered.map((workout) => <details className="history-entry" key={workout.id}><summary><div><strong>{workout.name ?? (workout.mode === "short" ? "Sesión breve" : "Fuerza en casa")}</strong><span>{new Date(`${workout.date}T12:00:00`).toLocaleDateString("es-CL",{day:"numeric",month:"long",year:"numeric"})} · {workout.sets} series · {workout.durationMinutes} min</span></div><b>Ver detalle</b></summary>{workout.records ? workout.records.map((record) => <div className="history-exercise" key={record.exerciseId}><h3>{exercises.find((item) => item.id===record.exerciseId)?.name ?? "Ejercicio"}</h3>{record.sets.map((set,index) => <p key={index}>Serie {index+1} <strong>{set.value} {record.unit === "reps" ? "repeticiones" : "segundos"}</strong> · {set.load ? `${set.load} kg adicionales` : "Peso corporal"}</p>)}</div>) : <p>Registro anterior: no contiene detalle por serie. Su duración era estimada.</p>}{workout.notes && <p>Notas: {workout.notes}</p>}<p>Esfuerzo: {workout.effort ? `${workout.effort}/5` : "Sin registrar"}{workout.feltPain ? " · Reportaste molestias" : ""}</p></details>)}<p className="tracker-help">Guardado en este navegador. Exporta tu historial como respaldo.</p></section></>;
}
