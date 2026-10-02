"use client";

import { useState } from "react";
import { Check, Undo2 } from "lucide-react";
import { Button, SegmentedControl, ToggleChip } from "@/components/ui";
import type { Meal } from "@/types";
import { mealGroups, parseSummary, satietyLabels, type MealDetail } from "./meal-log";

const satietyOptions = [1, 2, 3, 4, 5].map((value) => ({ value: String(value), label: String(value) }));

/**
 * Registro rápido de una comida: qué incluyó (al menos un grupo), saciedad de 1 a 5 y una nota opcional.
 * Si ya estaba registrada, permite además quitar el registro.
 */
export function MealForm({ meal, editing, onSave, onClear }: { meal: Meal; editing: boolean; onSave: (detail: MealDetail) => void; onClear: () => void }) {
  const [initial] = useState(() => parseSummary(meal.summary));
  const [selected, setSelected] = useState<string[]>(initial.groups);
  const [satiety, setSatiety] = useState(initial.satiety ?? 3);
  const [note, setNote] = useState(initial.note);

  function toggle(group: string) {
    setSelected((items) => (items.includes(group) ? items.filter((item) => item !== group) : [...items, group]));
  }

  return (
    <form
      className="cnt-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (selected.length) onSave({ groups: mealGroups.filter((group) => selected.includes(group)), satiety, note });
      }}
    >
      <fieldset className="cnt-fieldset">
        <legend className="cnt-legend">¿Qué incluyó? <span className="cnt-legend-hint">Elige al menos uno</span></legend>
        <div className="chips">
          {mealGroups.map((group) => (
            <ToggleChip key={group} pressed={selected.includes(group)} onChange={() => toggle(group)}>{group}</ToggleChip>
          ))}
        </div>
      </fieldset>
      <div className="cnt-fieldset">
        <div className="cnt-satiety-head">
          <span className="cnt-legend">Saciedad</span>
          <span className="cnt-satiety-value" aria-live="polite"><b className="num">{satiety}/5</b> · {satietyLabels[satiety]}</span>
        </div>
        <SegmentedControl label="Saciedad, de 1 (con hambre) a 5 (muy lleno/a)" options={satietyOptions} value={String(satiety)} onChange={(value) => setSatiety(Number(value))} />
        <span className="cnt-satiety-scale" aria-hidden="true"><span>Con hambre</span><span>Muy lleno/a</span></span>
      </div>
      <label className="field">
        Nota opcional
        <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={140} placeholder="¿Cómo te sentiste después de comer?" />
      </label>
      <div className="cnt-form-actions">
        <Button type="submit" size="l" block disabled={selected.length === 0}><Check size={18} />Guardar comida</Button>
        {editing && <Button variant="ghost" size="s" onClick={onClear}><Undo2 size={16} />Quitar registro</Button>}
      </div>
    </form>
  );
}
