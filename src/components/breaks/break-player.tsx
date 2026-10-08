"use client";

import Link from "@/components/ui/app-link";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowLeft, Check, Pause, Play, SkipForward, Square } from "lucide-react";
import { ExerciseIllustration } from "@/components/exercises/exercise-illustration";
import { MovingIllustration } from "@/components/exercises/exercise-visual";
import { SoundToggle } from "@/components/session/interval-timer";
import { SessionScreen } from "@/components/session/session-screen";
import { useCountdownCues } from "@/components/session/use-countdown-cues";
import { ButtonLink } from "@/components/ui";
import { WorkoutTimer } from "@/components/ui/workout-timer";
import { breakMoveById, breakRoutineById, type BreakRoutine } from "@/data/active-breaks";
import { addBreak, breakSegments, breaksOn, routineMinutes, type BreakSegment } from "@/lib/active-breaks";
import { beep, primeAudio, speak, useWakeLock, vibrate } from "@/lib/feedback";
import { useBreaks, useSettings } from "@/lib/store";
import { clockLabel, newId } from "@/lib/training";
import { useNow } from "@/lib/use-now";
import { cn, localDateKey } from "@/lib/utils";

interface Run { id: string; elapsedBefore: number; runningSince: number | null; stopped: boolean }

function elapsedOf(run: Run, now: number) {
  return run.elapsedBefore + (run.runningSince === null || now === 0 ? 0 : Math.max(0, now - run.runningSince));
}

/** Pausa activa guiada: cada movimiento con su ilustración, claves y tiempo; voz al cambiar de lado. */
export function BreakPlayer({ routineId }: { routineId: string }) {
  const routine = breakRoutineById.get(routineId);
  const [settings] = useSettings();
  const [run, setRunState] = useState<Run | null>(null);
  const setRun = useMemo(() => (update: (current: Run) => Run) => setRunState((current) => (current ? update(current) : current)), []);
  if (!routine) return null;
  const voice = settings.sound && settings.voice !== false;

  function start() {
    primeAudio();
    if (voice) speak(`Prepárate. ${breakMoveById.get(routine?.items[0]?.move ?? "")?.name ?? ""}`);
    setRunState({ id: newId("pausa"), elapsedBefore: 0, runningSince: Date.now(), stopped: false });
  }

  return (
    <SessionScreen>
      {run ? (
        <Runner key={run.id} routine={routine} run={run} setRun={setRun} sound={settings.sound} voice={voice} vibration={settings.vibration} keepAwake={settings.keepAwake} />
      ) : (
        <Intro routine={routine} onStart={start} />
      )}
    </SessionScreen>
  );
}

function Intro({ routine, onStart }: { routine: BreakRoutine; onStart: () => void }) {
  return (
    <div className="ses-iv brk-intro">
      <header className="ses-iv-head">
        <div className="ses-iv-bar">
          <Link href="/pausas" className="ses-glass ses-round" aria-label="Volver a Pausas activas"><ArrowLeft size={20} /></Link>
          <SoundToggle />
        </div>
        <p className="meta">Pausa activa · {routineMinutes(routine)} min</p>
        <h1 className="ses-iv-title">{routine.name}</h1>
        <p className="ses-iv-lead">{routine.detail}. Junto a tu escritorio, sin equipo. Sigue la voz y el reloj.</p>
      </header>
      <ol className="brk-moves">
        {routine.items.map((item, index) => {
          const move = breakMoveById.get(item.move);
          if (!move) return null;
          return (
            <li key={`${item.move}-${index}`} className="brk-move rise" style={{ "--i": index } as CSSProperties}>
              <span className="brk-move-ill" aria-hidden="true"><ExerciseIllustration spec={move.illustration} primary={move.primary} panels="end" /></span>
              <span className="grow"><strong>{move.name}</strong><small>{move.perSide ? `${Math.round(item.seconds / 2)} s por lado` : `${item.seconds} s`}</small></span>
            </li>
          );
        })}
      </ol>
      <div className="ses-dock">
        <div className="ses-dock-inner">
          <button type="button" className="btn btn-primary btn-large ses-cta" onClick={onStart}>
            <span className="ses-cta-label"><Play size={18} fill="currentColor" />Empezar la pausa</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function segmentTitle(segment: BreakSegment, total: number) {
  if (segment.kind === "prep") return "Prepárate";
  if (segment.kind === "switch") return "Sigue";
  if (segment.side === 1) return "Primer lado";
  if (segment.side === 2) return "Otro lado";
  return `Movimiento ${segment.index + 1} de ${total}`;
}

function Runner({ routine, run, setRun, sound, voice, vibration, keepAwake }: {
  routine: BreakRoutine;
  run: Run;
  setRun: (update: (current: Run) => Run) => void;
  sound: boolean;
  voice: boolean;
  vibration: boolean;
  keepAwake: boolean;
}) {
  const now = useNow(200);
  const segments = useMemo(() => breakSegments(routine), [routine]);
  const totalMs = segments.reduce((sum, segment) => sum + segment.seconds, 0) * 1000;
  const elapsed = Math.min(totalMs, elapsedOf(run, now));
  const done = run.stopped || (now !== 0 && elapsed >= totalMs);
  let index = 0;
  let start = 0;
  while (index < segments.length - 1 && elapsed >= (start + segments[index].seconds) * 1000) {
    start += segments[index].seconds;
    index += 1;
  }
  const segment = segments[index];
  const remainingMs = (start + segment.seconds) * 1000 - elapsed;
  const paused = run.runningSince === null;
  const running = !paused && !done;
  const announced = useRef<number | null>(null);

  useWakeLock(keepAwake && running);

  useCountdownCues({
    key: running ? `${run.id}-${index}` : null,
    remainingMs,
    now,
    onTick: () => { if (sound) beep({ frequency: 660, duration: 0.09 }); },
    onEnd: () => {
      if (sound) beep({ duration: 0.18, frequency: 990 });
      if (vibration) vibrate(index === segments.length - 1 ? [200, 100, 400] : 160);
    },
  });

  // Voz al entrar en cada tramo: lo que sigue, el cambio de lado y el final.
  useEffect(() => {
    if (now === 0 || announced.current === index) return;
    const first = announced.current === null;
    announced.current = index;
    if (first || !voice) return;
    if (segment.kind === "switch") speak(`Sigue: ${segment.move.name}`);
    else if (segment.side === 2) speak("Cambia de lado");
  }, [index, now, segment, voice]);

  const finished = useEffectEvent(() => { if (voice && !run.stopped) speak("Pausa terminada. Bien hecho"); });
  useEffect(() => {
    if (done) finished();
  }, [done]);

  function togglePause() {
    const time = Date.now();
    setRun((current) => (current.runningSince === null ? { ...current, runningSince: time } : { ...current, elapsedBefore: elapsedOf(current, time), runningSince: null }));
  }

  function next() {
    const time = Date.now();
    setRun((current) => ({ ...current, elapsedBefore: Math.min(totalMs, (start + segment.seconds) * 1000), runningSince: current.runningSince === null ? null : time }));
  }

  function stop() {
    const time = Date.now();
    setRun((current) => ({ ...current, elapsedBefore: elapsedOf(current, time), runningSince: null, stopped: true }));
  }

  if (done) return <Completion routine={run.stopped ? null : routine} runId={run.id} share={elapsed / totalMs} />;

  const moves = routine.items.length;
  const resting = segment.kind !== "move";
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));

  return (
    <div className={cn("brk-run", resting && "is-resting", paused && "is-paused")}>
      <header className="brk-run-top">
        <button type="button" className="ses-glass ses-pill" onClick={stop}><Square size={15} aria-hidden="true" /><span>Terminar</span></button>
        <p className="brk-steps" aria-label={`Movimiento ${segment.index + 1} de ${moves}`}>
          {routine.items.map((item, step) => <i key={`${item.move}-${step}`} className={cn(step < segment.index && "is-done", step === segment.index && "is-current")} aria-hidden="true" />)}
        </p>
        <SoundToggle />
      </header>
      <MovingIllustration key={segment.move.id} spec={segment.move.illustration} primary={segment.move.primary} label={`Ilustración de ${segment.move.name}`} className="brk-visual" />
      <div className="brk-run-body">
        <p className="meta" aria-live="polite">{paused ? "En pausa" : segmentTitle(segment, moves)}</p>
        <h1 className="brk-run-name">{segment.move.name}</h1>
        <ul className="brk-cues">{segment.move.cues.map((cue) => <li key={cue}>{cue}</li>)}</ul>
        <div className="brk-run-clock">
          <WorkoutTimer seconds={now === 0 ? segment.seconds : seconds} total={segment.seconds} size={132} className="brk-timer" />
          <p className="meta brk-run-left">Quedan <b className="num">{now === 0 ? "--:--" : clockLabel((totalMs - elapsed) / 1000)}</b></p>
        </div>
      </div>
      <footer className="ses-iv-controls brk-controls">
        <button type="button" className="ses-iv-ctl" onClick={next} aria-label="Saltar al siguiente tramo"><SkipForward size={20} aria-hidden="true" /><span>Siguiente</span></button>
        <button type="button" className="ses-iv-ctl is-main" onClick={togglePause} aria-label={paused ? "Reanudar" : "Pausar"}>
          {paused ? <Play size={30} fill="currentColor" /> : <Pause size={30} fill="currentColor" />}
        </button>
      </footer>
    </div>
  );
}

/** Al terminar se guarda sola; si la cortaste antes de la mitad, no cuenta. */
function Completion({ routine, runId, share }: { routine: BreakRoutine | null; runId: string; share: number }) {
  const [entries, setEntries] = useBreaks();
  const counts = Boolean(routine) || share >= 0.5;
  const today = localDateKey();
  const saveOnce = useEffectEvent(() => {
    if (!counts) return;
    const stamp = new Date();
    setEntries((current) => (current.some((entry) => entry.id === runId) ? current : addBreak(current, { id: runId, date: localDateKey(stamp), completedAt: stamp.toISOString(), routine: routine?.id ?? "parcial" })));
  });
  useEffect(() => {
    saveOnce();
  }, []);
  const total = breaksOn(entries, today);

  return (
    <div className="ses-summary brk-done">
      <div className="ses-summary-bg atmosphere grain" aria-hidden="true" />
      <div className="ses-summary-inner">
        <header className="ses-summary-hero">
          <span className="ses-summary-mark" aria-hidden="true"><Check size={30} strokeWidth={2.6} /></span>
          <p className="meta">{counts ? "Pausa hecha" : "Pausa cortada"}</p>
          <h1>{counts ? "Cuerpo suelto, cabeza fresca" : "La próxima, completa"}</h1>
          <p className="ses-summary-sub">
            {counts ? (total > 1 ? `Llevas ${total} pausas hoy. Lo ideal: una cada dos horas.` : "Tu primera pausa del día. Lo ideal: una cada dos horas.") : "No alcanzaste la mitad, así que no se cuenta. Cuando quieras, retómala."}
          </p>
        </header>
        <div className="ses-summary-actions">
          <ButtonLink href="/pausas" size="l" block>Otra pausa</ButtonLink>
          <ButtonLink href="/" variant="ghost" block>Volver a Inicio</ButtonLink>
        </div>
      </div>
    </div>
  );
}
