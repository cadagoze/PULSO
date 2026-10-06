"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowLeft, Check, Pause, Play, RotateCcw, SkipForward, Square, Volume2, VolumeX } from "lucide-react";
import { intervalPresets } from "@/data/programs";
import { MetaLine, Stepper } from "@/components/ui";
import { WorkoutTimer } from "@/components/ui/workout-timer";
import { beep, primeAudio, speak, useWakeLock, vibrate } from "@/lib/feedback";
import { useSettings, useWorkouts } from "@/lib/store";
import { clockLabel, newId } from "@/lib/training";
import { useNow } from "@/lib/use-now";
import { cn, localDateKey } from "@/lib/utils";
import type { WorkoutEntry } from "@/types";
import { EffortPicker } from "./finish-sheet";
import { SessionScreen, useViewport } from "./session-screen";
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

/** Sonido y voz (el mismo ajuste del perfil), a mano en el temporizador. */
function SoundToggle() {
  const [settings, update] = useSettings();
  return (
    <button type="button" className={cn("ses-glass ses-pill", !settings.sound && "is-off")} onClick={() => update({ sound: !settings.sound })} aria-pressed={settings.sound}>
      {settings.sound ? <Volume2 size={17} aria-hidden="true" /> : <VolumeX size={17} aria-hidden="true" />}
      <span>{settings.sound ? "Sonido y voz" : "Sin sonido"}</span>
    </button>
  );
}

// ─── Configuración ──────────────────────────────────────────────────────

function Setup({ onStart }: { onStart: (config: IntervalConfig) => void }) {
  const [selected, setSelected] = useState<string>(intervalPresets[0]?.id ?? "custom");
  const [custom, setCustom] = useState({ work: 30, rest: 15, rounds: 8 });
  const preset = intervalPresets.find((item) => item.id === selected);
  const config: IntervalConfig = preset
    ? { name: preset.name, work: preset.work, rest: preset.rest, rounds: preset.rounds }
    : { name: "Personalizado", ...custom };
  const options = [
    ...intervalPresets.map((item) => ({ id: item.id, name: item.name, detail: item.detail, work: item.work, rest: item.rest, rounds: item.rounds })),
    { id: "custom", name: "Personalizado", detail: "Define tu trabajo, pausa y rondas", ...custom },
  ];

  return (
    <div className="ses-iv">
      <header className="ses-iv-head">
        <div className="ses-iv-bar">
          <Link href="/entrenar" className="ses-glass ses-round" aria-label="Volver a Entrenar"><ArrowLeft size={20} /></Link>
          <SoundToggle />
        </div>
        <p className="meta">Temporizador</p>
        <h1 className="ses-iv-title">Intervalos</h1>
        <p className="ses-iv-lead">Trabajo y pausa guiados con sonido, voz y vibración. Funciona con la pantalla encendida.</p>
      </header>

      <section className="ses-iv-section" aria-labelledby="ses-iv-formats">
        <h2 id="ses-iv-formats" className="meta">Formato</h2>
        <div className="ses-iv-presets" role="group" aria-label="Formatos de intervalos">
          {options.map((item, index) => {
            const active = selected === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={cn("ses-iv-preset rise", item.id === "custom" && "is-custom")}
                style={{ "--i": index } as CSSProperties}
                aria-pressed={active}
                aria-label={`${item.name}: ${item.detail}`}
                onClick={() => setSelected(item.id)}
              >
                <span className="ses-iv-preset-head">
                  <strong>{item.name}</strong>
                  {active && <span className="ses-iv-preset-check" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>}
                </span>
                <span className="ses-iv-preset-nums num" aria-hidden="true">{item.work}<small>s</small><i>/</i>{item.rest}<small>s</small></span>
                <small aria-hidden="true">× {item.rounds} rondas</small>
              </button>
            );
          })}
        </div>
      </section>

      {selected === "custom" && (
        <section className="ses-iv-custom" aria-label="Intervalo personalizado">
          <div className="toggle-row">
            <span><strong>Trabajo</strong><small>segundos</small></span>
            <Stepper value={custom.work} onChange={(work) => setCustom((value) => ({ ...value, work }))} min={5} max={600} step={5} label="segundos de trabajo" />
          </div>
          <div className="toggle-row">
            <span><strong>Descanso</strong><small>segundos</small></span>
            <Stepper value={custom.rest} onChange={(rest) => setCustom((value) => ({ ...value, rest }))} min={0} max={600} step={5} label="segundos de descanso" />
          </div>
          <div className="toggle-row">
            <span><strong>Rondas</strong><small>repeticiones del ciclo</small></span>
            <Stepper value={custom.rounds} onChange={(rounds) => setCustom((value) => ({ ...value, rounds }))} min={1} max={50} label="rondas" />
          </div>
        </section>
      )}

      <section className="ses-iv-total" aria-label="Duración total">
        <p className="meta">Total</p>
        <p className="ses-iv-total-num num-display">{clockLabel(totalSeconds(config))}</p>
        <MetaLine items={[<><b className="num">{config.rounds}</b> rondas</>, <><b className="num">{config.work}</b> s trabajo</>, <><b className="num">{config.rest}</b> s pausa</>]} />
        <p className="ses-small subtle">Incluye {PREP_SECONDS} s para prepararte.</p>
      </section>

      <div className="ses-dock">
        <div className="ses-dock-inner">
          <button type="button" className="btn btn-primary btn-large ses-cta" onClick={() => onStart(config)}>
            <span className="ses-cta-label"><Play size={18} fill="currentColor" />Empezar {config.name}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ejecución ──────────────────────────────────────────────────────────

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
    <div className="ses-summary ses-iv-complete">
      <div className="ses-summary-bg atmosphere grain" aria-hidden="true" />
      <div className="ses-summary-inner">
        <header className="ses-summary-hero">
          <span className="ses-summary-mark" aria-hidden="true"><Check size={30} strokeWidth={2.6} /></span>
          <p className="meta">{finished ? "Intervalos completados" : "Sesión detenida"}</p>
          <h1>{run.config.name}</h1>
        </header>
        <dl className="ses-summary-stats ses-iv-stats">
          <div className="ses-summary-figure"><dt className="meta">Rondas</dt><dd><span className="num-display">{rounds}<span className="ses-soft">/{run.config.rounds}</span></span></dd></div>
          <div className="ses-summary-figure"><dt className="meta">Tiempo</dt><dd><span className="num-display">{clockLabel(elapsedMs / 1000)}</span></dd></div>
          <div className="ses-summary-figure"><dt className="meta">Trabajo / pausa</dt><dd><span className="num-display">{run.config.work}/{run.config.rest}</span><small>s</small></dd></div>
        </dl>

        {saved ? (
          <p className="notice" role="status"><Check size={18} /><span>Guardado en tu historial. Trabajo hecho.</span></p>
        ) : rounds > 0 ? (
          <div className="ses-iv-save">
            <EffortPicker value={effort} onChange={setEffort} />
            <button type="button" className="btn btn-primary btn-large btn-block" onClick={save}>Guardar en mi historial</button>
          </div>
        ) : (
          <p className="ses-summary-sub">No alcanzaste a completar una ronda, así que no hay nada que guardar.</p>
        )}

        <div className="ses-iv-complete-actions">
          <button type="button" className="btn btn-glass btn-block" onClick={onRepeat}><RotateCcw size={17} /> Repetir</button>
          <Link href="/entrenar" className="btn btn-ghost btn-block">Salir</Link>
        </div>
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
  const viewport = useViewport();
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
  const upcoming = run.segments[index + 1];
  const paused = run.runningSince === null;
  const round = segment.phase === "prep" ? 0 : segment.round;
  const size = Math.round(Math.min(400, Math.max(220, Math.min(viewport.width - 64, viewport.height * 0.44))));

  return (
    <div className={cn("ses-iv-run", `phase-${segment.phase}`, paused && "is-paused")}>
      <span className="ses-iv-glow" aria-hidden="true" />
      <header className="ses-iv-run-top">
        <button type="button" className="ses-glass ses-pill" onClick={onRepeat} aria-label="Reiniciar desde el principio">
          <RotateCcw size={16} aria-hidden="true" /><span>Reiniciar</span>
        </button>
        <p className="meta ses-iv-run-name">{run.config.name}</p>
        <SoundToggle />
      </header>

      <div className="ses-iv-run-main">
        <p className="ses-iv-phase" aria-live="assertive">{paused ? "En pausa" : phaseLabels[segment.phase]}</p>
        <WorkoutTimer
          seconds={now === 0 ? segment.duration : seconds}
          total={segment.duration}
          label={`Ronda ${round}/${run.config.rounds}`}
          size={size}
          className="ses-iv-timer"
        >
          <span className="ses-iv-next">
            {upcoming ? <>Sigue: <b>{phaseLabels[upcoming.phase]}</b> · <span className="num">{upcoming.duration} s</span></> : "Último esfuerzo"}
          </span>
        </WorkoutTimer>
        <p className="meta ses-iv-remaining">Restante <b className="num">{now === 0 ? "--:--" : clockLabel((run.totalMs - elapsed) / 1000)}</b></p>
      </div>

      <footer className="ses-iv-controls">
        <button type="button" className="ses-iv-ctl" onClick={stop} aria-label="Detener y terminar">
          <Square size={20} aria-hidden="true" />
          <span>Detener</span>
        </button>
        <button type="button" className="ses-iv-ctl is-main" onClick={togglePause} aria-label={paused ? "Reanudar" : "Pausar"}>
          {paused ? <Play size={30} fill="currentColor" /> : <Pause size={30} fill="currentColor" />}
        </button>
        <button type="button" className="ses-iv-ctl" onClick={next} aria-label="Saltar a la siguiente fase">
          <SkipForward size={20} aria-hidden="true" />
          <span>Siguiente</span>
        </button>
      </footer>
    </div>
  );
}

/** Temporizador de intervalos (Tabata, HIIT, EMOM, personalizado) en el mismo lenguaje inmersivo de la sesión. */
export function IntervalTimer() {
  const [settings] = useSettings();
  const [run, setRunState] = useState<Run | null>(null);
  const setRun = useMemo(() => (update: (current: Run) => Run) => setRunState((current) => (current ? update(current) : current)), []);

  function start(config: IntervalConfig) {
    primeAudio();
    if (settings.sound) speak("Prepárate");
    setRunState(createRun(config));
  }

  return (
    <SessionScreen>
      {run ? (
        <Runner
          key={run.id}
          run={run}
          setRun={setRun}
          sound={settings.sound}
          vibration={settings.vibration}
          keepAwake={settings.keepAwake}
          onRepeat={() => start(run.config)}
        />
      ) : (
        <Setup onStart={start} />
      )}
    </SessionScreen>
  );
}
