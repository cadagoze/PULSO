"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight, BatteryMedium, Brain, Check, Moon, Zap } from "lucide-react";
import { Button, ProgressRing, SegmentedControl, Sheet } from "@/components/ui";
import { readinessScore, trainingLoad } from "@/lib/analytics";
import { useReadiness, useWorkouts } from "@/lib/store";
import type { ReadinessEntry } from "@/types";

type Energy = ReadinessEntry["energy"];
type Sleep = ReadinessEntry["sleep"];
type Soreness = ReadinessEntry["soreness"];
type Stress = NonNullable<ReadinessEntry["stress"]>;
type LoadStatus = ReturnType<typeof trainingLoad>["status"];
type Answers = Pick<ReadinessEntry, "energy" | "sleep" | "soreness" | "stress">;

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
  if (score >= 70) return { label: "Disponible", tone: "ready" as const, color: "var(--lime)" };
  if (score >= 40) return { label: "Moderada", tone: "moderate" as const, color: "var(--warning)" };
  return { label: "En recuperación", tone: "recovery" as const, color: "var(--orange)" };
}

const advice: Record<ReadinessEntry["recommendation"], string> = {
  planned: "Buen día para tu sesión completa.",
  short: "Hoy conviene una versión más corta.",
  recovery: "Prioriza movilidad o una caminata suave.",
};

const loadCopy: Record<LoadStatus, string | null> = {
  low: "Tu carga de los últimos 7 días está por debajo de lo habitual.",
  optimal: "Tu carga de entrenamiento está en un rango equilibrado.",
  high: "Esta semana acumulas más carga de lo habitual: dosifica.",
  unknown: null,
};

/** Chequeo de preparación en una fila compacta; las preguntas se abren en una hoja. */
export function ReadinessCard({ today, now }: { today: string; now: number }) {
  const [entries, setEntries] = useReadiness();
  const [workouts] = useWorkouts();
  const [open, setOpen] = useState(false);
  // Cada apertura empieza el formulario de cero; el contenido sigue visible mientras la hoja se cierra.
  const [round, setRound] = useState(0);
  const saved = entries.find((entry) => entry.date === today);
  const load = trainingLoad(workouts, now);

  function openCheck() {
    setRound((value) => value + 1);
    setOpen(true);
  }

  function save(values: Answers) {
    const { score, recommendation } = readinessScore(values, trainingLoad(workouts, Date.now()).ratio);
    const entry: ReadinessEntry = { date: today, ...values, score, recommendation, updatedAt: new Date().toISOString() };
    setEntries((items) => [entry, ...items.filter((item) => item.date !== today)].slice(0, MAX_ENTRIES));
    setOpen(false);
  }

  return (
    <>
      {saved ? <ReadinessResult entry={saved} loadStatus={load.status} onAdjust={openCheck} /> : (
        <button type="button" className="home-ready home-ready-prompt" onClick={openCheck}>
          <span className="home-ready-icon" aria-hidden="true"><Zap size={18} /></span>
          <span className="grow">
            <strong>¿Cómo llegas hoy?</strong>
            <small>Chequeo de 20 segundos para ajustar tu sesión</small>
          </span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} eyebrow="Chequeo de 20 segundos" title="¿Cómo llegas hoy?">
        <ReadinessCheckIn key={round} initial={saved} onSave={save} />
      </Sheet>
    </>
  );
}

function ReadinessResult({ entry, loadStatus, onAdjust }: { entry: ReadinessEntry; loadStatus: LoadStatus; onAdjust: () => void }) {
  const state = readinessState(entry.score);
  // La carga sólo se menciona cuando se sale de lo habitual.
  const loadLine = loadStatus === "optimal" ? null : loadCopy[loadStatus];
  return (
    <section className={`home-ready home-ready-${state.tone}`} aria-labelledby="home-ready-title">
      <ProgressRing value={entry.score} size={56} stroke={9} color={state.color} label={`Preparación ${entry.score} de 100`}>
        <b className="home-ready-score num">{entry.score}</b>
      </ProgressRing>
      <div className="grow">
        <p className="meta">Preparación de hoy</p>
        <h2 id="home-ready-title">{state.label}</h2>
        <p>{advice[entry.recommendation]}{loadLine ? ` ${loadLine}` : ""}</p>
      </div>
      <Button variant="ghost" size="s" onClick={onAdjust}>Ajustar</Button>
    </section>
  );
}

function ReadinessCheckIn({ initial, onSave }: { initial?: ReadinessEntry; onSave: (values: Answers) => void }) {
  const [energy, setEnergy] = useState<Energy | null>(initial?.energy ?? null);
  const [sleep, setSleep] = useState<Sleep | null>(initial?.sleep ?? null);
  const [soreness, setSoreness] = useState<Soreness | null>(initial?.soreness ?? null);
  const [stress, setStress] = useState<Stress | null>(initial?.stress ?? null);
  const complete = energy !== null && sleep !== null && soreness !== null && stress !== null;

  return (
    <div className="home-check">
      <p className="muted home-check-intro">Ajustamos tu sesión a cómo te sientes. No es una evaluación de salud.</p>
      <Question icon={<Zap size={16} />} label="Energía" options={energyOptions} value={energy} onChange={setEnergy} />
      <Question icon={<Moon size={16} />} label="Sueño" options={sleepOptions} value={sleep} onChange={setSleep} />
      <Question icon={<BatteryMedium size={16} />} label="Molestias musculares" options={sorenessOptions} value={soreness} onChange={setSoreness} />
      <Question icon={<Brain size={16} />} label="Estrés" options={stressOptions} value={stress} onChange={setStress} />
      <Button size="l" block disabled={!complete} onClick={() => { if (complete) onSave({ energy, sleep, soreness, stress }); }}>
        <Check size={18} />
        Ver mi preparación
      </Button>
    </div>
  );
}

function Question<T extends number>({ icon, label, options, value, onChange }: { icon: ReactNode; label: string; options: Array<{ value: T; label: string }>; value: T | null; onChange: (value: T) => void }) {
  return (
    <div className="home-q">
      <span className="home-q-label">{icon}{label}</span>
      <SegmentedControl
        label={label}
        options={options.map((option) => ({ value: String(option.value), label: option.label }))}
        value={value === null ? null : String(value)}
        onChange={(next) => onChange(Number(next) as T)}
      />
    </div>
  );
}
