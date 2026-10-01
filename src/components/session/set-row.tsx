"use client";

import { useState } from "react";
import { Check, Play, Trophy } from "lucide-react";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import type { SetRecord } from "@/types";
import { kindNames, parseDecimal } from "./session-utils";

function plain(value: number) {
  return String(Math.round(value * 100) / 100).replace(".", ",");
}

/** Campo numérico grande: selecciona todo al enfocar y acepta coma decimal. */
export function NumberField({ value, onCommit, onSettle, label, decimal = false, invalid = false, placeholder, className }: {
  value: number;
  onCommit: (value: number) => void;
  /** Al salir del campo, si el valor cambió: (valor final, valor al enfocar). */
  onSettle?: (value: number, initial: number) => void;
  label: string;
  decimal?: boolean;
  invalid?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const [initial, setInitial] = useState(value);
  const shown = text ?? (value > 0 ? plain(value) : "");
  return (
    <input
      className={cn("ses-input num", className)}
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      enterKeyHint="done"
      autoComplete="off"
      aria-label={label}
      aria-invalid={invalid || undefined}
      placeholder={placeholder}
      value={shown}
      onFocus={(event) => {
        setText(shown);
        setInitial(value);
        event.currentTarget.select();
      }}
      onChange={(event) => {
        const next = event.target.value.replace(/[^\d.,]/g, "");
        setText(next);
        onCommit(parseDecimal(next) ?? 0);
      }}
      onBlur={() => {
        setText(null);
        if (onSettle && value !== initial) onSettle(value, initial);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );
}

function CountdownButton({ until, onPress, label }: { until: number | null; onPress: () => void; label: string }) {
  const now = useNow(250);
  const remaining = until === null || now === 0 ? null : Math.ceil((until - now) / 1000);
  const running = remaining !== null && remaining > 0;
  const finished = remaining !== null && remaining <= 0;
  return (
    <button
      type="button"
      className={cn("ses-mini", running && "is-running", finished && "is-finished")}
      onClick={onPress}
      aria-label={running ? `Detener temporizador de ${label} (quedan ${remaining} s)` : `Iniciar temporizador de ${label}`}
    >
      {running ? <span className="num">{remaining}</span> : finished ? <Check size={16} /> : <Play size={15} />}
    </button>
  );
}

export interface SetRowProps {
  set: SetRecord;
  badge: string;
  label: string;
  unit: "reps" | "seconds";
  loadUnit: "kg" | "lb";
  displayLoad: number;
  bodyweight: boolean;
  previous?: string;
  invalidValue: boolean;
  invalidLoad: boolean;
  isRecord: boolean;
  countdownUntil: number | null;
  onValue: (value: number) => void;
  onLoad: (displayValue: number) => void;
  onLoadSettle: (displayValue: number, initialDisplay: number) => void;
  onToggle: () => void;
  onCycleKind: () => void;
  onCopyPrevious: () => void;
  onRir: () => void;
  onCountdown: () => void;
}

export function SetRow(props: SetRowProps) {
  const { set, badge, label, unit, loadUnit, displayLoad, bodyweight, previous, isRecord } = props;
  const kind = set.kind ?? "normal";
  return (
    <div className={cn("ses-set", set.done && "is-done", `kind-${kind}`)}>
      <button
        type="button"
        className="ses-set-badge num"
        onClick={props.onCycleKind}
        aria-label={`${label}: ${kindNames[kind]}. Cambiar tipo de serie`}
      >
        {badge}
      </button>

      <button
        type="button"
        className="ses-set-prev num"
        onClick={props.onCopyPrevious}
        disabled={!previous}
        aria-label={previous ? `Copiar anterior: ${previous}` : "Sin registro anterior"}
      >
        {previous ?? "—"}
      </button>

      <NumberField
        value={displayLoad}
        onCommit={props.onLoad}
        onSettle={props.onLoadSettle}
        decimal
        label={`${label}, carga ${bodyweight ? "extra " : ""}en ${loadUnit}`}
        invalid={props.invalidLoad}
        placeholder={bodyweight ? "—" : "0"}
        className={cn(bodyweight && "is-quiet")}
      />

      <NumberField
        value={set.value}
        onCommit={props.onValue}
        label={`${label}, ${unit === "reps" ? "repeticiones" : "segundos"}`}
        invalid={props.invalidValue}
        placeholder="0"
      />

      {unit === "seconds" ? (
        <CountdownButton until={props.countdownUntil} onPress={props.onCountdown} label={label} />
      ) : (
        <button
          type="button"
          className={cn("ses-mini ses-rir", set.rir !== undefined && "has-value")}
          onClick={props.onRir}
          aria-label={set.rir === undefined ? `${label}: registrar repeticiones en reserva` : `${label}: ${set.rir >= 4 ? "4 o más" : set.rir} repeticiones en reserva`}
        >
          {set.rir === undefined ? "RIR" : set.rir >= 4 ? "4+" : set.rir}
        </button>
      )}

      <button
        type="button"
        className="ses-check"
        onClick={props.onToggle}
        aria-pressed={set.done}
        aria-label={`${set.done ? "Desmarcar" : "Completar"} ${label}`}
      >
        <Check size={22} strokeWidth={2.6} />
      </button>

      {isRecord && (
        <span className="ses-pr" role="status">
          <Trophy size={12} />
          Récord
        </span>
      )}
    </div>
  );
}
