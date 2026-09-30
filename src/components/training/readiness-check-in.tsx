"use client";

import { useState } from "react";
import { BatteryMedium, Check, Moon, RotateCcw, ShieldCheck } from "lucide-react";
import { usePersistentState } from "@/lib/use-persistent-state";
import { localDateKey } from "@/lib/utils";
import type { ReadinessEntry, WorkoutEntry } from "@/types";

const energyOptions = [{ value: 1 as const, label: "Baja" }, { value: 2 as const, label: "Media" }, { value: 3 as const, label: "Alta" }];
const sleepOptions = [{ value: 1 as const, label: "Mal" }, { value: 2 as const, label: "Normal" }, { value: 3 as const, label: "Bien" }];
const sorenessOptions = [{ value: 0 as const, label: "Nada" }, { value: 1 as const, label: "Leve" }, { value: 2 as const, label: "Alta" }];

export function ReadinessCheckIn() {
  const today = localDateKey();
  const [entries, setEntries] = usePersistentState<ReadinessEntry[]>("pulso:readiness", []);
  const [workouts] = usePersistentState<WorkoutEntry[]>("pulso:workouts", []);
  const saved = entries.find((entry) => entry.date === today);
  const lastFeedback = workouts.find((workout) => workout.effort !== undefined);
  const [editing, setEditing] = useState(false);
  const [energy, setEnergy] = useState<ReadinessEntry["energy"] | null>(saved?.energy ?? null);
  const [sleep, setSleep] = useState<ReadinessEntry["sleep"] | null>(saved?.sleep ?? null);
  const [soreness, setSoreness] = useState<ReadinessEntry["soreness"] | null>(saved?.soreness ?? null);

  function save() {
    if (energy === null || sleep === null || soreness === null) return;
    const score = energy + sleep + (soreness === 0 ? 3 : soreness === 1 ? 2 : 0);
    const recommendation: ReadinessEntry["recommendation"] = score >= 7 ? "planned" : score >= 4 ? "short" : "recovery";
    const entry: ReadinessEntry = { date: today, energy, sleep, soreness, score, recommendation, updatedAt: new Date().toISOString() };
    setEntries((items) => [entry, ...items.filter((item) => item.date !== today)].slice(0, 60));
    setEditing(false);
  }

  function startEditing() {
    if (saved) {
      setEnergy(saved.energy);
      setSleep(saved.sleep);
      setSoreness(saved.soreness);
    }
    setEditing(true);
  }

  if (saved && !editing) {
    const copy = recommendationCopy(saved.recommendation);
    return <section className={`readiness-result readiness-${saved.recommendation}`}><div className="readiness-result-icon"><ShieldCheck size={22} /></div><div><small>ESTADO DE HOY · {copy.label}</small><h2>{copy.title}</h2><p>{copy.detail}</p><span>Energía {energyOptions[saved.energy - 1].label.toLowerCase()} · Sueño {sleepOptions[saved.sleep - 1].label.toLowerCase()} · Molestia {sorenessOptions[saved.soreness].label.toLowerCase()}</span>{lastFeedback && <em>Última sesión: esfuerzo {lastFeedback.effort}/5{lastFeedback.feltPain ? " · reportaste molestia" : " · sin molestia"}.</em>}</div><button onClick={startEditing}><RotateCcw size={14} /> Ajustar</button></section>;
  }

  return <section className="readiness-check"><header><div><small>CHEQUEO DE 20 SEGUNDOS</small><h2>¿Cómo llegas hoy?</h2><p>Adaptaremos la duración, no evaluamos tu salud.</p></div><BatteryMedium size={24} /></header><ReadinessQuestion icon={<BatteryMedium size={16} />} label="Energía" options={energyOptions} value={energy} onChange={setEnergy} /><ReadinessQuestion icon={<Moon size={16} />} label="Sueño" options={sleepOptions} value={sleep} onChange={setSleep} /><ReadinessQuestion icon={<ShieldCheck size={16} />} label="Molestia muscular" options={sorenessOptions} value={soreness} onChange={setSoreness} /><button className="button button-primary" disabled={energy === null || sleep === null || soreness === null} onClick={save}><Check size={17} /> Adaptar mi sesión</button></section>;
}

function ReadinessQuestion<T extends number>({ icon, label, options, value, onChange }: { icon: React.ReactNode; label: string; options: Array<{ value: T; label: string }>; value: T | null; onChange: (value: T) => void }) {
  return <div className="readiness-question"><span>{icon}{label}</span><div>{options.map((option) => <button key={option.value} className={value === option.value ? "selected" : ""} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}</div></div>;
}

export function recommendationCopy(recommendation: ReadinessEntry["recommendation"]) {
  if (recommendation === "planned") return { label: "DISPONIBLE", title: "Mantén la sesión planificada", detail: "Tu reporte permite realizar el plan completo con descansos normales." };
  if (recommendation === "short") return { label: "MODERADO", title: "Hoy conviene la versión corta", detail: "Harás menos series para sumar movimiento sin acumular fatiga innecesaria." };
  return { label: "RECUPERACIÓN", title: "Prioriza movimiento suave", detail: "Usa la versión de 10 minutos, un rango cómodo y termina si la molestia aumenta." };
}
