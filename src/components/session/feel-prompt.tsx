"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExerciseRecord } from "@/types";

export type Feel = NonNullable<ExerciseRecord["feel"]>;

const options: Array<{ value: Feel; label: string }> = [
  { value: "easy", label: "Muy fácil" },
  { value: "good", label: "Bien" },
  { value: "hard", label: "Muy difícil" },
  { value: "pain", label: "Molestia" },
];

/** Lo que PULSO hará con tu respuesta: se muestra al elegir, para que entiendas el ajuste. */
export const feelNotes: Record<Feel, string> = {
  easy: "Anotado: la próxima vez subimos un poco.",
  good: "Anotado: seguimos con tu progresión.",
  hard: "Anotado: la próxima vez mantenemos la carga.",
  pain: "Anotado: la próxima vez no subimos y puedes cambiar de variante. Si el dolor es agudo o no se va, detente.",
};

/** Las cuatro respuestas, con la elegida marcada. */
export function FeelChips({ value, label, onSelect }: { value?: Feel; label: string; onSelect: (feel: Feel) => void }) {
  return (
    <div className="ses-feel-chips" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn("ses-chip", value === option.value && "has-value")}
          aria-pressed={value === option.value}
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Tras la última serie de un ejercicio, mientras descansas: una pregunta que ajusta su próxima sesión. */
export function FeelPrompt({ name, onSelect, onDismiss }: { name: string; onSelect: (feel: Feel) => void; onDismiss: () => void }) {
  return (
    <section className="ses-feel" aria-label={`¿Cómo salió ${name}?`}>
      <div className="ses-feel-head">
        <p><b>¿Cómo salió?</b> <span>{name}</span></p>
        <button type="button" className="ses-icon-btn" onClick={onDismiss} aria-label="Ahora no"><X size={17} /></button>
      </div>
      <FeelChips label={`¿Cómo salió ${name}?`} onSelect={onSelect} />
    </section>
  );
}
