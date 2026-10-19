"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowLeftRight, ArrowRight, BicepsFlexed, Building2, CircleCheck, Dumbbell, Footprints, House, PersonStanding, Sprout, X, Zap } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui";
import { onboardingPhoto, resultPhoto } from "@/data/onboarding-photos";
import {
  answersFromProfile,
  assessmentSteps,
  buildProfile,
  canContinue,
  considerationOptions,
  emptyAnswers,
  goalOptions,
  placeOptions,
  toggleConsideration,
  type AssessmentAnswers,
  type AssessmentProfile,
  type AssessmentStep,
  type Consideration,
  type Goal,
  type Place,
} from "@/lib/assessment";
import { usePreference, useProfile, useSettings } from "@/lib/store";
import { AssessmentResult } from "./assessment-result";
import { AssessmentSplash } from "./assessment-splash";
import { EquipmentStep, OptionList, TimeStep } from "./assessment-steps";

const iconSize = 20;

const stepCopy: Record<AssessmentStep, { eyebrow: string; title: string; description: string }> = {
  goal: { eyebrow: "Tu objetivo", title: "¿Qué quieres conseguir?", description: "Elige uno. Puedes cambiarlo cuando quieras." },
  place: { eyebrow: "Tu lugar", title: "¿Dónde entrenas?", description: "Armamos cada sesión con lo que hay ahí." },
  equipment: { eyebrow: "Tu equipamiento", title: "¿Qué tienes en casa?", description: "Marca lo que tengas. En el gimnasio asumimos equipamiento completo." },
  time: { eyebrow: "Tu tiempo", title: "¿Cuánto puedes entrenar?", description: "Tu punto de partida en días y minutos." },
  consider: { eyebrow: "Para cuidarte", title: "¿Hay algo que debamos considerar?", description: "Marca todo lo que aplique. PULSO no realiza diagnósticos." },
};

const goalIcons: Record<Exclude<Goal, "weight">, ReactNode> = {
  strength: <Dumbbell size={iconSize} />,
  energy: <Zap size={iconSize} />,
  muscle: <BicepsFlexed size={iconSize} />,
  habits: <Footprints size={iconSize} />,
};
const placeIcons: Record<Place, ReactNode> = { home: <House size={iconSize} />, gym: <Building2 size={iconSize} />, both: <ArrowLeftRight size={iconSize} /> };
const considerIcons: Record<Consideration, ReactNode> = {
  beginner: <Sprout size={iconSize} />,
  knees: <PersonStanding size={iconSize} />,
  back: <PersonStanding size={iconSize} />,
  shoulders: <PersonStanding size={iconSize} />,
  none: <CircleCheck size={iconSize} />,
};

const disclaimer = "Orientación general de entrenamiento. No reemplaza una evaluación médica.";
const focusable = 'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** «02», «05»: números de paso con dos cifras, como en un índice editorial. */
const pad = (value: number) => String(value).padStart(2, "0");

/** Portada: visible, saliendo (se desvanece sobre la primera pregunta) o cerrada. */
type Intro = "open" | "leaving" | "closed";

/**
 * Evaluación inicial en cinco decisiones (cuatro si entrenas sólo en el gimnasio). Al repetirla desde
 * Perfil empieza con tus respuestas actuales y conserva tu fecha de inicio, nombre y equipamiento.
 */
export function WellnessAssessment({ onComplete, onCancel }: { onComplete: (profile: AssessmentProfile) => void; onCancel?: () => void }) {
  const retake = Boolean(onCancel);
  const [previous] = useProfile();
  const [preference, setPreference] = usePreference();
  const [settings, updateSettings] = useSettings();
  const [answers, setAnswers] = useState<AssessmentAnswers>(() => (retake && previous ? answersFromProfile(previous, preference.location, preference.equipment, settings.weeklyGoal) : emptyAnswers));
  // Mientras no toques los minutos, «Moverme más» propone 30 y lo demás 45.
  const [minutesTouched, setMinutesTouched] = useState(retake);
  const [name, setName] = useState(settings.name);
  const [index, setIndex] = useState(0);
  // 1 avanza (entra desde la derecha), -1 retrocede (entra desde la izquierda).
  const [direction, setDirection] = useState<1 | -1>(1);
  // La portada es la bienvenida de la primera vez; al repetir la evaluación desde Perfil se empieza directo.
  const [intro, setIntro] = useState<Intro>(retake ? "closed" : "open");
  const scrollRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const steps = assessmentSteps(answers.place);
  const showingResult = index >= steps.length;
  const step = steps[Math.min(index, steps.length - 1)];
  const copy = stepCopy[step];
  const photo = onboardingPhoto(step, previous?.sex);
  const profile = buildProfile(answers, previous);

  // La pantalla de evaluación tapa la página: sin desplazamiento detrás mientras está abierta.
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, []);

  // Cada pregunta nueva recibe el foco en su título (lectores de pantalla y teclado).
  useEffect(() => {
    if (intro === "closed" && !showingResult) titleRef.current?.focus({ preventScroll: true });
  }, [intro, index, showingResult]);

  function goTo(next: number) {
    const target = Math.max(0, Math.min(steps.length, next));
    setDirection(target < index ? -1 : 1);
    setIndex(target);
    scrollRef.current?.scrollTo({ top: 0 });
  }

  function goBack() {
    if (index > 0) goTo(index - 1);
    else if (!retake) setIntro("open");
  }

  function update(patch: Partial<AssessmentAnswers>) {
    setAnswers((current) => ({ ...current, ...patch }));
  }

  function pickGoal(goal: Exclude<Goal, "weight">) {
    update(minutesTouched ? { goal } : { goal, minutes: goal === "habits" ? 30 : 45 });
  }

  function finish() {
    const trimmed = name.trim();
    // Se conserva lo ya configurado (equipamiento del gimnasio, pesos de casa): cambia el lugar y, en casa, el equipo de casa.
    setPreference((current) => ({ ...current, location: profile.location ?? "home", ...(answers.place !== "gym" ? { equipment: answers.equipment } : {}) }));
    updateSettings({ ...(trimmed ? { name: trimmed } : {}), weeklyGoal: answers.days });
    onComplete(trimmed ? { ...profile, name: trimmed } : profile);
  }

  function restart() {
    setAnswers(emptyAnswers);
    setMinutesTouched(false);
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

  const questions = (
    <>
      <aside className="onb-media photo grain on-dark" aria-hidden="true">
        <Image key={photo} src={photo} alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="photo-img onb-media-photo" />
        <div className="onb-media-top photo-content">
          <span className="meta">PULSO · Tu plan</span>
          <span className="meta">Entrenamiento que se adapta a tu vida.</span>
        </div>
        <p key={step} className="onb-media-num photo-content">
          <span className="num-display">{pad(index + 1)}</span>
          <span className="onb-media-total">/{pad(steps.length)}</span>
        </p>
      </aside>

      <div className="onb-scroll" ref={scrollRef}>
        <header className="onb-head">
          <div className="onb-top">
            <Logo />
            {onCancel && (
              <button type="button" className="btn-icon small" onClick={onCancel} aria-label="Cerrar evaluación">
                <X size={18} />
              </button>
            )}
          </div>
          <div className="onb-progress" role="progressbar" aria-label={`Paso ${index + 1} de ${steps.length}`} aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={index + 1}>
            <span style={{ "--value": (index + 1) / steps.length } as CSSProperties} />
          </div>
        </header>

        <div className="onb-stage">
          <section key={step} className="onb-step" aria-labelledby="onb-step-title">
            <div className="onb-band photo" aria-hidden="true">
              <Image src={photo} alt="" fill sizes="100vw" className="photo-img" />
            </div>
            <div className="onb-step-index">
              <p className="onb-num" aria-hidden="true">
                <span className="num-display">{pad(index + 1)}</span>
                <span className="onb-num-total">/{pad(steps.length)}</span>
              </p>
              <p className="meta">{copy.eyebrow}</p>
            </div>
            <div className="onb-step-copy">
              <h1 id="onb-step-title" ref={titleRef} tabIndex={-1} className="onb-title">{copy.title}</h1>
              <p className="onb-description">{copy.description}</p>
            </div>

            {step === "goal" && (
              <OptionList round options={goalOptions.map((option) => ({ ...option, icon: goalIcons[option.value] }))} isSelected={(value) => answers.goal === value} onPick={pickGoal} />
            )}
            {step === "place" && (
              <OptionList round options={placeOptions.map((option) => ({ ...option, icon: placeIcons[option.value] }))} isSelected={(value) => answers.place === value} onPick={(place) => update({ place })} />
            )}
            {step === "equipment" && <EquipmentStep value={answers.equipment} onChange={(equipment) => update({ equipment })} />}
            {step === "time" && (
              <TimeStep days={answers.days} minutes={answers.minutes} onDays={(days) => update({ days })} onMinutes={(minutes) => { setMinutesTouched(true); update({ minutes }); }} />
            )}
            {step === "consider" && (
              <OptionList
                options={considerationOptions.map((option) => ({ ...option, icon: considerIcons[option.value] }))}
                isSelected={(value) => answers.considerations.includes(value)}
                onPick={(value) => update({ considerations: toggleConsideration(answers.considerations, value) })}
              />
            )}

            <p className="onb-disclaimer">{disclaimer}</p>
          </section>

          <footer className="onb-actions">
            <Button variant="secondary" size="l" className="onb-back" onClick={goBack} disabled={index === 0 && retake}>
              <ArrowLeft size={18} />
              Atrás
            </Button>
            <Button size="l" className="onb-next" disabled={!canContinue(step, answers)} onClick={() => goTo(index + 1)}>
              {index === steps.length - 1 ? "Ver mi plan" : "Continuar"}
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
          name={name}
          onName={setName}
          backdrop={resultPhoto(profile.location, previous?.sex)}
          retake={retake}
          disclaimer={disclaimer}
          onActivate={finish}
          onBack={() => goTo(steps.length - 1)}
          onRestart={restart}
          onCancel={onCancel}
        />
      ) : questions)}
      {intro !== "closed" && (
        <AssessmentSplash
          steps={assessmentSteps(null).length}
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
