"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Check, Pause, Play, RotateCcw, SkipForward, Square, Timer } from "lucide-react";
import { intervalPresets } from "@/data/programs";
import { Stepper } from "@/components/ui";
import { beep, primeAudio, speak, useWakeLock, vibrate } from "@/lib/feedback";
import { useSettings, useWorkouts } from "@/lib/store";
import { clockLabel, newId } from "@/lib/training";
import { useNow } from "@/lib/use-now";
import { cn, localDateKey } from "@/lib/utils";
import type { WorkoutEntry } from "@/types";
import { EffortPicker } from "./finish-sheet";
import type { Effort } from "./session-utils";
import { useCountdownCues } from "./use-countdown-cues";

const PREP_SECONDS = 10;

type Phase = "prep" | "work" | "rest";

interface IntervalConfig {
  name: string;
  work: number;
  rest: number;
  rounds: number;
}

interface Segment {
  phase: Phase;
  round: number;
  start: number;
  duration: number;
}

interface Run {
  id: string;
  config: IntervalConfig;
  segments: Segment[];
  totalMs: number;
  elapsedBefore: number;
  runningSince: number | null;
  stopped: boolean;
}

const phaseLabels: Record<Phase, string> = { prep: "Prepárate", work: "Trabajo", rest: "Descanso" };

function buildSegments(config: IntervalConfig): Segment[] {
  const segments: Segment[] = [{ phase: "prep", round: 1, start: 0, duration: PREP_SECONDS }];
  let cursor = PREP_SECONDS;
  for (let round = 1; round <= config.rounds; round += 1) {
    segments.push({ phase: "work", round, start: cursor, duration: config.work });
    cursor += config.work;
    if (round < config.rounds && config.rest > 0) {
      segments.push({ phase: "rest", round, start: cursor, duration: config.rest });
      cursor += config.rest;
    }
  }
  return segments;
}

function totalSeconds(config: IntervalConfig) {
  return PREP_SECONDS + config.rounds * config.work + Math.max(0, config.rounds - 1) * config.rest;
}

function createRun(config: IntervalConfig): Run {
  return {
    id: newId("intervalos"),
    config,
    segments: buildSegments(config),
    totalMs: totalSeconds(config) * 1000,
    elapsedBefore: 0,
    runningSince: Date.now(),
    stopped: false,
  };
}

function elapsedOf(run: Run, now: number) {
  const live = run.runningSince === null || now === 0 ? 0 : Math.max(0, now - run.runningSince);
  return Math.min(run.totalMs, run.elapsedBefore + live);
}

function segmentAt(run: Run, elapsedMs: number) {
  const index = run.segments.findIndex((segment) => elapsedMs < (segment.start + segment.duration) * 1000);
  return index === -1 ? run.segments.length - 1 : index;
}

function roundsDone(run: Run, elapsedMs: number) {
  return run.segments.filter((segment) => segment.phase === "work" && (segment.start + segment.duration) * 1000 <= elapsedMs + 1).length;
}

// ─── Configuración ──────────────────────────────────────────────────────

function Setup({ onStart }: { onStart: (config: IntervalConfig) => void }) {
  const [selected, setSelected] = useState<string>(intervalPresets[0]?.id ?? "custom");
  const [custom, setCustom] = useState({ work: 30, rest: 15, rounds: 8 });
  const preset = intervalPresets.find((item) => item.id === selected);
  const config: IntervalConfig = preset
    ? { name: preset.name, work: preset.work, rest: preset.rest, rounds: preset.rounds }
    : { name: "Personalizado", ...custom };

  return (
    <div className="ses-iv-setup">
      <header className="ses-iv-head">
        <Link href="/entrenar" className="btn-icon" aria-label="Volver a Entrenar"><ArrowLeft size={20} /></Link>
        <div>
          <p className="eyebrow">Temporizador</p>
          <h1>Intervalos</h1>
          <p className="muted">Trabajo y pausa guiados con sonido y vibración. Funciona con la pantalla encendida.</p>
        </div>
      </header>

      <div className="ses-iv-presets" role="group" aria-label="Formatos de intervalos">
        {intervalPresets.map((item) => (
          <button
            key={item.id}
            type="button"
            className="ses-iv-preset"
            aria-pressed={selected === item.id}
            onClick={() => setSelected(item.id)}
          >
            <strong>{item.name}</strong>
            <span className="ses-iv-preset-nums num">
              {item.work}<small>s</small> / {item.rest}<small>s</small> × {item.rounds}
            </span>
            <small>{item.detail}</small>
          </button>
        ))}
        <button
          type="button"
          className="ses-iv-preset is-custom"
          aria-pressed={selected === "custom"}
          onClick={() => setSelected("custom")}
        >
          <strong>Personalizado</strong>
          <span className="ses-iv-preset-nums num">
            {custom.work}<small>s</small> / {custom.rest}<small>s</small> × {custom.rounds}
          </span>
          <small>Define tu trabajo, pausa y rondas</small>
        </button>
      </div>

      {selected === "custom" && (
        <section className="ses-iv-custom" aria-label="Intervalo personalizado">
          <div className="spread">
            <span><strong>Trabajo</strong><small>segundos</small></span>
            <Stepper value={custom.work} onChange={(work) => setCustom((value) => ({ ...value, work }))} min={5} max={600} step={5} label="segundos de trabajo" />
          </div>
          <div className="spread">
            <span><strong>Descanso</strong><small>segundos</small></span>
            <Stepper value={custom.rest} onChange={(rest) => setCustom((value) => ({ ...value, rest }))} min={0} max={600} step={5} label="segundos de descanso" />
          </div>
          <div className="spread">
            <span><strong>Rondas</strong><small>repeticiones del ciclo</small></span>
            <Stepper value={custom.rounds} onChange={(rounds) => setCustom((value) => ({ ...value, rounds }))} min={1} max={50} label="rondas" />
          </div>
        </section>
      )}

      <div className="ses-iv-start">
        <p>
          <Timer size={16} />
          <span>Total <b className="num">{clockLabel(totalSeconds(config))}</b> · incluye {PREP_SECONDS} s para prepararte</span>
        </p>
        <button type="button" className="btn btn-primary btn-block ses-iv-go" onClick={() => onStart(config)}>
          <Play size={18} /> Empezar {config.name}
        </button>
      </div>
    </div>
  );
}

// ─── Ejecución ──────────────────────────────────────────────────────────

function PhaseRing({ value, children }: { value: number; children: ReactNode }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const safe = Math.max(0, Math.min(1, value));
  return (
    <div className="ses-iv-ring">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="ses-iv-ring-track" cx="50" cy="50" r={radius} />
        <circle className="ses-iv-ring-value" cx="50" cy="50" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - safe)} />
      </svg>
      <div className="ses-iv-ring-content">{children}</div>
    </div>
  );
}

function Completion({ run, elapsedMs, onRepeat }: { run: Run; elapsedMs: number; onRepeat: () => void }) {
  const [, setWorkouts] = useWorkouts();
  const [effort, setEffort] = useState<Effort>(3);
  const [saved, setSaved] = useState(false);
  const rounds = roundsDone(run, elapsedMs);
  const minutes = Math.round(elapsedMs / 6000) / 10;
  const finished = rounds >= run.config.rounds;

  function save() {
    const now = Date.now();
    const stamp = new Date(now).toISOString();
    const entry: WorkoutEntry = {
      id: run.id,
      name: `Intervalos · ${run.config.name}`,
      date: localDateKey(new Date(now)),
      completedAt: stamp,
      durationMinutes: minutes,
      exerciseCount: 0,
      sets: rounds,
      mode: "full",
      records: [],
      effort,
      feedbackAt: stamp,
      source: { type: "free" },
      kind: "interval",
      volume: 0,
      load: Math.round(effort * 2 * minutes * 10) / 10,
    };
    setWorkouts((items) => [entry, ...items.filter((item) => item.id !== entry.id)]);
    setSaved(true);
  }

  return (
    <div className="ses-iv-complete">
      <span className="ses-summary-mark" aria-hidden="true"><Check size={34} strokeWidth={2.6} /></span>
      <p className="eyebrow">{finished ? "Intervalos completados" : "Sesión detenida"}</p>
      <h1>{run.config.name}</h1>
      <div className="ses-summary-stats ses-iv-stats">
        <div><b className="num">{rounds}<small>/{run.config.rounds}</small></b><span>rondas</span></div>
        <div><b className="num">{clockLabel(elapsedMs / 1000)}</b><span>tiempo</span></div>
        <div><b className="num">{run.config.work}/{run.config.rest}<small>s</small></b><span>trabajo/pausa</span></div>
      </div>

      {saved ? (
        <p className="notice" role="status"><Check size={18} /><span>Guardado en tu historial. ¡Bien hecho!</span></p>
      ) : rounds > 0 ? (
        <>
          <EffortPicker value={effort} onChange={setEffort} />
          <button type="button" className="btn btn-primary btn-block" onClick={save}>Guardar en mi historial</button>
        </>
      ) : (
        <p className="muted">No alcanzaste a completar una ronda, así que no hay nada que guardar.</p>
      )}

      <div className="ses-iv-complete-actions">
        <button type="button" className="btn btn-secondary btn-block" onClick={onRepeat}><RotateCcw size={17} /> Repetir</button>
        <Link href="/entrenar" className="btn btn-ghost btn-block">Salir</Link>
      </div>
    </div>
  );
}

function Runner({ run, setRun, sound, vibration, keepAwake, onRepeat }: {
  run: Run;
  setRun: (update: (run: Run) => Run) => void;
  sound: boolean;
  vibration: boolean;
  keepAwake: boolean;
  onRepeat: () => void;
}) {
  const now = useNow(200);
  const elapsed = elapsedOf(run, now);
  const done = run.stopped || (now !== 0 && elapsed >= run.totalMs);
  const index = segmentAt(run, elapsed);
  const segment = run.segments[index];
  const segmentEnd = (segment.start + segment.duration) * 1000;
  const remainingMs = segmentEnd - elapsed;
  const running = run.runningSince !== null && !done;
  const phaseRef = useRef<{ run: string; index: number; done: boolean } | null>(null);

  useWakeLock(keepAwake && running);

  useCountdownCues({
    key: running ? `${run.id}-${index}` : null,
    remainingMs,
    now,
    onTick: () => {
      if (sound) beep({ frequency: 660, duration: 0.09 });
    },
    onEnd: () => {
      if (sound) beep({ count: 1, duration: 0.18, frequency: 990 });
      if (vibration) vibrate(index === run.segments.length - 1 ? [200, 100, 200, 100, 400] : [180]);
    },
  });

  useEffect(() => {
    if (now === 0) return;
    const previous = phaseRef.current;
    phaseRef.current = { run: run.id, index, done };
    if (!previous || previous.run !== run.id) return;
    if (done && !previous.done) {
      if (sound) speak("Terminado");
      return;
    }
    if (!done && previous.index !== index && sound) speak(phaseLabels[segment.phase]);
  }, [done, index, now, run.id, segment.phase, sound]);

  function togglePause() {
    const time = Date.now();
    setRun((current) => (current.runningSince === null
      ? { ...current, runningSince: time }
      : { ...current, elapsedBefore: elapsedOf(current, time), runningSince: null }));
  }

  function next() {
    const time = Date.now();
    setRun((current) => {
      const at = elapsedOf(current, time);
      const position = segmentAt(current, at);
      const target = current.segments[position];
      const end = Math.min(current.totalMs, (target.start + target.duration) * 1000);
      return { ...current, elapsedBefore: end, runningSince: current.runningSince === null ? null : time };
    });
  }

  function stop() {
    const time = Date.now();
    setRun((current) => ({ ...current, elapsedBefore: elapsedOf(current, time), runningSince: null, stopped: true }));
  }

  if (done) {
    return <Completion run={run} elapsedMs={run.stopped ? run.elapsedBefore : run.totalMs} onRepeat={onRepeat} />;
  }

  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const progress = 1 - remainingMs / (segment.duration * 1000);
  const upcoming = run.segments[index + 1];
  const paused = run.runningSince === null;

  return (
    <div className={cn("ses-iv-run", `phase-${segment.phase}`, paused && "is-paused")}>
      <header className="ses-iv-run-top">
        <div>
          <small>Ronda</small>
          <b className="num">{segment.phase === "prep" ? 0 : segment.round}/{run.config.rounds}</b>
        </div>
        <p className="ses-iv-run-name">{run.config.name}</p>
        <div className="is-right">
          <small>Restante</small>
          <b className="num">{now === 0 ? "--:--" : clockLabel((run.totalMs - elapsed) / 1000)}</b>
        </div>
      </header>

      <div className="ses-iv-run-main">
        <p className="ses-iv-phase" aria-live="assertive">{paused ? "En pausa" : phaseLabels[segment.phase]}</p>
        <PhaseRing value={now === 0 ? 0 : progress}>
          <span className="ses-iv-count num" role="timer" aria-label={`${phaseLabels[segment.phase]}: ${seconds} segundos`}>
            {now === 0 ? segment.duration : seconds}
          </span>
        </PhaseRing>
        <p className="ses-iv-next">
          {upcoming ? <>Sigue: <b>{phaseLabels[upcoming.phase]}</b> · <span className="num">{upcoming.duration} s</span></> : "Último esfuerzo"}
        </p>
      </div>

      <footer className="ses-iv-controls">
        <button type="button" className="ses-iv-ctl" onClick={stop} aria-label="Detener y terminar">
          <Square size={20} />
          <span>Detener</span>
        </button>
        <button type="button" className="ses-iv-ctl is-main" onClick={togglePause} aria-label={paused ? "Reanudar" : "Pausar"}>
          {paused ? <Play size={30} /> : <Pause size={30} />}
        </button>
        <button type="button" className="ses-iv-ctl" onClick={next} aria-label="Saltar a la siguiente fase">
          <SkipForward size={20} />
          <span>Siguiente</span>
        </button>
      </footer>
    </div>
  );
}

export function IntervalTimer() {
  const [settings] = useSettings();
  const [run, setRunState] = useState<Run | null>(null);
  const setRun = useMemo(() => (update: (current: Run) => Run) => setRunState((current) => (current ? update(current) : current)), []);

  function start(config: IntervalConfig) {
    primeAudio();
    if (settings.sound) speak("Prepárate");
    setRunState(createRun(config));
  }

  if (!run) return <Setup onStart={start} />;

  return (
    <Runner
      key={run.id}
      run={run}
      setRun={setRun}
      sound={settings.sound}
      vibration={settings.vibration}
      keepAwake={settings.keepAwake}
      onRepeat={() => start(run.config)}
    />
  );
}
