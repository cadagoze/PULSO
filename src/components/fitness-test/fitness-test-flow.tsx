"use client";

import Link from "@/components/ui/app-link";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowRight, Check, HeartPulse, Minus, Play, Plus, RotateCcw, ShieldAlert, X } from "lucide-react";
import { ExerciseVisual } from "@/components/exercises/exercise-visual";
import { SoundToggle } from "@/components/session/interval-timer";
import { SessionScreen, useViewport } from "@/components/session/session-screen";
import { useCountdownCues } from "@/components/session/use-countdown-cues";
import { ButtonLink, SegmentedControl, Stepper } from "@/components/ui";
import { WorkoutTimer } from "@/components/ui/workout-timer";
import { fitnessTests, PULSE_SECONDS, REST_SECONDS, SQUAT_SECONDS, STEP_BPM, STEP_SECONDS, type FitnessTestDef, type FitnessTestId } from "@/data/fitness-test";
import { exercises } from "@/data/mock-data";
import { beep, primeAudio, speak, startMetronome, useWakeLock, vibrate } from "@/lib/feedback";
import { testStatus, valueLabel, type FitnessSex, type FitnessTestEntry, type PushupVariant } from "@/lib/fitness-test";
import { ageFrom } from "@/lib/nutrition";
import { useFitnessTests, useNutritionProfile, useProfile, useSettings } from "@/lib/store";
import { clockLabel, newId } from "@/lib/training";
import { useNow } from "@/lib/use-now";
import { removePersistentKey, usePersistentState } from "@/lib/use-persistent-state";
import { cn, localDateKey } from "@/lib/utils";
import { TestReport } from "./test-report";

/** Lo anotado hasta ahora (sólo en este equipo): si la app se cierra a mitad, se sigue el mismo día. */
interface Draft {
  day: string;
  age: number;
  variant: PushupVariant;
  results: Partial<Record<FitnessTestId, number>>;
  index: number;
  /** Cuándo terminó la prueba anterior (para el descanso sugerido). */
  restFrom?: number;
}
const DRAFT_KEY = "pulso:fitness-test-draft";

type Stage =
  | { kind: "intro" }
  | { kind: "brief" }
  | { kind: "run"; id: string; startedAt: number }
  | { kind: "record"; suggested: number | null }
  | { kind: "done"; entry: FitnessTestEntry | null; previous: FitnessTestEntry | null };

const PREP_SECONDS = 5;

interface Segment { phase: "prep" | "work" | "pulse-prep" | "pulse" | "hold"; seconds: number; title: string; hint: string; voice?: string }

function segmentsFor(id: FitnessTestId): Segment[] {
  const prep: Segment = { phase: "prep", seconds: PREP_SECONDS, title: "Prepárate", hint: "Ponte en posición" };
  if (id === "squats") return [prep, { phase: "work", seconds: SQUAT_SECONDS, title: "¡Sentadillas!", hint: "Cuenta cada una bien hecha", voice: "¡Vamos!" }];
  if (id === "step") {
    return [
      prep,
      { phase: "work", seconds: STEP_SECONDS, title: "Sube y baja", hint: "Un paso con cada sonido", voice: "Arriba, arriba, abajo, abajo" },
      { phase: "pulse-prep", seconds: 5, title: "Siéntate", hint: "Busca tu pulso en el cuello o la muñeca", voice: "Siéntate y busca tu pulso" },
      { phase: "pulse", seconds: PULSE_SECONDS, title: "Cuenta tus latidos", hint: "En silencio, hasta que suene el final", voice: "Cuenta ahora" },
    ];
  }
  return [prep, { phase: "hold", seconds: Infinity, title: "¡Aguanta!", hint: "Cuerpo recto y abdomen firme", voice: "¡Aguanta!" }];
}

const ranges: Record<FitnessTestId, { min: number; max: number; question: string; label: string }> = {
  pushups: { min: 0, max: 150, question: "¿Cuántas flexiones hiciste?", label: "flexiones" },
  squats: { min: 0, max: 120, question: "¿Cuántas sentadillas hiciste?", label: "sentadillas" },
  plank: { min: 0, max: 1200, question: "¿Cuántos segundos aguantaste?", label: "segundos" },
  step: { min: 40, max: 220, question: "¿Cuántos latidos contaste?", label: "latidos en 1 minuto" },
};

/** «30 segundos», «1 minuto», «1 minuto 30». */
function holdLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (!minutes) return `${rest} segundos`;
  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}${rest ? ` ${rest}` : ""}`;
}

/** Test físico guiado: cuatro pruebas con instrucciones, temporizador con voz y registro del resultado. */
export function FitnessTestFlow() {
  const now = useNow(250);
  const [settings] = useSettings();
  const [profile] = useProfile();
  const [nutrition] = useNutritionProfile();
  const [tests, setTests] = useFitnessTests();
  const [draft, setDraft] = usePersistentState<Draft | null>(DRAFT_KEY, null);
  const [stage, setStage] = useState<Stage>({ kind: "intro" });
  const [age, setAge] = useState<number | null>(null);
  const today = now ? localDateKey(new Date(now)) : "";
  const sex: FitnessSex = profile?.sex ?? nutrition?.sex ?? "unspecified";
  const status = testStatus(tests, today || "2000-01-01");
  const sound = settings.sound;
  const voice = settings.sound && settings.voice !== false;
  const current = draft && draft.day === today ? draft : null;
  const yearsSinceLast = status.last && now ? Math.floor((now - new Date(status.last.completedAt).getTime()) / (365.25 * 86_400_000)) : 0;
  const defaultAge = nutrition && now ? ageFrom(nutrition.birthYear, new Date(now)) : status.last ? status.last.age + yearsSinceLast : 30;

  function begin() {
    primeAudio();
    if (!current) setDraft({ day: today, age: age ?? defaultAge, variant: status.last?.pushupVariant ?? "standard", results: {}, index: 0 });
    setStage({ kind: "brief" });
  }

  function startRun() {
    primeAudio();
    if (voice) speak("Prepárate");
    setStage({ kind: "run", id: newId("test"), startedAt: Date.now() });
  }

  function advance(value: number | undefined) {
    if (!current) return;
    const test = fitnessTests[current.index];
    const results = value === undefined ? current.results : { ...current.results, [test.id]: value };
    if (current.index + 1 < fitnessTests.length) {
      setDraft({ ...current, results, index: current.index + 1, restFrom: Date.now() });
      setStage({ kind: "brief" });
      return;
    }
    const stamp = new Date();
    const entry: FitnessTestEntry | null = Object.keys(results).length
      ? { id: newId("test"), date: localDateKey(stamp), completedAt: stamp.toISOString(), age: current.age, sex, results, ...(results.pushups !== undefined ? { pushupVariant: current.variant } : {}) }
      : null;
    if (entry) setTests((items) => [...items, entry]);
    removePersistentKey(DRAFT_KEY);
    setStage({ kind: "done", entry, previous: status.last });
  }

  if (!now) return <SessionScreen><div className="ft-screen" aria-busy="true" /></SessionScreen>;

  if (stage.kind === "done") return <SessionScreen><Done entry={stage.entry} previous={stage.previous} /></SessionScreen>;

  if (stage.kind === "intro" || !current) {
    return (
      <SessionScreen>
        <Intro age={age ?? defaultAge} onAge={setAge} resumeAt={current ? current.index : null} onStart={begin} onRestart={() => removePersistentKey(DRAFT_KEY)} />
      </SessionScreen>
    );
  }

  const test = fitnessTests[current.index];
  return (
    <SessionScreen>
      {stage.kind === "brief" && (
        <Brief
          test={test}
          index={current.index}
          variant={current.variant}
          onVariant={(variant) => setDraft({ ...current, variant })}
          restLeft={current.restFrom ? Math.max(0, Math.ceil(REST_SECONDS - (now - current.restFrom) / 1000)) : null}
          onStart={test.id === "pushups" ? () => setStage({ kind: "record", suggested: null }) : startRun}
          onSkip={() => advance(undefined)}
        />
      )}
      {stage.kind === "run" && (
        <Run
          key={stage.id}
          test={test}
          run={stage}
          sound={sound}
          voice={voice}
          vibration={settings.vibration}
          keepAwake={settings.keepAwake}
          onFinish={(value) => setStage({ kind: "record", suggested: value })}
          onCancel={() => setStage({ kind: "brief" })}
        />
      )}
      {stage.kind === "record" && (
        <Record
          key={`${test.id}-${stage.suggested}`}
          test={test}
          suggested={stage.suggested}
          onSave={(value) => advance(value)}
          onRetry={() => setStage({ kind: "brief" })}
        />
      )}
    </SessionScreen>
  );
}

function ExitButton() {
  return <Link href="/progreso?tab=test" className="ses-glass ses-round" aria-label="Salir del test"><X size={20} /></Link>;
}

function Intro({ age, onAge, resumeAt, onStart, onRestart }: { age: number; onAge: (age: number) => void; resumeAt: number | null; onStart: () => void; onRestart: () => void }) {
  return (
    <div className="ses-iv ft-intro">
      <header className="ses-iv-head">
        <div className="ses-iv-bar">
          <ExitButton />
          <SoundToggle />
        </div>
        <p className="meta">Cada 4 semanas</p>
        <h1 className="ses-iv-title">Test físico</h1>
        <p className="ses-iv-lead">Cuatro pruebas, unos 12 minutos. Mide tu punto de partida y repítelo cada 4 semanas para ver cuánto mejoras.</p>
      </header>

      <ol className="ft-plan">
        {fitnessTests.map((test, index) => (
          <li key={test.id} className="ft-plan-item rise" style={{ "--i": index } as CSSProperties}>
            <span className="ft-plan-num num" aria-hidden="true">{index + 1}</span>
            <span className="grow"><strong>{test.title}</strong><small>{test.measure}</small></span>
            {resumeAt !== null && index < resumeAt && <Check size={18} className="ft-plan-done" aria-label="Hecha" />}
          </li>
        ))}
      </ol>

      <section className="ft-intro-box" aria-label="Antes de empezar">
        {resumeAt === null && (
          <div className="toggle-row">
            <span><strong>Tu edad</strong><small>Para compararte con personas de tu edad</small></span>
            <Stepper value={age} onChange={onAge} min={14} max={90} label="años" />
          </div>
        )}
        <p className="ft-intro-need">Necesitas un escalón o cajón firme y espacio para hacer una plancha.</p>
      </section>

      <p className="notice warn ft-safety">
        <ShieldAlert size={18} />
        <span>Si tienes una lesión, una condición cardiaca o estás embarazada, consulta antes. Salta las pruebas que te generen dolor y detente si sientes mareo o dolor en el pecho.</span>
      </p>

      <div className="ses-dock">
        <div className="ses-dock-inner ft-dock">
          {resumeAt !== null && <button type="button" className="btn btn-ghost ft-skip" onClick={onRestart}>De cero</button>}
          <button type="button" className="btn btn-primary btn-large ses-cta" onClick={onStart}>
            <span className="ses-cta-label">
              {resumeAt !== null ? <>Seguir · prueba {resumeAt + 1} de {fitnessTests.length}</> : <>Empezar el test</>}
              <ArrowRight size={18} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Progress({ index }: { index: number }) {
  return (
    <p className="ft-progress" aria-label={`Prueba ${index + 1} de ${fitnessTests.length}`}>
      {fitnessTests.map((test, step) => <i key={test.id} className={cn(step < index && "is-done", step === index && "is-current")} aria-hidden="true" />)}
    </p>
  );
}

function Brief({ test, index, variant, onVariant, restLeft, onStart, onSkip }: {
  test: FitnessTestDef;
  index: number;
  variant: PushupVariant;
  onVariant: (variant: PushupVariant) => void;
  restLeft: number | null;
  onStart: () => void;
  onSkip: () => void;
}) {
  const exercise = exercises.find((item) => item.id === test.exerciseId);
  const label = test.id === "pushups" ? "Ya las hice: anotar" : test.id === "squats" ? "Empezar · 1 minuto" : test.id === "step" ? "Empezar · 3 minutos" : "Empezar la plancha";
  return (
    <div className="ft-brief">
      <header className="ft-bar">
        <ExitButton />
        <Progress index={index} />
        <SoundToggle />
      </header>
      {exercise && <ExerciseVisual exercise={exercise} size="immersive" className="ft-visual" eager />}
      <div className="ft-brief-body">
        <p className="meta">Prueba {index + 1} de {fitnessTests.length}</p>
        <h1 className="ft-title">{test.title}</h1>
        {restLeft !== null && (
          <p className={cn("ft-rest", restLeft === 0 && "is-ready")} role="status">
            {restLeft > 0 ? <>Descanso sugerido <b className="num">{clockLabel(restLeft)}</b></> : "Listo cuando quieras"}
          </p>
        )}
        {test.id === "pushups" && (
          <SegmentedControl
            label="Tipo de flexión"
            options={[{ value: "standard", label: "Normales" }, { value: "knees", label: "Rodillas apoyadas" }]}
            value={variant}
            onChange={onVariant}
          />
        )}
        <ol className="ft-steps">
          {test.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
        {test.id === "step" && <p className="ft-note">La referencia es para 30 cm: con un escalón más bajo tu resultado se ve un poco mejor. Lo importante es usar siempre el mismo.</p>}
      </div>
      <div className="ses-dock">
        <div className="ses-dock-inner ft-dock">
          <button type="button" className="btn btn-ghost ft-skip" onClick={onSkip}>Saltar</button>
          <button type="button" className="btn btn-primary btn-large ses-cta" onClick={onStart}>
            <span className="ses-cta-label">{test.id === "pushups" ? <Check size={18} /> : <Play size={18} fill="currentColor" />}{label}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** Arriba, arriba, abajo, abajo: se enciende al ritmo del metrónomo (CSS, sin volver a dibujar). */
function StepBeat({ sound }: { sound: boolean }) {
  useEffect(() => (sound ? startMetronome(STEP_BPM) : undefined), [sound]);
  return (
    <p className="ft-beat" aria-hidden="true" style={{ "--beat": `${60 / STEP_BPM}s` } as CSSProperties}>
      <span>Arriba</span><span>Arriba</span><span>Abajo</span><span>Abajo</span>
    </p>
  );
}

function Run({ test, run, sound, voice, vibration, keepAwake, onFinish, onCancel }: {
  test: FitnessTestDef;
  run: { id: string; startedAt: number };
  sound: boolean;
  voice: boolean;
  vibration: boolean;
  keepAwake: boolean;
  onFinish: (value: number | null) => void;
  onCancel: () => void;
}) {
  const now = useNow(200);
  const viewport = useViewport();
  const segments = segmentsFor(test.id);
  const elapsed = now === 0 ? 0 : Math.max(0, now - run.startedAt);
  let index = 0;
  let start = 0;
  while (index < segments.length - 1 && elapsed >= (start + segments[index].seconds) * 1000) {
    start += segments[index].seconds;
    index += 1;
  }
  const segment = segments[index];
  const inSegment = elapsed - start * 1000;
  const remainingMs = segment.seconds * 1000 - inSegment;
  const finished = now !== 0 && segment.phase !== "hold" && index === segments.length - 1 && remainingMs <= 0;
  const announced = useRef<number | null>(null);

  useWakeLock(keepAwake);

  useCountdownCues({
    key: segment.phase === "hold" ? null : `${run.id}-${index}`,
    remainingMs,
    now,
    // Mientras cuentas el pulso, nada de voz ni tics: sólo el aviso final.
    onTen: () => { if (voice && segment.phase === "work") speak("Quedan 10 segundos"); },
    onTick: () => { if (sound && segment.phase !== "pulse") beep({ frequency: 660, duration: 0.09 }); },
    onEnd: () => {
      if (sound) beep({ duration: 0.18, frequency: 990 });
      if (vibration) vibrate(180);
    },
  });

  useEffect(() => {
    if (now === 0 || announced.current === index) return;
    const first = announced.current === null;
    announced.current = index;
    if (!first && voice && segment.voice) speak(segment.voice);
  }, [index, now, segment.voice, voice]);

  // En la plancha, la voz marca cada 30 segundos.
  const holdMark = segment.phase === "hold" ? Math.floor(inSegment / 30_000) : 0;
  useEffect(() => {
    if (holdMark > 0 && voice) speak(holdLabel(holdMark * 30));
  }, [holdMark, voice]);

  const finish = useEffectEvent(() => {
    if (voice) speak(test.id === "step" ? "Alto. Anota tus latidos" : "Tiempo. Anota tus sentadillas");
    onFinish(null);
  });
  useEffect(() => {
    if (finished) finish();
  }, [finished]);

  const hold = segment.phase === "hold";
  const seconds = hold ? Math.floor(inSegment / 1000) : Math.max(0, Math.ceil(remainingMs / 1000));
  const size = Math.round(Math.min(380, Math.max(210, Math.min(viewport.width - 64, viewport.height * 0.42))));

  return (
    <div className={cn("ses-iv-run ft-run", `phase-${segment.phase === "prep" || segment.phase === "pulse-prep" ? "prep" : "work"}`)}>
      <span className="ses-iv-glow" aria-hidden="true" />
      <header className="ses-iv-run-top">
        <button type="button" className="ses-glass ses-pill" onClick={onCancel}><RotateCcw size={16} aria-hidden="true" /><span>Repetir</span></button>
        <p className="meta ses-iv-run-name">{test.title}</p>
        <SoundToggle />
      </header>

      <div className="ses-iv-run-main">
        <p className="ses-iv-phase" aria-live="assertive">{segment.title}</p>
        <WorkoutTimer seconds={now === 0 && !hold ? segment.seconds : seconds} total={hold ? undefined : segment.seconds} size={size} className="ses-iv-timer">
          <span className="ses-iv-next">{segment.hint}</span>
        </WorkoutTimer>
        {segment.phase === "work" && test.id === "step" && <StepBeat sound={sound} />}
        {segment.phase === "pulse" && <p className="ft-pulse"><HeartPulse size={18} aria-hidden="true" />Cuenta cada latido</p>}
      </div>

      <footer className="ses-iv-controls">
        {hold ? (
          <button type="button" className="ses-iv-ctl is-main ft-stop" onClick={() => onFinish(seconds)}>
            <Check size={28} aria-hidden="true" />
            <span>Me detuve</span>
          </button>
        ) : (
          <p className="ft-run-note">{segment.phase === "prep" ? "Empieza con el sonido" : " "}</p>
        )}
      </footer>
    </div>
  );
}

function Record({ test, suggested, onSave, onRetry }: { test: FitnessTestDef; suggested: number | null; onSave: (value: number) => void; onRetry: () => void }) {
  const range = ranges[test.id];
  const [text, setText] = useState(suggested === null ? "" : String(suggested));
  const value = Number(text);
  const valid = text !== "" && Number.isInteger(value) && value >= range.min && value <= range.max;
  const change = (next: number) => setText(String(Math.max(range.min, Math.min(range.max, next))));

  return (
    <div className="ft-record">
      <header className="ft-bar">
        <ExitButton />
        <p className="meta">{test.title}</p>
        <span className="ses-round" aria-hidden="true" />
      </header>
      <form
        className="ft-record-body"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) onSave(value);
        }}
      >
        <label htmlFor="ft-value" className="ft-question">{range.question}</label>
        <div className="ft-value">
          <button type="button" className="ft-value-btn" onClick={() => change((text === "" ? range.min : value) - 1)} aria-label={`Restar 1 a ${range.label}`}><Minus size={22} /></button>
          <input
            id="ft-value"
            className="ft-value-input num-display"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            autoFocus={suggested === null}
            placeholder="0"
            value={text}
            onChange={(event) => setText(event.target.value.replace(/\D/g, "").slice(0, 4))}
            aria-describedby="ft-value-help"
          />
          <button type="button" className="ft-value-btn" onClick={() => change((text === "" ? range.min - 1 : value) + 1)} aria-label={`Sumar 1 a ${range.label}`}><Plus size={22} /></button>
        </div>
        <p id="ft-value-help" className="ft-value-help">
          {valid && test.id === "plank" && value >= 60 ? valueLabel("plank", value) : range.label}
          {text !== "" && !valid && <> · entre {range.min} y {range.max}</>}
        </p>
        <div className="ses-dock">
          <div className="ses-dock-inner ft-dock">
            <button type="button" className="btn btn-ghost ft-skip" onClick={onRetry}>{test.id === "pushups" ? "Atrás" : "Repetir"}</button>
            <button type="submit" className="btn btn-primary btn-large ses-cta" disabled={!valid}>
              <span className="ses-cta-label">Guardar y seguir<ArrowRight size={18} /></span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Done({ entry, previous }: { entry: FitnessTestEntry | null; previous: FitnessTestEntry | null }) {
  return (
    <div className="ses-summary ft-done">
      <div className="ses-summary-bg atmosphere grain" aria-hidden="true" />
      <div className="ses-summary-inner">
        <header className="ses-summary-hero">
          <span className="ses-summary-mark" aria-hidden="true"><Check size={30} strokeWidth={2.6} /></span>
          <p className="meta">{entry ? "Test guardado" : "Test sin resultados"}</p>
          <h1>{entry ? "Ya tienes tus números" : "Lo intentamos otro día"}</h1>
        </header>
        {entry ? <TestReport entry={entry} previous={previous} /> : <p className="ses-summary-sub">Saltaste todas las pruebas, así que no hay nada que guardar.</p>}
        <div className="ses-summary-actions">
          <ButtonLink href="/progreso?tab=test" size="l" block>Ver en Progreso</ButtonLink>
          <ButtonLink href="/" variant="ghost" block>Volver a Inicio</ButtonLink>
        </div>
      </div>
    </div>
  );
}
