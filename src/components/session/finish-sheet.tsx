"use client";

import { useState } from "react";
import { CircleAlert } from "lucide-react";
import { Sheet, Switch } from "@/components/ui";
import { cn } from "@/lib/utils";
import { effortOptions } from "./session-utils";
import type { Effort } from "./session-utils";

/** Selector de esfuerzo percibido 1–5, compartido con el temporizador de intervalos. */
export function EffortPicker({ value, onChange }: { value: Effort; onChange: (value: Effort) => void }) {
  return (
    <fieldset className="ses-effort">
      <legend>¿Cómo se sintió?</legend>
      <div className="ses-effort-grid">
        {effortOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={cn("ses-effort-chip", `effort-${option.value}`)}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            <b className="num">{option.value}</b>
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function FinishSheet({ open, onClose, duration, done, total, volume, onSave }: {
  open: boolean;
  onClose: () => void;
  duration: string;
  done: number;
  total: number;
  volume: string;
  onSave: (effort: Effort, feltPain: boolean) => void;
}) {
  const [effort, setEffort] = useState<Effort>(3);
  const [pain, setPain] = useState(false);
  const pending = total - done;

  return (
    <Sheet open={open} onClose={onClose} title="Terminar entrenamiento" eyebrow="Antes de guardar" className="ses-finish">
      <dl className="ses-finish-stats">
        <div><dt className="meta">Duración</dt><dd className="num">{duration}</dd></div>
        <div><dt className="meta">Series</dt><dd className="num">{done}<small>/{total}</small></dd></div>
        <div><dt className="meta">Volumen</dt><dd className="num">{volume}</dd></div>
      </dl>

      {pending > 0 && done > 0 && (
        <p className="notice warn">
          <CircleAlert size={18} />
          <span>Te quedan {pending} {pending === 1 ? "serie pendiente" : "series pendientes"}. Sólo se guardarán las series realizadas.</span>
        </p>
      )}
      {done === 0 && (
        <p className="notice danger">
          <CircleAlert size={18} />
          <span>Marca al menos una serie como hecha para poder guardar.</span>
        </p>
      )}

      <EffortPicker value={effort} onChange={setEffort} />

      <div className="toggle-row ses-pain">
        <span>
          <strong>Sentí molestias</strong>
          <small>Lo tendremos en cuenta al sugerir tus próximas sesiones.</small>
        </span>
        <Switch checked={pain} onChange={setPain} label="Sentí molestias" />
      </div>

      <div className="stack-s">
        <button type="button" className="btn btn-primary btn-large btn-block" disabled={done === 0} onClick={() => onSave(effort, pain)}>
          Guardar entrenamiento
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={onClose}>Seguir entrenando</button>
      </div>
    </Sheet>
  );
}
