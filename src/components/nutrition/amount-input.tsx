"use client";

import { SegmentedControl, Stepper } from "@/components/ui";
import { portionGrams, portionsFromGrams, portionUnit } from "@/lib/nutrition";

/** Cantidad elegida: porciones caseras o gramos (texto, para poder borrar y escribir). */
export type Amount = { mode: "portions" | "grams"; portions: number; grams: string };

type Usual = { portions?: number; grams?: number };

export function initialAmount(portion: string, usual: Usual = {}): Amount {
  const base = portionGrams(portion);
  const grams = usual.grams ?? (base ? Math.round(base) : 100);
  return { mode: usual.grams && base ? "grams" : "portions", portions: usual.portions ?? 1, grams: String(grams) };
}

/** Porciones (factor sobre los valores de la porción) y gramos si se eligió así; null si no es válido. */
export function resolveAmount(amount: Amount, portion: string): { portions: number; grams?: number } | null {
  if (amount.mode === "portions") return { portions: amount.portions };
  const grams = Math.round(Number(amount.grams.trim().replace(",", ".")));
  if (!Number.isFinite(grams) || grams < 1 || grams > 3000) return null;
  return { portions: portionsFromGrams(grams, portion), grams };
}

/**
 * Porciones con el stepper o, si la porción dice sus gramos, gramos escritos o con un toque
 * (la porción casera, 50, 100, 150 y 200).
 */
export function AmountInput({ portion, value, onChange, hint }: { portion: string; value: Amount; onChange: (next: Amount) => void; hint?: string }) {
  const base = portionGrams(portion);
  const unit = portionUnit(portion);
  const chips = [...new Set([...(base ? [Math.round(base)] : []), 50, 100, 150, 200])].sort((a, b) => a - b).slice(0, 5);

  return (
    <div className="nut-amount">
      {base && (
        <SegmentedControl<Amount["mode"]>
          label="Registrar en"
          value={value.mode}
          onChange={(mode) => onChange({ ...value, mode })}
          options={[{ value: "portions", label: "Porciones" }, { value: "grams", label: unit === "ml" ? "Mililitros" : "Gramos" }]}
        />
      )}
      {value.mode === "portions" || !base ? (
        <div className="nut-portions">
          <span className="nut-label">Porciones{hint && <small> · {hint}</small>}</span>
          <Stepper value={value.portions} onChange={(portions) => onChange({ ...value, portions })} min={0.5} max={10} step={0.5} label="porciones" format={(n) => n.toLocaleString("es-CL")} />
        </div>
      ) : (
        <div className="nut-grams">
          <label className="nut-grams-field">
            <span className="nut-label">Cantidad{hint && <small> · {hint}</small>}</span>
            <span className="nut-grams-input">
              <input inputMode="numeric" name="pulso-gramos" autoComplete="off" enterKeyHint="done" value={value.grams} onChange={(event) => onChange({ ...value, grams: event.target.value.replace(/[^\d.,]/g, "").slice(0, 5) })} onFocus={(event) => event.currentTarget.select()} aria-label={unit === "ml" ? "Mililitros" : "Gramos"} />
              <span aria-hidden="true">{unit}</span>
            </span>
          </label>
          <div className="nut-gram-chips" role="group" aria-label="Cantidades rápidas">
            {chips.map((grams) => (
              <button key={grams} type="button" className="chip num" aria-pressed={value.grams === String(grams)} onClick={() => onChange({ ...value, grams: String(grams) })}>{grams} {unit}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
