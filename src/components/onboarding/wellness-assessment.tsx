"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Activity as ActivityIcon,
  Armchair,
  ArrowLeft,
  ArrowRight,
  BatteryLow,
  Building2,
  CircleCheck,
  CircleDashed,
  Clock3,
  Dumbbell,
  Flame,
  Footprints,
  Hourglass,
  House,
  Mars,
  PersonStanding,
  Repeat,
  Scale,
  Timer,
  Utensils,
  Venus,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui";
import { usePreference, useSettings } from "@/lib/store";
import type { TrainingEquipment, TrainingLocation } from "@/types";
import { AssessmentResult } from "./assessment-result";
import { AssessmentSplash } from "./assessment-splash";
import { ChoiceStepView, LocationStep, NameStep, SexStep } from "./assessment-steps";

type Goal = "strength" | "weight" | "energy" | "habits";
type Activity = "sedentary" | "walking" | "some" | "regular";
type TimeAvailable = 10 | 20 | 30;
type Limitation = "none" | "knees" | "back" | "shoulders";
type Barrier = "time" | "consistency" | "food" | "discomfort";
export type StepKey = "goals" | "activities" | "times" | "limitations" | "barriers";
export type SelectionValue = string | number;

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
  /** Cómo te identificas: elige las fotos y el color de la app (se cambia en Ajustes). */
  sex?: "female" | "male" | "unspecified";
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

export interface StepOption {
  value: SelectionValue;
  label: string;
  detail: string;
  icon: ReactNode;
}

export interface ChoiceStep {
  kind: "multi";
  key: StepKey;
  eyebrow: string;
  title: string;
  description: string;
  otherPlaceholder: string;
  options: StepOption[];
}

interface SpecialStep {
  kind: "name" | "sex" | "location";
  eyebrow: string;
  title: string;
  description: string;
}

type FlowStep = ChoiceStep | SpecialStep;

const iconSize = 20;

const flow: FlowStep[] = [
  {
    kind: "name",
    eyebrow: "Para empezar",
    title: "¿Cómo te llamamos?",
    description: "Así personalizamos tus saludos. Puedes dejarlo en blanco.",
  },
  {
    kind: "sex",
    eyebrow: "Para ti",
    title: "¿Cómo te identificas?",
    description: "Elegimos las fotos y el color de la app para ti. Puedes cambiarlo cuando quieras en Ajustes.",
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

type Sex = NonNullable<AssessmentProfile["sex"]>;

interface Extras {
  name: string;
  sex: Sex | null;
  location: TrainingLocation | null;
  equipment: TrainingEquipment[];
}

const emptyExtras: Extras = { name: "", sex: null, location: null, equipment: [] };

const sexOptions: Array<{ value: Sex; label: string; detail: string; icon: ReactNode }> = [
  { value: "female", label: "Mujer", detail: "Fotos de mujeres y color magenta", icon: <Venus size={iconSize} /> },
  { value: "male", label: "Hombre", detail: "Fotos de hombres y color fuego", icon: <Mars size={iconSize} /> },
  { value: "unspecified", label: "Prefiero no decir", detail: "Fotos de ambos y color fuego", icon: <CircleDashed size={iconSize} /> },
];

/** Foto del panel editorial de escritorio (las preguntas en móvil van sin foto, limpias). */
const sidePhoto = "/images/editorial/brisk-march-start.webp";
const disclaimer = "Orientación general de bienestar. No reemplaza una evaluación médica o nutricional.";
const focusable = 'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** «02», «07»: números de paso con dos cifras, como en un índice editorial. */
const pad = (value: number) => String(value).padStart(2, "0");

/** Portada: visible, saliendo (se desvanece sobre la primera pregunta) o cerrada. */
type Intro = "open" | "leaving" | "closed";

export function WellnessAssessment({ onComplete, onCancel }: { onComplete: (profile: AssessmentProfile) => void; onCancel?: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  // 1 avanza (entra desde la derecha), -1 retrocede (entra desde la izquierda).
  const [direction, setDirection] = useState<1 | -1>(1);
  // La portada es la bienvenida de la primera vez; al repetir la evaluación desde Perfil se empieza directo.
  const [intro, setIntro] = useState<Intro>(onCancel ? "closed" : "open");
  const [answers, setAnswers] = useState<AssessmentAnswers>(emptyAnswers);
  const [, setPreference] = usePreference();
  const [settings, updateSettings] = useSettings();
  // Al repetir la evaluación, el nombre guardado aparece ya escrito.
  const [extras, setExtras] = useState<Extras>(() => ({ ...emptyExtras, name: settings.name }));
  const scrollRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const showingResult = stepIndex === flow.length;
  const step = flow[Math.min(stepIndex, flow.length - 1)];
  const profile = useMemo(() => buildProfile(answers, extras), [answers, extras]);

  const canContinue = step.kind === "multi"
    ? (answers[step.key] as SelectionValue[]).length > 0 || answers.customAnswers[step.key].trim().length > 0
    : step.kind === "name" || (step.kind === "sex" ? extras.sex !== null : extras.location !== null);
  const canGoBack = stepIndex > 0 || !onCancel;

  // La pantalla de evaluación tapa la página: sin desplazamiento detrás mientras está abierta.
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, []);

  // Vista previa del color automático mientras se responde (si no hay uno elegido en Ajustes).
  useEffect(() => {
    if (settings.accent || !extras.sex) return;
    const root = document.documentElement;
    const previous = root.getAttribute("data-accent");
    if (extras.sex === "female") root.setAttribute("data-accent", "magenta");
    else root.removeAttribute("data-accent");
    return () => {
      if (previous) root.setAttribute("data-accent", previous);
      else root.removeAttribute("data-accent");
    };
  }, [extras.sex, settings.accent]);

  // Cada pregunta nueva recibe el foco en su título (lectores de pantalla y teclado).
  useEffect(() => {
    if (intro === "closed" && !showingResult) titleRef.current?.focus({ preventScroll: true });
  }, [intro, stepIndex, showingResult]);

  function goTo(index: number) {
    const next = Math.max(0, Math.min(flow.length, index));
    setDirection(next < stepIndex ? -1 : 1);
    setStepIndex(next);
    scrollRef.current?.scrollTo({ top: 0 });
  }

  function goBack() {
    if (stepIndex > 0) goTo(stepIndex - 1);
    else if (!onCancel) setIntro("open");
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

  // Diálogo modal: Escape cierra (si se puede cerrar) y el foco no sale de la evaluación.
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && onCancel) {
      event.stopPropagation();
      onCancel();
      return;
    }
    if (event.key !== "Tab") return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(focusable)).filter((item) => !item.closest("[inert]"));
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  const continueLabel = step.kind === "name" && !extras.name.trim()
    ? "Omitir"
    : stepIndex === flow.length - 1
      ? "Ver mi plan"
      : "Continuar";

  const questions = (
    <>
      <aside className="onb-media photo grain on-dark" aria-hidden="true">
        <Image src={sidePhoto} alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="photo-img" />
        <div className="onb-media-top photo-content">
          <span className="meta">PULSO · Evaluación inicial</span>
          <span className="meta">Tu salud en movimiento.</span>
        </div>
        <p key={stepIndex} className="onb-media-num photo-content">
          <span className="num-display">{pad(stepIndex + 1)}</span>
          <span className="onb-media-total">/{pad(flow.length)}</span>
        </p>
      </aside>

      <div className="onb-scroll" ref={scrollRef}>
        <header className="onb-head">
          <div className="onb-top">
            <span className="wordmark">PULSO<span>.</span></span>
            {onCancel && (
              <button type="button" className="btn-icon small" onClick={onCancel} aria-label="Cerrar evaluación">
                <X size={18} />
              </button>
            )}
          </div>
          <div
            className="onb-progress"
            role="progressbar"
            aria-label={`Paso ${stepIndex + 1} de ${flow.length}`}
            aria-valuemin={1}
            aria-valuemax={flow.length}
            aria-valuenow={stepIndex + 1}
          >
            <span style={{ "--value": (stepIndex + 1) / flow.length } as CSSProperties} />
          </div>
        </header>

        <div className="onb-stage">
          <section key={stepIndex} className="onb-step" aria-labelledby="onb-step-title">
            <div className="onb-step-index">
              <p className="onb-num" aria-hidden="true">
                <span className="num-display">{pad(stepIndex + 1)}</span>
                <span className="onb-num-total">/{pad(flow.length)}</span>
              </p>
              <p className="meta">{step.eyebrow}</p>
            </div>
            <div className="onb-step-copy">
              <h1 id="onb-step-title" ref={titleRef} tabIndex={-1} className="onb-title">{step.title}</h1>
              <p className="onb-description">{step.description}</p>
            </div>

            {step.kind === "name" && (
              <NameStep
                value={extras.name}
                onChange={(name) => setExtras((current) => ({ ...current, name }))}
                onSubmit={() => goTo(stepIndex + 1)}
              />
            )}

            {step.kind === "sex" && (
              <SexStep options={sexOptions} value={extras.sex} onChange={(sex) => setExtras((current) => ({ ...current, sex }))} />
            )}

            {step.kind === "location" && (
              <LocationStep
                options={locationOptions}
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

            <p className="onb-disclaimer">{disclaimer}</p>
          </section>

          <footer className="onb-actions">
            <Button variant="secondary" size="l" className="onb-back" onClick={goBack} disabled={!canGoBack}>
              <ArrowLeft size={18} />
              Atrás
            </Button>
            <Button size="l" className="onb-next" disabled={!canContinue} onClick={() => goTo(stepIndex + 1)}>
              {continueLabel}
              <ArrowRight size={18} />
            </Button>
          </footer>
        </div>
      </div>
    </>
  );

  const view = (
    <div className="onb" style={{ "--dir": direction } as CSSProperties} role="dialog" aria-modal="true" aria-label="Evaluación inicial de PULSO" onKeyDown={onKeyDown}>
      {intro !== "open" && (showingResult ? (
        <AssessmentResult
          profile={profile}
          retake={Boolean(onCancel)}
          disclaimer={disclaimer}
          onActivate={finish}
          onBack={() => goTo(flow.length - 1)}
          onRestart={restart}
          onCancel={onCancel}
        />
      ) : questions)}
      {intro !== "closed" && (
        <AssessmentSplash
          steps={flow.length}
          leaving={intro === "leaving"}
          onStart={() => { setDirection(1); setIntro("leaving"); }}
          onLeft={() => setIntro("closed")}
        />
      )}
    </div>
  );

  // Se monta en <body>: así no la afecta la animación de entrada de la ruta (un transform en un ancestro
  // descoloca los elementos fijos). Sólo se muestra en el cliente (tras hidratar o al tocar un botón).
  return typeof document === "undefined" ? null : createPortal(view, document.body);
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
    ...(extras.sex ? { sex: extras.sex } : {}),
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
