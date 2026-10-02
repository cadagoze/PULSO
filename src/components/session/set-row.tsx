"use client";

import { useState } from "react";
import { Check, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SetRecord } from "@/types";
import { kindNames, parseDecimal } from "./session-utils";

export function plain(value: number) {
  return String(Math.round(value * 100) / 100).replace(".", ",");
}

/**
 * Campo numérico: selecciona todo al enfocar y acepta coma decimal (teclado numérico en el móvil).
 * Con `autoWidth` el ancho sigue exactamente a las cifras (una copia invisible del texto da la medida),
 * para los números grandes de la serie actual.
 */
export function NumberField({ value, onCommit, onSettle, label, decimal = false, invalid = false, placeholder, className, autoWidth = false }: {
  value: number;
  onCommit: (value: number) => void;
  /** Al salir del campo, si el valor cambió: (valor final, valor al enfocar). */
  onSettle?: (value: number, initial: number) => void;
  label: string;
  decimal?: boolean;
  invalid?: boolean;
  placeholder?: string;
  className?: string;
  autoWidth?: boolean;
}) {
  const [text, setText] = useState<string | null>(null);
  const [initial, setInitial] = useState(value);
  const shown = text ?? (value > 0 ? plain(value) : "");
  const input = (
    <input
      className={cn("ses-input num", !autoWidth && className)}
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      enterKeyHint="done"
      autoComplete="off"
      size={1}
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
  if (!autoWidth) return input;
  return (
    <span className={cn("ses-autosize", className)}>
      <span className="ses-autosize-mirror" aria-hidden="true">{shown || placeholder || "0"}</span>
      {input}
    </span>
  );
}

/**
 * Fila compacta de la lista de series: tipo (toca para cambiarlo), rendimiento (toca para editarla
 * arriba) y check. Al completarse pasa a fondo lima suave y el check se dibuja.
 */
export function SetListRow({ set, badge, label, performance, previous, isRecord, focused, onFocus, onToggle, onCycleKind }: {
  set: SetRecord;
  badge: string;
  label: string;
  performance: string;
  previous?: string;
  isRecord: boolean;
  focused: boolean;
  onFocus: () => void;
  onToggle: () => void;
  onCycleKind: () => void;
}) {
  const kind = set.kind ?? "normal";
  // El check sólo se anima cuando la serie pasa a hecha, no al abrir un ejercicio ya completado.
  const [wasDone, setWasDone] = useState(set.done);
  const [fresh, setFresh] = useState(false);
  if (set.done !== wasDone) {
    setWasDone(set.done);
    setFresh(set.done);
  }
  const rir = set.rir === undefined ? null : set.rir >= 4 ? "4+" : String(set.rir);
  const detail = [previous ? `Anterior ${previous}` : null, rir !== null ? `RIR ${rir}` : null].filter(Boolean).join(" · ");
  return (
    <li className={cn("ses-row", set.done && "is-done", fresh && "is-fresh", focused && "is-focused", `kind-${kind}`)}>
      <button type="button" className="ses-row-badge" onClick={onCycleKind} aria-label={`${label}: ${kindNames[kind]}. Cambiar tipo de serie`}>
        <span className="num">{badge}</span>
      </button>
      <button type="button" className="ses-row-main" onClick={onFocus} aria-current={focused || undefined} aria-label={`Editar ${label}: ${performance}${detail ? `. ${detail}` : ""}`}>
        <strong className="num">{performance}</strong>
        {detail && <small className="num">{detail}</small>}
      </button>
      {isRecord && <span className="ses-row-pr"><Trophy size={13} aria-hidden="true" />Récord</span>}
      <button type="button" className="ses-row-check" onClick={onToggle} aria-pressed={set.done} aria-label={`${set.done ? "Desmarcar" : "Completar"} ${label}`}>
        <Check size={18} strokeWidth={2.8} aria-hidden="true" />
      </button>
    </li>
  );
}
