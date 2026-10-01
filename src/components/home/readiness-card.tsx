"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { BatteryMedium, Brain, Check, Moon, RotateCcw, Zap } from "lucide-react";
import { ProgressRing } from "@/components/ui";
import { readinessScore, trainingLoad } from "@/lib/analytics";
import { useReadiness, useWorkouts } from "@/lib/store";
import type { ReadinessEntry } from "@/types";

type Energy = ReadinessEntry["energy"];
type Sleep = ReadinessEntry["sleep"];
type Soreness = ReadinessEntry["soreness"];
type Stress = NonNullable<ReadinessEntry["stress"]>;
type LoadStatus = ReturnType<typeof trainingLoad>["status"];

const energyOptions: Array<{ value: Energy; label: string }> = [
  { value: 1, label: "Baja" },
  { value: 2, label: "Media" },
  { value: 3, label: "Alta" },
];
const sleepOptions: Array<{ value: Sleep; label: string }> = [
  { value: 1, label: "Mal" },
  { value: 2, label: "Normal" },
  { value: 3, label: "Bien" },
];
const sorenessOptions: Array<{ value: Soreness; label: string }> = [
  { value: 0, label: "Nada" },
  { value: 1, label: "Leve" },
  { value: 2, label: "Alta" },
];
const stressOptions: Array<{ value: Stress; label: string }> = [
  { value: 1, label: "Bajo" },
  { value: 2, label: "Medio" },
  { value: 3, label: "Alto" },
];

const MAX_ENTRIES = 90;

export function readinessState(score: number) {
  if (score >= 70) return { label: "Disponible", tone: "ready" as const, color: "var(--lime-text)" };
  if (score >= 40) return { label: "Moderado", tone: "moderate" as const, color: "var(--warning)" };
  return { label: "Recuperación", tone: "recovery" as const, color: "var(--violet)" };
}

const advice: Record<ReadinessEntry["recommendation"], string> = {
  planned: "Buen día para tu sesión completa, con descansos normales.",
  short: "Hoy conviene una versión más corta: menos series, misma técnica.",
  recovery: "Prioriza movilidad o una caminata suave y termina si algo molesta.",
};

const loadCopy: Record<LoadStatus, string | null> = {
  low: "Tu carga de los últimos 7 días está por debajo de lo habitual.",
  optimal: "Tu carga de entrenamiento está en un rango equilibrado.",
  high: "Esta semana acumulas más carga de lo habitual: dosifica.",
  unknown: null,
};

export function ReadinessCard({ today, now }: { today: string; now: number }) {
  const [entries, setEntries] = useReadiness();
  const [workouts] = useWorkouts();
  const [editing, setEditing] = useState(false);
  const saved = entries.find((entry) => entry.date === today);
  const load = trainingLoad(workouts, now);

  function save(values: Pick<ReadinessEntry, "energy" | "sleep" | "soreness" | "stress">) {
    const { score, recommendation } = readinessScore(values, trainingLoad(workouts, Date.now()).ratio);
    const entry: ReadinessEntry = { date: today, ...values, score, recommendation, updatedAt: new Date().toISOString() };
    setEntries((items) => [entry, ...items.filter((item) => item.date !== today)].slice(0, MAX_ENTRIES));
    setEditing(false);
  }

  if (saved && !editing) {
    return <ReadinessResult entry={saved} loadStatus={load.status} onAdjust={() => setEditing(true)} />;
  }
  return <ReadinessCheckIn initial={saved} onSave={save} onCancel={saved ? () => setEditing(false) : undefined} />;
}

function ReadinessResult({ entry, loadStatus, onAdjust }: { entry: ReadinessEntry; loadStatus: LoadStatus; onAdjust: () => void }) {
  const state = readinessState(entry.score);
  const loadLine = loadCopy[loadStatus];
  const factors = [
    `Energía ${energyOptions[entry.energy - 1]?.label.toLowerCase() ?? "—"}`,
    `Sueño ${sleepOptions[entry.sleep - 1]?.label.toLowerCase() ?? "—"}`,
    `Molestias ${sorenessOptions[entry.soreness]?.label.toLowerCase() ?? "—"}`,
    ...(entry.stress ? [`Estrés ${stressOptions[entry.stress - 1]?.label.toLowerCase() ?? "—"}`] : []),
  ];
  return (
    <section className={`card home-ready home-ready-${state.tone}`} aria-labelledby="home-ready-title">
      <div className="home-ready-main">
        <ProgressRing value={entry.score} size={92} stroke={8} color={state.color} label={`Preparación ${entry.score} de 100`}>
          <b className="home-ready-score num">{entry.score}</b>
          <small className="home-ready-of">/100</small>
        </ProgressRing>
        <div className="home-ready-text">
          <p className="eyebrow">Preparación de hoy</p>
          <h2 id="home-ready-title">{state.label}</h2>
          <p>{advice[entry.recommendation]}</p>
        </div>
      </div>
      {loadLine && <p className="home-ready-load">{loadLine}</p>}
      <div className="home-ready-foot">
        <span className="home-ready-factors">{factors.join(" · ")}</span>
        <button className="btn btn-ghost btn-small" onClick={onAdjust}>
          <RotateCcw size={14} />
          Ajustar
        </button>
      </div>
    </section>
  );
}

function ReadinessCheckIn({ initial, onSave, onCancel }: { initial?: ReadinessEntry; onSave: (values: Pick<ReadinessEntry, "energy" | "sleep" | "soreness" | "stress">) => void; onCancel?: () => void }) {
  const [energy, setEnergy] = useState<Energy | null>(initial?.energy ?? null);
  const [sleep, setSleep] = useState<Sleep | null>(initial?.sleep ?? null);
  const [soreness, setSoreness] = useState<Soreness | null>(initial?.soreness ?? null);
  const [stress, setStress] = useState<Stress | null>(initial?.stress ?? null);
  const complete = energy !== null && sleep !== null && soreness !== null && stress !== null;

  return (
    <section className="card home-check" aria-labelledby="home-check-title">
      <header className="home-check-head">
        <div>
          <p className="eyebrow">Chequeo de 20 segundos</p>
          <h2 id="home-check-title">¿Cómo llegas hoy?</h2>
          <p className="muted">Ajustamos tu sesión a cómo te sientes. No es una evaluación de salud.</p>
        </div>
      </header>
      <div className="home-check-grid">
        <Question icon={<Zap size={15} />} label="Energía" options={energyOptions} value={energy} onChange={setEnergy} />
        <Question icon={<Moon size={15} />} label="Sueño" options={sleepOptions} value={sleep} onChange={setSleep} />
        <Question icon={<BatteryMedium size={15} />} label="Molestias musculares" options={sorenessOptions} value={soreness} onChange={setSoreness} />
        <Question icon={<Brain size={15} />} label="Estrés" options={stressOptions} value={stress} onChange={setStress} />
      </div>
      <div className="home-check-actions">
        {onCancel && (
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        )}
        <button
          className="btn btn-dark home-check-save"
          disabled={!complete}
          onClick={() => {
            if (complete) onSave({ energy, sleep, soreness, stress });
          }}
        >
          <Check size={17} />
          Ver mi preparación
        </button>
      </div>
    </section>
  );
}

function Question<T extends number>({ icon, label, options, value, onChange }: { icon: ReactNode; label: string; options: Array<{ value: T; label: string }>; value: T | null; onChange: (value: T) => void }) {
  return (
    <div className="home-q" role="group" aria-label={label}>
      <span className="home-q-label">
        {icon}
        {label}
      </span>
      <div className="home-q-chips">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="home-q-chip"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
