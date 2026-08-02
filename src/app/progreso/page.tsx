"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Check, Plus, Scale, TrendingDown, X } from "lucide-react";
import { weightHistory } from "@/data/mock-data";
import { formatWeight } from "@/lib/utils";
import { TrendChart } from "@/components/progress/trend-chart";
import { PageHeader, PrimaryButton, SectionHeader } from "@/components/ui";
import type { WeightEntry } from "@/types";
import { usePersistentState } from "@/lib/use-persistent-state";

const tabs = ["Resumen", "Peso", "Medidas", "Hábitos"];

export default function ProgressPage() {
  const [activeTab, setActiveTab] = useState("Peso");
  const [entries, setEntries] = usePersistentState<WeightEntry[]>("pulso:weights", weightHistory);
  const [completedHabits] = usePersistentState<number[]>("pulso:habits", [1]);
  const [modal, setModal] = useState(false);
  const [value, setValue] = useState("82.4");
  const [date, setDate] = useState("2026-08-02");
  const [error, setError] = useState("");
  const current = entries.at(-1)?.weight ?? 82.4;
  const weeklyAverage = useMemo(() => entries.slice(-3).reduce((sum, item) => sum + item.weight, 0) / Math.min(entries.length, 3), [entries]);
  function saveWeight() {
    const parsed = Number(value.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 30 || parsed > 300) { setError("Ingresa un peso válido entre 30 y 300 kg."); return; }
    setEntries((items) => [...items.filter((item) => item.date !== date), { date, label: date === "2026-08-02" ? "Hoy" : date, weight: parsed }].sort((a, b) => a.date.localeCompare(b.date))); setModal(false); setError("");
  }
  return (
    <div className="page-stack">
      <PageHeader eyebrow="TU EVOLUCIÓN" title="Progreso" subtitle="Mira la tendencia, no un solo día." />
      <div className="segmented" role="tablist">{tabs.map((tab) => <button key={tab} role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div>
      {activeTab === "Peso" ? <>
        <section className="weight-hero"><div><span>Peso actual</span><h2>{formatWeight(current)} <small>kg</small></h2><p><TrendingDown size={16} /> −1,6 kg este mes</p></div><button className="button button-primary compact" onClick={() => setModal(true)}><Plus size={17} /> Registrar</button></section>
        <section className="chart-card"><div className="chart-header"><div><span>ÚLTIMOS 30 DÍAS</span><strong>Una tendencia constante</strong></div><span className="trend-pill"><TrendingDown size={14} /> 1,9%</span></div><TrendChart data={entries} /><div className="chart-caption"><span>84 kg</span><span>82,4 kg</span></div></section>
        <section><SectionHeader title="Datos clave" /><div className="key-metrics"><article><span>Promedio semanal</span><strong>{formatWeight(weeklyAverage)} <small>kg</small></strong><p>−0,4 kg vs. anterior</p></article><article><span>Peso inicial</span><strong>89,2 <small>kg</small></strong><p>Hace 14 semanas</p></article><article><span>Peso más bajo</span><strong>82,4 <small>kg</small></strong><p>Alcanzado hoy</p></article></div></section>
        <aside className="progress-note"><Check size={20} /><div><strong>Vas en la dirección correcta</strong><p>Tu promedio baja de forma gradual. Mantén el plan esta semana.</p></div></aside>
      </> : <ProgressTab tab={activeTab} current={current} completedHabits={completedHabits.length} />}
      {modal && <div className="modal-backdrop" onMouseDown={() => setModal(false)}><section className="sheet-modal weight-modal" role="dialog" aria-modal="true" aria-labelledby="weight-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-handle" /><header><div><span>NUEVO REGISTRO</span><h2 id="weight-title">Registrar peso</h2></div><button className="icon-button" onClick={() => setModal(false)} aria-label="Cerrar"><X size={20} /></button></header><label className="weight-input"><Scale size={21} /><input autoFocus inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} aria-describedby={error ? "weight-error" : undefined} /><span>kg</span></label>{error && <p className="form-error" id="weight-error">{error}</p>}<label className="date-input"><span>Fecha</span><div><CalendarDays size={18} /><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div></label><p className="modal-help">Las variaciones diarias son normales. Lo importante es la tendencia.</p><PrimaryButton onClick={saveWeight}>Guardar registro</PrimaryButton></section></div>}
    </div>
  );
}

function ProgressTab({ tab, current, completedHabits }: { tab: string; current: number; completedHabits: number }) {
  if (tab === "Resumen") return <section className="progress-tab"><div className="key-metrics"><article><span>Peso actual</span><strong>{formatWeight(current)} <small>kg</small></strong><p>Tendencia gradual</p></article><article><span>Hábitos de hoy</span><strong>{completedHabits} <small>de 3</small></strong><p>Pequeños pasos</p></article><article><span>Sesiones</span><strong>2 <small>de 3</small></strong><p>Esta semana</p></article></div><aside className="progress-note"><Check size={20} /><div><strong>Tu semana se está moviendo</strong><p>Revisa el peso, tus hábitos y el entrenamiento como un conjunto.</p></div></aside></section>;
  if (tab === "Hábitos") return <section className="progress-tab"><div className="habit-progress-ring"><strong>{completedHabits}/3</strong><span>hábitos completados hoy</span></div><p className="tab-guidance">La constancia se construye repitiendo acciones pequeñas. Puedes marcarlas desde la pantalla Hoy.</p></section>;
  return <section className="progress-tab"><div className="measurement-note"><Scale size={28} /><div><h2>Aún no hay medidas</h2><p>En esta etapa PULSO prioriza peso, hábitos y movimiento. Las medidas corporales se incorporarán cuando podamos registrarlas con contexto y privacidad.</p></div></div></section>;
}
