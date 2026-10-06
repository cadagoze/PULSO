"use client";

import { useState, type FormEvent } from "react";
import { BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui";
import { entryTotals, formatKcal } from "@/lib/nutrition";
import type { FoodEntry } from "@/types";

/**
 * Nombre para guardar una comida y repetirla con un toque. Si ya existe una con el mismo nombre,
 * se reemplaza por esta.
 */
export function SaveMealForm({ entries, defaultName, existingNames, onSave }: { entries: FoodEntry[]; defaultName: string; existingNames: string[]; onSave: (name: string) => void }) {
  const [name, setName] = useState(defaultName);
  const clean = name.trim();
  const replaces = existingNames.some((item) => item.toLowerCase() === clean.toLowerCase());

  function submit(event: FormEvent) {
    event.preventDefault();
    if (clean) onSave(clean);
  }

  return (
    <form className="nut-save-form" onSubmit={submit}>
      <ul className="nut-save-items">
        {entries.map((entry) => (
          <li key={entry.id}>
            <span>{entry.portions === 1 ? "" : `${entry.portions.toLocaleString("es-CL")} × `}{entry.name}</span>
            <span className="num">{formatKcal(entry.kcal * entry.portions)}</span>
          </li>
        ))}
        <li className="nut-save-total"><span>Total</span><span className="num">{formatKcal(entryTotals(entries).kcal)} kcal</span></li>
      </ul>
      <label className="field">
        Nombre
        <input name="pulso-comida-nombre" autoComplete="off" value={name} maxLength={40} onChange={(event) => setName(event.target.value)} />
      </label>
      {replaces && <p className="subtle nut-note">Ya tienes una comida con ese nombre: se reemplazará por esta.</p>}
      <Button type="submit" size="l" block disabled={!clean}><BookmarkPlus size={18} />Guardar comida</Button>
    </form>
  );
}
