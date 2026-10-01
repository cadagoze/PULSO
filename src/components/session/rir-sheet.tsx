"use client";

import { Sheet } from "@/components/ui";
import { rirOptions } from "./session-utils";

export function RirSheet({ open, setLabel, value, onSelect, onClose }: {
  open: boolean;
  setLabel: string;
  value: number | undefined;
  onSelect: (value: number | undefined) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Repeticiones en reserva" eyebrow={setLabel} className="ses-rir-sheet">
      <p className="muted">¿Cuántas repeticiones más podrías haber hecho con buena técnica? 0 es llegar al fallo.</p>
      <div className="ses-rir-grid">
        {rirOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className="ses-rir-option num"
            aria-pressed={value === option.value || (option.value === 4 && value !== undefined && value > 4)}
            onClick={() => onSelect(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {value !== undefined && (
        <button type="button" className="btn btn-ghost btn-block" onClick={() => onSelect(undefined)}>Quitar registro</button>
      )}
    </Sheet>
  );
}
