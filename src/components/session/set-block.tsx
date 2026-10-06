"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Check, Minus, Pause, Play, Plus, RotateCcw, Square, Trophy, X } from "lucide-react";
import { MetaLine, NumberMetric, StatusBadge } from "@/components/ui";
import { vibrate } from "@/lib/feedback";
import type { ExerciseBests } from "@/lib/progression";
import { isWorkingSet } from "@/lib/training";
import { useNow } from "@/lib/use-now";
import { cn, formatNumber, fromDisplayWeight, toDisplayWeight } from "@/lib/utils";
import type { Exercise, ExerciseRecord, SetRecord } from "@/types";
import { prefersReducedMotion } from "./session-screen";
import { NumberField, plain } from "./set-row";
import { isRecordSet, kindBadges, limits, loadStep, performanceLabel, previousSet, setBadge, setHeading, valueStep, volumeLabel } from "./session-utils";
import type { WeightUnit } from "./session-utils";

export type SetMode = "set" | "review" | "hold" | "exercise-done" | "all-done";

/** Desliza la cifra en la dirección del cambio (sólo transform y opacity). */
function bump(node: HTMLElement | null, direction: 1 | -1) {
  if (!node || prefersReducedMotion() || typeof node.animate !== "function") return;
  const easing = getComputedStyle(node).getPropertyValue("--ease-standard").trim() || "ease-out";
  node.animate(
    [{ transform: `translateY(${direction > 0 ? 22 : -22}%)`, opacity: 0.25 }, { transform: "none", opacity: 1 }],
    { duration: 220, easing },
  );
}

/** Tamaño común de las dos cifras según la más larga, para que no se salgan en pantallas estrechas. */
function figureSize(...values: number[]) {
  const longest = Math.max(...values.map((value) => (value > 0 ? plain(value) : "0").length));
  return longest <= 3 ? "l" : longest === 4 ? "m" : "s";
}

/** Cifra grande editable: toca para escribir con el teclado numérico o usa −/+. */
function Figure({ value, unit, label, decimal = false, step, min, max, invalid, quiet = false, vibration, onChange, onType, onSettle }: {
  value: number;
  unit: string;
  label: string;
  decimal?: boolean;
  step: number;
  min: number;
  max: number;
  invalid: boolean;
  quiet?: boolean;
  vibration: boolean;
  /** Cambio con −/+: (valor nuevo, valor anterior). */
  onChange: (next: number, previous: number) => void;
  /** Cambio escrito con el teclado (en cada pulsación). */
  onType: (value: number) => void;
  onSettle?: (value: number, initial: number) => void;
}) {
  const valueRef = useRef<HTMLSpanElement>(null);
  const [delta, setDelta] = useState<{ id: number; text: string } | null>(null);

  useEffect(() => {
    if (!delta) return;
    const timer = window.setTimeout(() => setDelta(null), 760);
    return () => window.clearTimeout(timer);
  }, [delta]);

  function stepBy(direction: 1 | -1) {
    const next = Math.min(max, Math.max(min, Math.round((value + direction * step) * 100) / 100));
    if (next === value) return;
    onChange(next, value);
    if (vibration) vibrate(8);
    setDelta((current) => ({ id: (current?.id ?? 0) + 1, text: `${direction > 0 ? "+" : "−"}${formatNumber(step, 2)}` }));
    bump(valueRef.current?.querySelector("input") ?? null, direction);
  }

  return (
    <div className={cn("ses-figure", quiet && "is-quiet")}>
      <span className="ses-figure-value" ref={valueRef}>
        <NumberField value={value} onCommit={onType} onSettle={onSettle} label={label} decimal={decimal} invalid={invalid} placeholder="0" className="ses-figure-input" autoWidth />
        <span className="ses-figure-unit" aria-hidden="true">{unit}</span>
        {delta && <span key={delta.id} className="ses-delta num" aria-hidden="true">{delta.text}</span>}
      </span>
      <span className="ses-steps">
        <button type="button" className="ses-step" onClick={() => stepBy(-1)} disabled={value <= min} aria-label={`Disminuir ${label}`}><Minus size={19} /></button>
        <button type="button" className="ses-step" onClick={() => stepBy(1)} disabled={value >= max} aria-label={`Aumentar ${label}`}><Plus size={19} /></button>
      </span>
    </div>
  );
}

/** Ejercicio por tiempo: la cifra pasa a ser la cuenta regresiva mientras corre. */
function CountdownFigure({ until, target }: { until: number; target: number }) {
  const now = useNow(250);
  const remaining = now === 0 ? target : Math.max(0, Math.ceil((until - now) / 1000));
  const progress = target ? 1 - remaining / target : 1;
  return (
    <div className="ses-figure is-running" role="timer" aria-label={`Quedan ${remaining} segundos`}>
      <span className="ses-figure-value">
        <span className="ses-figure-input ses-figure-count num">{remaining}</span>
        <span className="ses-figure-unit">s · de {target}</span>
      </span>
      <span className="ses-count-track" aria-hidden="true"><i style={{ "--value": Math.min(1, Math.max(0, progress)) } as CSSProperties} /></span>
    </div>
  );
}

function CountdownChip({ until, label, onPress }: { until: number | null; label: string; onPress: () => void }) {
  const now = useNow(250);
  const remaining = until === null || now === 0 ? null : Math.ceil((until - now) / 1000);
  const running = remaining !== null && remaining > 0;
  return (
    <button
      type="button"
      className={cn("ses-chip", running && "is-running")}
      onClick={onPress}
      aria-label={running ? `Detener temporizador de ${label} (quedan ${remaining} s)` : `Iniciar temporizador de ${label}`}
    >
      {running ? <Square size={13} fill="currentColor" aria-hidden="true" /> : <Play size={13} fill="currentColor" aria-hidden="true" />}
      {running ? "Detener" : "Cronometrar"}
    </button>
  );
}

function CountdownPrompt({ until, setLabel, onConfirm, onDismiss }: { until: number; setLabel: string; onConfirm: () => void; onDismiss: () => void }) {
  const now = useNow(500);
  if (now === 0 || now < until) return null;
  return (
    <div className="ses-prompt" role="status">
      <p><b>Tiempo cumplido.</b> ¿Marcas la {setLabel} como hecha?</p>
      <div className="ses-prompt-actions">
        <button type="button" className="btn btn-primary btn-small" onClick={onConfirm}>Marcar hecha</button>
        <button type="button" className="ses-icon-btn" onClick={onDismiss} aria-label="Cerrar aviso"><X size={17} /></button>
      </div>
    </div>
  );
}

export interface SetBlockProps {
  mode: SetMode;
  recordIndex: number;
  record: ExerciseRecord;
  exercise: Exercise;
  setIndex: number;
  last?: ExerciseRecord;
  bests: ExerciseBests;
  loadUnit: WeightUnit;
  error: string | null;
  countdown: { setIndex: number; until: number } | null;
  paused: boolean;
  vibration: boolean;
  sessionDone: number;
  sessionTotal: number;
  onSet: (recordIndex: number, setIndex: number, patch: Partial<SetRecord>, options?: { carryFrom?: number }) => void;
  onToggle: (recordIndex: number, setIndex: number) => void;
  onRir: (recordIndex: number, setIndex: number) => void;
  onCountdown: (recordIndex: number, setIndex: number) => void;
  onCountdownDismiss: () => void;
  onTogglePause: () => void;
  onAddSet: (recordIndex: number) => void;
}

/**
 * La serie actual en grande: «SERIE 2 DE 4», repeticiones y carga editables, la referencia
 * de la vez anterior y RIR. Al completarla se tiñe de lima con un check y luego da paso a la siguiente.
 */
export function SetBlock(props: SetBlockProps) {
  const { mode, recordIndex, record, exercise, setIndex, last, bests, loadUnit, error, countdown, paused } = props;
  const [loadOpen, setLoadOpen] = useState(false);

  if (mode === "exercise-done" || mode === "all-done") {
    const working = record.sets.filter((set) => set.done && isWorkingSet(set));
    const top = [...working].sort((a, b) => b.load - a.load || b.value - a.value)[0];
    const volume = record.unit === "reps" ? working.reduce((sum, set) => sum + set.value * set.load, 0) : 0;
    return (
      <section className="ses-block is-complete" aria-label="Estado del ejercicio">
        {mode === "all-done" ? (
          <>
            <NumberMetric size="l" value={<>{props.sessionDone}<span className="nmetric-soft">/{props.sessionTotal}</span></>} label="series completadas. Guarda el entrenamiento cuando quieras." />
          </>
        ) : (
          <>
            <p className="meta">{record.sets.length} de {record.sets.length} series</p>
            <div className="ses-complete">
              <span className="ses-complete-mark" aria-hidden="true"><Check size={22} strokeWidth={2.8} /></span>
              <h2>Ejercicio completado</h2>
            </div>
            <MetaLine items={[top ? <>Mejor serie <b className="num">{performanceLabel(top, record.unit, loadUnit)}</b></> : null, volume > 0 ? <b className="num">{volumeLabel(volume, loadUnit)}</b> : null]} />
          </>
        )}
        <button type="button" className="ses-ghost" onClick={() => props.onAddSet(recordIndex)}><Plus size={17} /> Serie extra</button>
      </section>
    );
  }

  const set = record.sets[setIndex];
  if (!set) return null;
  const kind = set.kind ?? "normal";
  const badge = kindBadges[kind];
  const bodyweight = exercise.increment === 0;
  const displayLoad = toDisplayWeight(set.load, loadUnit);
  const previous = previousSet(record, setIndex, last);
  const maxValue = record.unit === "reps" ? limits.reps : limits.seconds;
  const maxLoad = toDisplayWeight(limits.load, loadUnit);
  const heading = setHeading(record.sets, setIndex);
  const label = `${exercise.name}, serie ${setBadge(record.sets, setIndex) === "C" ? "de calentamiento" : setBadge(record.sets, setIndex)}`;
  const showLoad = !bodyweight || set.load > 0 || loadOpen;
  const running = countdown && countdown.setIndex === setIndex && record.unit === "seconds" ? countdown : null;
  const isRecord = set.done && isRecordSet(set, record.unit, bests);
  const rir = set.rir === undefined ? null : set.rir >= 4 ? "4+" : String(set.rir);
  const toStored = (display: number) => fromDisplayWeight(display, loadUnit);

  return (
    <section className={cn("ses-block", mode === "hold" && "is-flash", set.done && "is-done")} aria-label={`${heading} de ${exercise.name}`}>
      <span className="ses-block-flash" aria-hidden="true" />
      {paused && (
        <button type="button" className="ses-paused" onClick={props.onTogglePause}>
          <Pause size={17} aria-hidden="true" />
          <span><b>En pausa.</b> El reloj está detenido. Toca para reanudar.</span>
        </button>
      )}

      <div className="ses-block-head">
        <div className="ses-block-tags">
          <p className="meta ses-block-heading">{heading}</p>
          {set.done && <span className="ses-done-badge" role="img" aria-label="Hecha"><Check size={14} strokeWidth={3} /></span>}
          {badge && kind !== "warmup" && <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>}
          {isRecord && <StatusBadge tone="gold"><Trophy size={12} aria-hidden="true" />Récord</StatusBadge>}
        </div>
        {record.unit === "reps" ? (
          <button
            type="button"
            className={cn("ses-chip", rir !== null && "has-value")}
            onClick={() => props.onRir(recordIndex, setIndex)}
            aria-label={rir === null ? `${label}: registrar repeticiones en reserva` : `${label}: ${rir === "4+" ? "4 o más" : rir} repeticiones en reserva`}
          >
            RIR <b className="num">{rir ?? "—"}</b>
          </button>
        ) : (
          <CountdownChip until={running?.until ?? null} label={label} onPress={() => props.onCountdown(recordIndex, setIndex)} />
        )}
      </div>

      <div key={`${recordIndex}-${setIndex}`} className={cn("ses-figures", `size-${figureSize(set.value, showLoad ? displayLoad : 0)}`)}>
        {running ? (
          <CountdownFigure until={running.until} target={set.value} />
        ) : (
          <Figure
            value={set.value}
            unit={record.unit === "reps" ? "rep" : "s"}
            label={`${label}, ${record.unit === "reps" ? "repeticiones" : "segundos"}`}
            step={valueStep(record.unit)}
            min={1}
            max={maxValue}
            invalid={set.value < 1 || set.value > maxValue}
            vibration={props.vibration}
            onChange={(value) => props.onSet(recordIndex, setIndex, { value })}
            onType={(value) => props.onSet(recordIndex, setIndex, { value })}
          />
        )}
        {showLoad ? (
          <Figure
            value={displayLoad}
            unit={bodyweight ? `${loadUnit} extra` : loadUnit}
            label={`${label}, carga ${bodyweight ? "extra " : ""}en ${loadUnit}`}
            decimal
            step={loadStep(exercise, loadUnit)}
            min={0}
            max={maxLoad}
            invalid={set.load < 0 || set.load > limits.load}
            quiet={bodyweight}
            vibration={props.vibration}
            onChange={(next, before) => props.onSet(recordIndex, setIndex, { load: toStored(next) }, { carryFrom: toStored(before) })}
            onType={(display) => props.onSet(recordIndex, setIndex, { load: toStored(display) })}
            onSettle={(display, initial) => props.onSet(recordIndex, setIndex, { load: toStored(display) }, { carryFrom: toStored(initial) })}
          />
        ) : (
          <button type="button" className="ses-ghost ses-add-load" onClick={() => setLoadOpen(true)}><Plus size={16} /> Añadir carga</button>
        )}
      </div>

      {previous && (
        <button
          type="button"
          className="ses-previous"
          onClick={() => props.onSet(recordIndex, setIndex, { value: previous.value, load: previous.load })}
          aria-label={`Copiar anterior: ${performanceLabel(previous, record.unit, loadUnit)}`}
        >
          <RotateCcw size={14} aria-hidden="true" />
          <span>Anterior</span>
          <b className="num">{performanceLabel(previous, record.unit, loadUnit)}</b>
        </button>
      )}

      {countdown && countdown.setIndex === setIndex && (
        <CountdownPrompt
          until={countdown.until}
          setLabel={`serie ${setBadge(record.sets, setIndex)}`}
          onConfirm={() => props.onToggle(recordIndex, setIndex)}
          onDismiss={props.onCountdownDismiss}
        />
      )}

      {error && <p className="form-error ses-block-error" role="alert">{error}</p>}
    </section>
  );
}
