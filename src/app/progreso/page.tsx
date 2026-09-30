"use client";

import { useMemo, useState } from "react";
import { TrainingHistory } from "@/components/training/training-history";
import { CalendarDays, Check, Plus, Scale, TrendingDown, TrendingUp, X } from "lucide-react";
import { habits, meals as initialMeals, weightHistory } from "@/data/mock-data";
import { HabitRow } from "@/components/dashboard/habit-row";
import { formatWeight, localDateKey, workoutsThisWeek } from "@/lib/utils";
import { TrendChart } from "@/components/progress/trend-chart";
import { PageHeader, PrimaryButton, SectionHeader } from "@/components/ui";
import type { Meal, WeightEntry, WorkoutEntry } from "@/types";
import { usePersistentState } from "@/lib/use-persistent-state";
import type { AssessmentProfile } from "@/components/onboarding/wellness-assessment";

const tabs = ["Entrenamientos", "Peso", "Hábitos"];

export default function ProgressPage() {
  const [activeTab, setActiveTab] = useState("Entrenamientos");
  const [entries, setEntries] = usePersistentState<WeightEntry[]>("pulso:weights", weightHistory);
  const [completedHabits, setCompletedHabits] = usePersistentState<number[]>("pulso:habits", [1]);
  const [workouts] = usePersistentState<WorkoutEntry[]>("pulso:workouts", []);
  const [meals] = usePersistentState<Meal[]>("pulso:meals", initialMeals);
  const [profile] = usePersistentState<AssessmentProfile | null>("pulso:assessment", null);
  const [modal, setModal] = useState(false);
  const [value, setValue] = useState("82.4");
  const [date, setDate] = useState(() => localDateKey());
  const [error, setError] = useState("");
  const current = entries.at(-1)?.weight ?? 82.4;
  const initial = entries.at(0)?.weight ?? current;
  const lowest = entries.length ? Math.min(...entries.map((entry) => entry.weight)) : current;
  const totalChange = current - initial;
  const TrendIcon = totalChange <= 0 ? TrendingDown : TrendingUp;
  const weeklySessions = workoutsThisWeek(workouts).length;
  const weeklyTarget = profile?.recommendation.sessionsPerWeek ?? 3;
  const completedMeals = meals.filter((meal) => meal.status === "Registrada").length;
  const weeklyAverage = useMemo(() => entries.slice(-3).reduce((sum, item) => sum + item.weight, 0) / Math.min(entries.length, 3), [entries]);
  function saveWeight() {
    const parsed = Number(value.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 30 || parsed > 300) { setError("Ingresa un peso válido entre 30 y 300 kg."); return; }
    setEntries((items) => [...items.filter((item) => item.date !== date), { date, label: date === localDateKey() ? "Hoy" : date, weight: parsed }].sort((a, b) => a.date.localeCompare(b.date))); setModal(false); setError("");
  }
  return (
    <div className="page-stack">
      <PageHeader eyebrow="TU EVOLUCIÓN" title="Tu historial" subtitle="Cada serie cuenta. Revisa lo que hiciste y compara tus entrenamientos." />
      <div className="segmented" role="tablist">{tabs.map((tab) => <button key={tab} role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div>
      {activeTab === "Entrenamientos" ? <TrainingHistory/> : activeTab === "Peso" ? <>
        <section className="weight-hero"><div><span>Último registro</span><h2>{formatWeight(current)} <small>kg</small></h2><p><TrendIcon size={16} /> {totalChange <= 0 ? "−" : "+"}{formatWeight(Math.abs(totalChange))} kg desde el primer registro</p></div><button className="button button-primary compact" onClick={() => setModal(true)}><Plus size={17} /> Registrar</button></section>
        <section className="chart-card"><div className="chart-header"><div><span>{entries.length} REGISTROS</span><strong>{Math.abs(totalChange) < 0.3 ? "Tu tendencia está estable" : totalChange < 0 ? "La tendencia baja de forma gradual" : "La tendencia necesita contexto"}</strong></div><span className="trend-pill"><TrendIcon size={14} /> {formatWeight(Math.abs(totalChange))} kg</span></div><TrendChart data={entries} /><div className="chart-caption"><span>Inicio: {formatWeight(initial)} kg</span><span>Actual: {formatWeight(current)} kg</span></div></section>
        <section><SectionHeader title="Lo importante de tus registros" /><div className="key-metrics"><article><span>Promedio reciente</span><strong>{formatWeight(weeklyAverage)} <small>kg</small></strong><p>Últimos 3 registros</p></article><article><span>Punto de partida</span><strong>{formatWeight(initial)} <small>kg</small></strong><p>{entries.at(0)?.label ?? "Primer registro"}</p></article><article><span>Registro más bajo</span><strong>{formatWeight(lowest)} <small>kg</small></strong><p>{lowest === current ? "Es tu valor actual" : "No define tu progreso solo"}</p></article></div></section>
        <aside className="progress-note"><Check size={20} /><div><strong>{totalChange <= 0 ? "Tu tendencia acompaña el objetivo" : "Un cambio aislado no define la tendencia"}</strong><p>{totalChange <= 0 ? "Mantén la rutina antes de reducir más comida o aumentar el entrenamiento." : "Revisa sueño, hidratación y varios registros antes de ajustar el plan."}</p></div></aside>
      </> : activeTab === "Hábitos" ? <section><SectionHeader title="Hábitos que acompañan tu entrenamiento"/><div className="habit-list">{habits.map((habit) => <HabitRow key={habit.id} habit={habit} checked={completedHabits.includes(habit.id)} onToggle={() => setCompletedHabits((items) => items.includes(habit.id) ? items.filter((id) => id !== habit.id) : [...items,habit.id])}/>)}</div></section> : <ProgressTab tab={activeTab} current={current} completedHabits={completedHabits.length} weeklySessions={weeklySessions} weeklyTarget={weeklyTarget} completedMeals={completedMeals} totalMeals={meals.length} />}
      {modal && <div className="modal-backdrop" onMouseDown={() => setModal(false)}><section className="sheet-modal weight-modal" role="dialog" aria-modal="true" aria-labelledby="weight-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-handle" /><header><div><span>NUEVO REGISTRO</span><h2 id="weight-title">Registrar peso</h2></div><button className="icon-button" onClick={() => setModal(false)} aria-label="Cerrar"><X size={20} /></button></header><label className="weight-input"><Scale size={21} /><input autoFocus inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} aria-describedby={error ? "weight-error" : undefined} /><span>kg</span></label>{error && <p className="form-error" id="weight-error">{error}</p>}<label className="date-input"><span>Fecha</span><div><CalendarDays size={18} /><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div></label><p className="modal-help">Las variaciones diarias son normales. Lo importante es la tendencia.</p><PrimaryButton onClick={saveWeight}>Guardar registro</PrimaryButton></section></div>}
    </div>
  );
}

function ProgressTab({ tab, current, completedHabits, weeklySessions, weeklyTarget, completedMeals, totalMeals }: { tab: string; current: number; completedHabits: number; weeklySessions: number; weeklyTarget: number; completedMeals: number; totalMeals: number }) {
  if (tab === "Resumen") return <section className="progress-tab"><div className="key-metrics"><article><span>Peso actual</span><strong>{formatWeight(current)} <small>kg</small></strong><p>Tendencia gradual</p></article><article><span>Hábitos de hoy</span><strong>{completedHabits} <small>de 3</small></strong><p>{completedMeals}/{totalMeals} comidas registradas</p></article><article><span>Sesiones</span><strong>{weeklySessions} <small>de {weeklyTarget}</small></strong><p>Esta semana</p></article></div><aside className="progress-note"><Check size={20} /><div><strong>{weeklySessions >= weeklyTarget ? "Objetivo semanal alcanzado" : "Tu semana se está moviendo"}</strong><p>Revisa el peso, tus hábitos, las comidas y el entrenamiento como un conjunto.</p></div></aside></section>;
  if (tab === "Hábitos") return <section className="progress-tab"><div className="habit-progress-ring"><strong>{completedHabits}/3</strong><span>hábitos completados hoy</span></div><p className="tab-guidance">La constancia se construye repitiendo acciones pequeñas. Puedes marcarlas desde la pantalla Hoy.</p></section>;
  return <section className="progress-tab"><div className="measurement-note"><Scale size={28} /><div><h2>Aún no hay medidas</h2><p>En esta etapa PULSO prioriza peso, hábitos y movimiento. Las medidas corporales se incorporarán cuando podamos registrarlas con contexto y privacidad.</p></div></div></section>;
}
