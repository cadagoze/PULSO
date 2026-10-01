"use client";

import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity as ActivityIcon,
  Armchair,
  ArrowLeft,
  ArrowRight,
  BatteryLow,
  Building2,
  CalendarDays,
  Check,
  CircleCheck,
  Clock3,
  Dumbbell,
  Flame,
  Footprints,
  HeartPulse,
  Hourglass,
  House,
  PersonStanding,
  Repeat,
  Scale,
  Sparkles,
  Target,
  Timer,
  Utensils,
  X,
  Zap,
} from "lucide-react";
import { equipmentOptions } from "@/data/mock-data";
import { usePreference, useSettings } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { TrainingEquipment, TrainingLocation } from "@/types";

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
  /** Nombre con el que PULSO te saluda (opcional). */
  name?: string;
  location?: TrainingLocation;
  equipment?: TrainingEquipment[];
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
  icon: ReactNode;
}

interface ChoiceStep {
  kind: "multi";
  key: StepKey;
  eyebrow: string;
  title: string;
  description: string;
  otherPlaceholder: string;
  options: StepOption[];
}

interface SpecialStep {
  kind: "name" | "location";
  eyebrow: string;
  title: string;
  description: string;
}

type FlowStep = ChoiceStep | SpecialStep;

const iconSize = 22;

const flow: FlowStep[] = [
  {
    kind: "name",
    eyebrow: "Bienvenida",
    title: "¿Cómo te llamamos?",
    description: "Así personalizamos tus saludos. Puedes dejarlo en blanco.",
  },
  {
    kind: "multi",
    key: "goals",
    eyebrow: "Tus prioridades",
    title: "¿Qué te gustaría mejorar?",
    description: "Marca una o varias. La primera que elijas será tu foco principal.",
    otherPlaceholder: "Ej. dormir mejor, reducir estrés…",
    options: [
      { value: "strength", label: "Sentirme más fuerte", detail: "Ganar fuerza y autonomía", icon: <Dumbbell size={iconSize} /> },
      { value: "weight", label: "Mejorar mi peso", detail: "Avanzar sin dietas extremas", icon: <Scale size={iconSize} /> },
      { value: "energy", label: "Tener más energía", detail: "Moverme y recuperarme mejor", icon: <Zap size={iconSize} /> },
      { value: "habits", label: "Crear hábitos", detail: "Una rutina que pueda sostener", icon: <Repeat size={iconSize} /> },
    ],
  },
  {
    kind: "multi",
    key: "activities",
    eyebrow: "Punto de partida",
    title: "¿Cómo se ve una semana normal?",
    description: "Marca todas las situaciones que te representen.",
    otherPlaceholder: "Ej. juego fútbol los domingos…",
    options: [
      { value: "sedentary", label: "Paso mucho tiempo sentado/a", detail: "Mi día tiene poco movimiento", icon: <Armchair size={iconSize} /> },
      { value: "walking", label: "Hago caminatas", detail: "Me muevo de forma suave", icon: <Footprints size={iconSize} /> },
      { value: "some", label: "Entreno 1 o 2 días", detail: "Tengo algo de actividad", icon: <ActivityIcon size={iconSize} /> },
      { value: "regular", label: "Entreno 3 o más días", detail: "Me muevo con regularidad", icon: <Flame size={iconSize} /> },
    ],
  },
  {
    kind: "location",
    eyebrow: "Tu espacio",
    title: "¿Dónde vas a entrenar?",
    description: "Elegiremos ejercicios que puedas hacer con lo que tienes.",
  },
  {
    kind: "multi",
    key: "times",
    eyebrow: "Tu ritmo",
    title: "¿Cuánto tiempo tienes por sesión?",
    description: "Puedes elegir más de uno si tus días son distintos.",
    otherPlaceholder: "Ej. 15 minutos entre semana…",
    options: [
      { value: 10, label: "10 minutos", detail: "Para días con poco espacio", icon: <Timer size={iconSize} /> },
      { value: 20, label: "20 minutos", detail: "Un bloque corto y completo", icon: <Clock3 size={iconSize} /> },
      { value: 30, label: "30 minutos o más", detail: "Cuando tengo más tiempo", icon: <Hourglass size={iconSize} /> },
    ],
  },
  {
    kind: "multi",
    key: "limitations",
    eyebrow: "Movimiento seguro",
    title: "¿Qué zonas debemos cuidar?",
    description: "Evitaremos ejercicios que las exijan. PULSO no realiza diagnósticos.",
    otherPlaceholder: "Ej. tobillo derecho, muñeca…",
    options: [
      { value: "none", label: "Ninguna en particular", detail: "Me muevo con comodidad", icon: <CircleCheck size={iconSize} /> },
      { value: "knees", label: "Rodillas", detail: "Siento molestias o inseguridad", icon: <PersonStanding size={iconSize} /> },
      { value: "back", label: "Espalda", detail: "Necesito movimientos suaves", icon: <PersonStanding size={iconSize} /> },
      { value: "shoulders", label: "Hombros", detail: "Prefiero evitar sobrecarga", icon: <PersonStanding size={iconSize} /> },
    ],
  },
  {
    kind: "multi",
    key: "barriers",
    eyebrow: "Lo que te frena",
    title: "¿Qué hace más difícil cuidarte?",
    description: "Señala todas las que aparecen en tu rutina.",
    otherPlaceholder: "Ej. turnos variables, cuidar a otros…",
    options: [
      { value: "time", label: "Falta de tiempo", detail: "El día se me pasa rápido", icon: <Clock3 size={iconSize} /> },
      { value: "consistency", label: "Me cuesta ser constante", detail: "Empiezo, pero después lo dejo", icon: <Repeat size={iconSize} /> },
      { value: "food", label: "Organizar mis comidas", detail: "Improviso demasiado", icon: <Utensils size={iconSize} /> },
      { value: "discomfort", label: "Molestias o cansancio", detail: "No sé cuánto exigirme", icon: <BatteryLow size={iconSize} /> },
    ],
  },
];

const locationOptions: Array<{ value: TrainingLocation; label: string; detail: string; icon: ReactNode }> = [
  { value: "home", label: "En casa", detail: "Con tu peso corporal o lo que tengas a mano", icon: <House size={iconSize} /> },
  { value: "gym", label: "En el gimnasio", detail: "Con máquinas, poleas y pesos libres", icon: <Building2 size={iconSize} /> },
];

const emptyAnswers: AssessmentAnswers = {
  goals: [],
  activities: [],
  times: [],
  limitations: [],
  barriers: [],
  customAnswers: { goals: "", activities: "", times: "", limitations: "", barriers: "" },
};

interface Extras {
  name: string;
  location: TrainingLocation | null;
  equipment: TrainingEquipment[];
}

const emptyExtras: Extras = { name: "", location: null, equipment: [] };

export function WellnessAssessment({ onComplete, onCancel }: { onComplete: (profile: AssessmentProfile) => void; onCancel?: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<AssessmentAnswers>(emptyAnswers);
  const [, setPreference] = usePreference();
  const [settings, updateSettings] = useSettings();
  // Al repetir la evaluación, el nombre guardado aparece ya escrito.
  const [extras, setExtras] = useState<Extras>(() => ({ ...emptyExtras, name: settings.name }));
  const scrollRef = useRef<HTMLDivElement>(null);
  const showingResult = stepIndex === flow.length;
  const step = flow[Math.min(stepIndex, flow.length - 1)];
  const profile = useMemo(() => buildProfile(answers, extras), [answers, extras]);

  const canContinue = step.kind === "multi"
    ? (answers[step.key] as SelectionValue[]).length > 0 || answers.customAnswers[step.key].trim().length > 0
    : step.kind === "name" || extras.location !== null;

  function goTo(index: number) {
    setStepIndex(Math.max(0, Math.min(flow.length, index)));
    scrollRef.current?.scrollTo({ top: 0 });
  }

  function toggleSelection(key: StepKey, value: SelectionValue) {
    setAnswers((current) => {
      const currentValues = current[key] as SelectionValue[];
      let nextValues = currentValues.includes(value) ? currentValues.filter((item) => item !== value) : [...currentValues, value];
      if (key === "limitations") {
        if (value === "none" && !currentValues.includes(value)) nextValues = ["none"];
        else if (value !== "none") nextValues = nextValues.filter((item) => item !== "none");
      }
      return { ...current, [key]: nextValues } as AssessmentAnswers;
    });
  }

  function setCustomAnswer(key: StepKey, value: string) {
    setAnswers((current) => ({ ...current, customAnswers: { ...current.customAnswers, [key]: value } }));
  }

  function finish() {
    const location = profile.location ?? "home";
    setPreference({ location, equipment: location === "gym" ? [] : profile.equipment ?? [] });
    const name = profile.name?.trim();
    updateSettings({ ...(name ? { name } : {}), weeklyGoal: profile.recommendation.sessionsPerWeek });
    onComplete(profile);
  }

  function restart() {
    setAnswers(emptyAnswers);
    setExtras({ ...emptyExtras, name: settings.name });
    goTo(0);
  }

  const continueLabel = step.kind === "name" && !extras.name.trim()
    ? "Omitir"
    : stepIndex === flow.length - 1
      ? "Ver mi plan"
      : "Continuar";

  return (
    <div className="onb-backdrop">
      <div className="onb-shell" role="dialog" aria-modal="true" aria-label="Evaluación inicial de PULSO" ref={scrollRef}>
        <header className="onb-top">
          <div className="wordmark">PULSO<span>.</span></div>
          {!showingResult && (
            <span className="onb-count num" aria-hidden="true">
              {String(stepIndex + 1).padStart(2, "0")}
              <span>/{String(flow.length).padStart(2, "0")}</span>
            </span>
          )}
          {onCancel && (
            <button className="btn-icon small" onClick={onCancel} aria-label="Cerrar evaluación">
              <X size={18} />
            </button>
          )}
        </header>

        {!showingResult ? (
          <>
            <div
              className="onb-progress"
              role="progressbar"
              aria-label={`Paso ${stepIndex + 1} de ${flow.length}`}
              aria-valuemin={1}
              aria-valuemax={flow.length}
              aria-valuenow={stepIndex + 1}
            >
              <span style={{ width: `${((stepIndex + 1) / flow.length) * 100}%` }} />
            </div>

            <main className="onb-body" key={stepIndex}>
              <section className="onb-copy">
                <p className="eyebrow">{step.eyebrow}</p>
                <h1>{step.title}</h1>
                <p className="onb-description">{step.description}</p>
              </section>

              {step.kind === "name" && (
                <NameStep
                  value={extras.name}
                  onChange={(name) => setExtras((current) => ({ ...current, name }))}
                  onSubmit={() => goTo(stepIndex + 1)}
                />
              )}

              {step.kind === "location" && (
                <LocationStep
                  location={extras.location}
                  equipment={extras.equipment}
                  onLocation={(location) => setExtras((current) => ({ ...current, location }))}
                  onEquipment={(equipment) => setExtras((current) => ({ ...current, equipment }))}
                />
              )}

              {step.kind === "multi" && (
                <ChoiceStepView
                  step={step}
                  selected={answers[step.key] as SelectionValue[]}
                  custom={answers.customAnswers[step.key]}
                  onToggle={(value) => toggleSelection(step.key, value)}
                  onCustom={(value) => setCustomAnswer(step.key, value)}
                />
              )}
            </main>

            <footer className="onb-actions">
              <button className="btn btn-ghost onb-back" onClick={() => goTo(stepIndex - 1)} disabled={stepIndex === 0}>
                <ArrowLeft size={18} />
                Atrás
              </button>
              <button className="btn btn-primary onb-next" disabled={!canContinue} onClick={() => goTo(stepIndex + 1)}>
                {continueLabel}
                <ArrowRight size={18} />
              </button>
            </footer>
          </>
        ) : (
          <ResultView profile={profile} onActivate={finish} onRestart={restart} onBack={() => goTo(flow.length - 1)} />
        )}

        <p className="onb-disclaimer">Orientación general de bienestar. No reemplaza una evaluación médica o nutricional.</p>
      </div>
    </div>
  );
}

function NameStep({ value, onChange, onSubmit }: { value: string; onChange: (value: string) => void; onSubmit: () => void }) {
  return (
    <form
      className="onb-name"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="sr-only" htmlFor="onb-name-input">Tu nombre</label>
      <input
        id="onb-name-input"
        className="onb-name-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Tu nombre"
        autoComplete="given-name"
        maxLength={40}
      />
      <p className="subtle">Tus datos se guardan sólo en este dispositivo.</p>
    </form>
  );
}

function OptionCard({ selected, label, detail, icon, onClick, multi = true }: { selected: boolean; label: string; detail: string; icon: ReactNode; onClick: () => void; multi?: boolean }) {
  return (
    <button
      type="button"
      className={cn("onb-option", selected && "selected")}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className="onb-option-icon" aria-hidden="true">{icon}</span>
      <span className="onb-option-text">
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <span className={cn("onb-option-check", !multi && "round")} aria-hidden="true">
        {selected && <Check size={14} strokeWidth={3} />}
      </span>
    </button>
  );
}

function ChoiceStepView({ step, selected, custom, onToggle, onCustom }: { step: ChoiceStep; selected: SelectionValue[]; custom: string; onToggle: (value: SelectionValue) => void; onCustom: (value: string) => void }) {
  const [showOther, setShowOther] = useState(custom.length > 0);
  return (
    <>
      <div className="onb-options">
        {step.options.map((option) => (
          <OptionCard
            key={option.value}
            selected={selected.includes(option.value)}
            label={option.label}
            detail={option.detail}
            icon={option.icon}
            onClick={() => onToggle(option.value)}
          />
        ))}
      </div>
      {showOther ? (
        <label className="field onb-other">
          <span>Otra respuesta <small className="subtle">opcional</small></span>
          <textarea value={custom} onChange={(event) => onCustom(event.target.value)} placeholder={step.otherPlaceholder} maxLength={180} rows={2} />
          <small className="subtle num">{custom.length}/180</small>
        </label>
      ) : (
        <button type="button" className="link-button onb-other-toggle" onClick={() => setShowOther(true)}>
          + Agregar otra respuesta
        </button>
      )}
    </>
  );
}

function LocationStep({ location, equipment, onLocation, onEquipment }: { location: TrainingLocation | null; equipment: TrainingEquipment[]; onLocation: (value: TrainingLocation) => void; onEquipment: (value: TrainingEquipment[]) => void }) {
  function toggle(value: TrainingEquipment) {
    onEquipment(equipment.includes(value) ? equipment.filter((item) => item !== value) : [...equipment, value]);
  }
  return (
    <>
      <div className="onb-options onb-options-two">
        {locationOptions.map((option) => (
          <OptionCard
            key={option.value}
            multi={false}
            selected={location === option.value}
            label={option.label}
            detail={option.detail}
            icon={option.icon}
            onClick={() => onLocation(option.value)}
          />
        ))}
      </div>
      {location === "home" && (
        <section className="onb-equipment" aria-label="Equipamiento disponible">
          <h2>¿Qué tienes en casa?</h2>
          <p className="subtle">Marca lo que tengas. Si no marcas nada, entrenaremos con tu peso corporal.</p>
          <div className="chips">
            {equipmentOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className="chip"
                aria-pressed={equipment.includes(option.value)}
                onClick={() => toggle(option.value)}
              >
                {equipment.includes(option.value) && <Check size={14} />}
                {option.label}
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function ResultView({ profile, onActivate, onRestart, onBack }: { profile: AssessmentProfile; onActivate: () => void; onRestart: () => void; onBack: () => void }) {
  const { recommendation } = profile;
  const place = profile.location === "gym"
    ? "En el gimnasio"
    : profile.equipment?.length
      ? `En casa · ${profile.equipment.length} ${profile.equipment.length === 1 ? "implemento" : "implementos"}`
      : "En casa · peso corporal";
  return (
    <main className="onb-result">
      <div className="onb-result-hero">
        <span className="onb-result-mark" aria-hidden="true"><Sparkles size={24} /></span>
        <p className="eyebrow">Tu plan inicial{profile.name ? ` · ${profile.name}` : ""}</p>
        <h1>{recommendation.focus}</h1>
        <p>{recommendation.dailyMessage}</p>
      </div>

      <div className="onb-result-grid">
        <article>
          <CalendarDays size={18} />
          <strong className="num">{recommendation.sessionsPerWeek}</strong>
          <small>sesiones por semana</small>
        </article>
        <article>
          <Clock3 size={18} />
          <strong className="num">{recommendation.sessionMinutes}</strong>
          <small>minutos por sesión</small>
        </article>
        <article className="wide">
          <Target size={18} />
          <span>
            <small>Prioridades</small>
            <b>{recommendation.goalLabel}</b>
          </span>
        </article>
        <article className="wide">
          {profile.location === "gym" ? <Building2 size={18} /> : <House size={18} />}
          <span>
            <small>Dónde</small>
            <b>{place}</b>
          </span>
        </article>
      </div>

      <div className="onb-habit">
        <span className="icon-tile"><Check size={18} /></span>
        <div>
          <small className="eyebrow">Tu primer hábito</small>
          <strong>{recommendation.firstHabit}</strong>
        </div>
      </div>

      {recommendation.caution && (
        <aside className="notice warn">
          <HeartPulse size={18} />
          <p>{recommendation.caution}</p>
        </aside>
      )}

      <div className="onb-result-actions">
        <button className="btn btn-primary btn-block" onClick={onActivate}>
          Activar mi plan
          <ArrowRight size={18} />
        </button>
        <div className="onb-result-links">
          <button className="btn btn-ghost btn-small" onClick={onBack}>
            <ArrowLeft size={16} />
            Volver
          </button>
          <button className="btn btn-ghost btn-small" onClick={onRestart}>Empezar de nuevo</button>
        </div>
      </div>
    </main>
  );
}

function buildProfile(answers: AssessmentAnswers, extras: Extras = emptyExtras): AssessmentProfile {
  const goals: Record<Goal, { label: string; focus: string; message: string }> = {
    strength: { label: "Sentirme más fuerte", focus: "Fuerza que puedas sostener", message: "Construiremos fuerza con movimientos controlados y alcanzables." },
    weight: { label: "Mejorar mi peso", focus: "Movimiento y alimentación simple", message: "Sumaremos movimiento constante y decisiones simples en tus comidas." },
    energy: { label: "Tener más energía", focus: "Energía para tu día", message: "Activaremos tu cuerpo sin agotar tus reservas." },
    habits: { label: "Crear hábitos", focus: "Constancia antes que perfección", message: "Repetiremos acciones pequeñas que puedas sostener mañana." },
  };
  const firstHabits: Record<Barrier, string> = {
    time: "Reserva en tu agenda tu próximo bloque de movimiento",
    consistency: "Completa sólo diez minutos, incluso en un día difícil",
    food: "Define con anticipación tu próxima comida principal",
    discomfort: "Antes de entrenar, revisa en 20 segundos cómo llegas",
  };
  const limitationLabels: Record<Exclude<Limitation, "none">, string> = { knees: "rodillas", back: "espalda", shoulders: "hombros" };
  const primaryGoal = answers.goals[0] ?? "habits";
  const goal = goals[primaryGoal];
  const goalLabels = answers.goals.map((item) => goals[item].label);
  if (answers.customAnswers.goals.trim()) goalLabels.push(answers.customAnswers.goals.trim());
  const additionalGoals = goalLabels.slice(1);

  // Frecuencia: según la actividad actual; si el tiempo es el gran freno, no más de 3.
  const activityScores: Record<Activity, number> = { sedentary: 2, walking: 2, some: 3, regular: 4 };
  const baseSessions = answers.activities.length ? Math.max(...answers.activities.map((item) => activityScores[item])) : 2;
  const sessionsPerWeek = answers.barriers.includes("time") ? Math.min(3, baseSessions) : baseSessions;

  // Duración: el bloque más corto marcado; 30 min sólo si ya hay base de entrenamiento.
  const trained = answers.activities.includes("some") || answers.activities.includes("regular");
  const shortestTime = answers.times.length ? Math.min(...answers.times) : 20;
  const sessionMinutes = shortestTime >= 30 ? (trained ? 30 : 20) : shortestTime;

  const firstBarrier = answers.barriers[0];
  const customBarrier = answers.customAnswers.barriers.trim();
  const firstHabit = firstBarrier ? firstHabits[firstBarrier] : customBarrier ? `Define una acción pequeña para: ${customBarrier}` : firstHabits.consistency;
  const selectedLimitations = answers.limitations.filter((item): item is Exclude<Limitation, "none"> => item !== "none");
  const customLimitation = answers.customAnswers.limitations.trim();
  const areasToProtect = [...selectedLimitations.map((item) => limitationLabels[item]), ...(customLimitation ? [customLimitation] : [])];
  const caution = areasToProtect.length
    ? `Cuidaremos especialmente ${areasToProtect.join(", ")}. Comienza con movimientos suaves y detente si aparece dolor intenso o persistente; en ese caso, consulta a un profesional.`
    : undefined;
  const name = extras.name.trim();

  return {
    ...answers,
    createdAt: new Date().toISOString(),
    ...(name ? { name } : {}),
    location: extras.location ?? "home",
    equipment: extras.location === "gym" ? [] : extras.equipment,
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
