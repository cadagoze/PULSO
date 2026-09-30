"use client";
import { useState } from "react";
import Link from "next/link";
import { exercises } from "@/data/mock-data";
import { defaultRecords, defaultRoutine } from "@/lib/training";
import { usePersistentState } from "@/lib/use-persistent-state";
import type { TrainingRoutine } from "@/types";

export function RoutinePlanner() {
  const [routine, setRoutine] = usePersistentState<TrainingRoutine>("pulso:routine", defaultRoutine);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(routine);
  const [saved, setSaved] = useState(false);
  return <section className="tracker-panel"><div className="tracker-heading"><div><small>PLANIFICA TU SEMANA</small><h2>{routine.name}</h2><p>{routine.records.length} ejercicios · {routine.days.length} días por semana · {routine.restSeconds} s de descanso</p></div><button className="button button-secondary" onClick={() => { setForm(routine); setEditing(!editing); setSaved(false); }}>{editing ? "Cancelar" : "Editar rutina"}</button></div>
    {editing ? <form className="routine-form" onSubmit={(event) => { event.preventDefault(); setRoutine({ ...form, name: form.name.trim() }); setEditing(false); setSaved(true); }}>
      <label>Nombre de la rutina<input required maxLength={60} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
      <fieldset><legend>Días de entrenamiento</legend><div className="routine-days">{["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((day, index) => <button type="button" key={day} aria-pressed={form.days.includes(index)} onClick={() => setForm({ ...form, days: form.days.includes(index) ? form.days.filter((item) => item !== index) : [...form.days, index].sort() })}>{day.slice(0, 3)}</button>)}</div></fieldset>
      <label>Descanso entre series<select value={form.restSeconds} onChange={(event) => setForm({ ...form, restSeconds: Number(event.target.value) })}>{[30,45,60,90,120].map((seconds) => <option key={seconds} value={seconds}>{seconds} segundos</option>)}</select></label>
      <fieldset><legend>Ejercicios y objetivos</legend>{exercises.map((exercise) => { const record = form.records.find((item) => item.exerciseId === exercise.id); return <div className="routine-exercise" key={exercise.id}><label><input type="checkbox" checked={Boolean(record)} onChange={() => setForm({ ...form, records: record ? form.records.filter((item) => item.exerciseId !== exercise.id) : [...form.records, defaultRecords().find((item) => item.exerciseId === exercise.id)!] })} />{exercise.name}</label>{record && <div><label>Series<input type="number" min={1} max={10} required value={record.sets.length} onChange={(event) => { const count = Math.max(1,Math.min(10,Number(event.target.value))); setForm({ ...form, records: form.records.map((item) => item.exerciseId !== exercise.id ? item : { ...item, sets: Array.from({length:count}, () => ({...item.sets[0], done:false})) }) }); }} /></label><label>{record.unit === "reps" ? "Repeticiones" : "Segundos"}<input type="number" min={1} max={record.unit === "reps" ? 200 : 3600} required value={record.sets[0].value} onChange={(event) => setForm({ ...form, records: form.records.map((item) => item.exerciseId !== exercise.id ? item : {...item, sets:item.sets.map((set) => ({...set, value:Number(event.target.value)}))}) })} /></label></div>}</div>; })}</fieldset>
      <button className="button button-primary" disabled={!form.name.trim() || !form.records.length || !form.days.length}>Guardar rutina</button>
    </form> : <><div className="routine-days">{["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day,index) => <span className={routine.days.includes(index) ? "planned" : ""} key={day}>{day}</span>)}</div><Link className="button button-primary" href="/entrenar/sesion?rutina=true">Entrenar esta rutina</Link>{saved && <p role="status">Rutina guardada en este dispositivo.</p>}</>}
  </section>;
}
