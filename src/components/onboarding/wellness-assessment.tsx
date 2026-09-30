"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, HeartPulse, Sparkles, Target, X } from "lucide-react";

type Goal = "strength" | "weight" | "energy" | "habits";
type Activity = "sedentary" | "walking" | "some" | "regular";
type TimeAvailable = 10 | 20 | 30;
type Limitation = "none" | "knees" | "back" | "shoulders";
type Barrier = "time" | "consistency" | "food" | "discomfort";
type StepKey = "goals" | "activities" | "times" | "limitations" | "barriers";
type SelectionValue = string | number;

interface AssessmentAnswers {
  goals: Goal[];
  activities: Activity[];
  times: TimeAvailable[];
  limitations: Limitation[];
  barriers: Barrier[];
  customAnswers: Record<StepKey, string>;
}

export interface AssessmentProfile extends AssessmentAnswers {
  createdAt: string;
  recommendation: {
    goalLabel: string;
    focus: string;
    sessionsPerWeek: number;
    sessionMinutes: number;
    firstHabit: string;
    dailyMessage: string;
    caution?: string;
  };
}

interface StepOption {
  value: SelectionValue;
  label: string;
  detail: string;
}

const steps: Array<{ key: StepKey; eyebrow: string; title: string; description: string; otherPlaceholder: string; options: StepOption[] }> = [
  {
    key: "goals",
    eyebrow: "TUS PRIORIDADES",
    title: "¿Qué te gustaría mejorar?",
    description: "Puedes marcar una o varias opciones. La primera será el foco principal.",
    otherPlaceholder: "Ej. dormir mejor, reducir estrés…",
    options: [
      { value: "strength", label: "Sentirme más fuerte", detail: "Ganar fuerza y autonomía" },
      { value: "weight", label: "Mejorar mi peso", detail: "Avanzar sin dietas extremas" },
      { value: "energy", label: "Tener más energía", detail: "Moverme y recuperarme mejor" },
      { value: "habits", label: "Crear hábitos", detail: "Construir una rutina sostenible" },
    ],
  },
  {
    key: "activities",
    eyebrow: "PUNTO DE PARTIDA",
    title: "¿Cómo se ve una semana normal?",
    description: "Marca todas las situaciones que te representen.",
    otherPlaceholder: "Ej. practico fútbol los domingos…",
    options: [
      { value: "sedentary", label: "Paso mucho tiempo sentado/a", detail: "Mi día tiene poco movimiento" },
      { value: "walking", label: "Hago caminatas", detail: "Me muevo de forma suave" },
      { value: "some", label: "Entreno 1 o 2 días", detail: "Tengo algo de actividad" },
      { value: "regular", label: "Entreno 3 o más días", detail: "Me muevo con regularidad" },
    ],
  },
  {
    key: "times",
    eyebrow: "TU RITMO",
    title: "¿Qué bloques de tiempo tienes disponibles?",
    description: "Puedes elegir más de uno si tus días son diferentes.",
    otherPlaceholder: "Ej. 15 minutos entre semana…",
    options: [
      { value: 10, label: "10 minutos", detail: "Para días con poco espacio" },
      { value: 20, label: "20 minutos", detail: "Un bloque corto y completo" },
      { value: 30, label: "30 minutos o más", detail: "Cuando tengo más tiempo" },
    ],
  },
  {
    key: "limitations",
    eyebrow: "MOVIMIENTO SEGURO",
    title: "¿Qué zonas debemos cuidar?",
    description: "Marca todas las que correspondan. PULSO no realiza diagnósticos.",
    otherPlaceholder: "Ej. tobillo derecho, muñeca…",
    options: [
      { value: "none", label: "Ninguna en particular", detail: "Puedo moverme con comodidad" },
      { value: "knees", label: "Rodillas", detail: "Siento molestias o inseguridad" },
      { value: "back", label: "Espalda", detail: "Necesito movimientos suaves" },
      { value: "shoulders", label: "Hombros", detail: "Prefiero evitar sobrecarga" },
    ],
  },
  {
    key: "barriers",
    eyebrow: "LO QUE TE FRENA",
    title: "¿Qué hace más difícil cuidarte?",
    description: "Puedes señalar todas las barreras que aparecen en tu rutina.",
    otherPlaceholder: "Ej. turnos variables, cuidar a otros…",
    options: [
      { value: "time", label: "Falta de tiempo", detail: "El día se me pasa rápido" },
      { value: "consistency", label: "Me cuesta ser constante", detail: "Empiezo, pero después lo dejo" },
      { value: "food", label: "Organizar mis comidas", detail: "Improviso demasiado" },
      { value: "discomfort", label: "Molestias o cansancio", detail: "No sé cuánto exigirme" },
    ],
  },
];

const emptyAnswers: AssessmentAnswers = {
  goals: [], activities: [], times: [], limitations: [], barriers: [],
  customAnswers: { goals: "", activities: "", times: "", limitations: "", barriers: "" },
};

export function WellnessAssessment({ onComplete, onCancel }: { onComplete: (profile: AssessmentProfile) => void; onCancel?: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<AssessmentAnswers>(emptyAnswers);
  const showingResult = stepIndex === steps.length;
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const selectedValues = answers[step.key] as SelectionValue[];
  const customAnswer = answers.customAnswers[step.key];
  const canContinue = selectedValues.length > 0 || customAnswer.trim().length > 0;
  const profile = useMemo(() => buildProfile(answers), [answers]);

  function toggleSelection(value: SelectionValue) {
    setAnswers((current) => {
      const currentValues = current[step.key] as SelectionValue[];
      let nextValues = currentValues.includes(value) ? currentValues.filter((item) => item !== value) : [...currentValues, value];
      if (step.key === "limitations") {
        if (value === "none" && !currentValues.includes(value)) nextValues = ["none"];
        else if (value !== "none") nextValues = nextValues.filter((item) => item !== "none");
      }
      return { ...current, [step.key]: nextValues } as AssessmentAnswers;
    });
  }

  function setCustomAnswer(value: string) {
    setAnswers((current) => ({ ...current, customAnswers: { ...current.customAnswers, [step.key]: value } }));
  }

  return (
    <div className="assessment-backdrop">
      <div className="assessment-shell" role="dialog" aria-modal="true" aria-label="Evaluación inicial de bienestar">
        <header className="assessment-header">
          <div className="wordmark">PULSO<span>.</span></div>
          {onCancel && <button className="icon-button" onClick={onCancel} aria-label="Cerrar evaluación"><X size={19} /></button>}
        </header>

        {!showingResult ? <>
          <div className="assessment-progress" aria-label={`Pregunta ${stepIndex + 1} de ${steps.length}`}><span style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} /></div>
          <section className="assessment-copy">
            <p>{step.eyebrow} · {stepIndex + 1}/{steps.length}</p>
            <h1>{step.title}</h1>
            <span>{step.description}</span>
            <small className="assessment-limit">{selectedValues.length} seleccionada{selectedValues.length === 1 ? "" : "s"}</small>
          </section>
          <div className="assessment-options">
            {step.options.map((option) => {
              const selected = selectedValues.includes(option.value);
              return <button key={option.value} className={selected ? "selected" : ""} aria-pressed={selected} onClick={() => toggleSelection(option.value)}><i>{selected && <Check size={16} />}</i><span><strong>{option.label}</strong><small>{option.detail}</small></span></button>;
            })}
          </div>
          <label className="assessment-other"><span>Otra opción <small>opcional</small></span><textarea value={customAnswer} onChange={(event) => setCustomAnswer(event.target.value)} placeholder={step.otherPlaceholder} maxLength={180} /><small>{customAnswer.length}/180</small></label>
          <footer className="assessment-actions">
            <button className="assessment-back" onClick={() => setStepIndex((value) => Math.max(0, value - 1))} disabled={stepIndex === 0}><ArrowLeft size={18} /> Atrás</button>
            <button className="button button-primary" disabled={!canContinue} onClick={() => setStepIndex((value) => value + 1)}>{stepIndex === steps.length - 1 ? "Ver mi punto de partida" : "Continuar"}<ArrowRight size={18} /></button>
          </footer>
        </> : <section className="assessment-result">
          <div className="result-mark"><Sparkles size={27} /></div>
          <p>TU PUNTO DE PARTIDA</p>
          <h1>{profile.recommendation.focus}</h1>
          <small className="result-priorities">{profile.recommendation.goalLabel}</small>
          <span>Un plan inicial construido con todas tus respuestas. Podrás ajustarlo cuando lo necesites.</span>
          <div className="result-grid">
            <article><Clock3 size={19} /><strong>{profile.recommendation.sessionMinutes} min</strong><small>por sesión</small></article>
            <article><Target size={19} /><strong>{profile.recommendation.sessionsPerWeek} días</strong><small>por semana</small></article>
          </div>
          <div className="first-habit"><Check size={19} /><div><small>TU PRIMER HÁBITO</small><strong>{profile.recommendation.firstHabit}</strong></div></div>
          {profile.recommendation.caution && <aside className="assessment-caution"><HeartPulse size={18} /><p>{profile.recommendation.caution}</p></aside>}
          <button className="button button-primary" onClick={() => onComplete(profile)}>Activar mi plan <ArrowRight size={18} /></button>
          <button className="assessment-restart" onClick={() => { setAnswers(emptyAnswers); setStepIndex(0); }}>Cambiar mis respuestas</button>
        </section>}
        <p className="assessment-disclaimer">Orientación general de bienestar. No reemplaza evaluación médica o nutricional.</p>
      </div>
    </div>
  );
}

function buildProfile(answers: AssessmentAnswers): AssessmentProfile {
  const goals: Record<Goal, { label: string; focus: string; message: string }> = {
    strength: { label: "Sentirme más fuerte", focus: "Fuerza que puedas sostener", message: "Hoy construimos fuerza con movimientos controlados y alcanzables." },
    weight: { label: "Mejorar mi peso", focus: "Movimiento y alimentación simple", message: "Hoy sumamos movimiento y una decisión simple en tus comidas." },
    energy: { label: "Tener más energía", focus: "Energía para tu día", message: "Hoy activamos el cuerpo sin agotar tus reservas." },
    habits: { label: "Crear hábitos", focus: "Constancia antes que perfección", message: "Hoy repetimos una acción pequeña que puedas sostener mañana." },
  };
  const firstHabits: Record<Barrier, string> = {
    time: "Reserva ahora tu próximo bloque de movimiento",
    consistency: "Completa solo diez minutos, incluso en un día difícil",
    food: "Define con anticipación tu próxima comida principal",
    discomfort: "Haz una pausa breve para revisar cómo se siente tu cuerpo",
  };
  const limitationLabels: Record<Exclude<Limitation, "none">, string> = { knees: "rodillas", back: "espalda", shoulders: "hombros" };
  const primaryGoal = answers.goals[0] ?? "habits";
  const goal = goals[primaryGoal];
  const goalLabels = answers.goals.map((item) => goals[item].label);
  if (answers.customAnswers.goals.trim()) goalLabels.push(answers.customAnswers.goals.trim());
  const additionalGoals = goalLabels.slice(1);
  const activityScores: Record<Activity, number> = { sedentary: 2, walking: 2, some: 3, regular: 4 };
  const sessionsPerWeek = answers.activities.length ? Math.max(...answers.activities.map((item) => activityScores[item])) : 2;
  const shortestTime = answers.times.length ? Math.min(...answers.times) : 10;
  const sessionMinutes = shortestTime >= 30 ? 20 : shortestTime;
  const firstBarrier = answers.barriers[0];
  const customBarrier = answers.customAnswers.barriers.trim();
  const firstHabit = firstBarrier ? firstHabits[firstBarrier] : customBarrier ? `Define una acción pequeña para trabajar en: ${customBarrier}` : firstHabits.consistency;
  const selectedLimitations = answers.limitations.filter((item): item is Exclude<Limitation, "none"> => item !== "none");
  const customLimitation = answers.customAnswers.limitations.trim();
  const areasToProtect = [...selectedLimitations.map((item) => limitationLabels[item]), ...(customLimitation ? [customLimitation] : [])];
  const caution = areasToProtect.length ? `Cuidaremos especialmente ${areasToProtect.join(", ")}. Comienza con movimientos suaves y detente si aparece dolor intenso o persistente; en ese caso, consulta a un profesional.` : undefined;

  return {
    ...answers,
    createdAt: new Date().toISOString(),
    recommendation: {
      goalLabel: goalLabels.length ? goalLabels.join(" + ") : goal.label,
      focus: goal.focus,
      sessionsPerWeek,
      sessionMinutes,
      firstHabit,
      dailyMessage: additionalGoals.length ? `${goal.message} También avanzaremos en ${additionalGoals.join(" y ").toLowerCase()}.` : goal.message,
      caution,
    },
  };
}
