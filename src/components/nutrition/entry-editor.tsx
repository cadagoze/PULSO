"use client";

import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { Button, MetaLine, NumberMetric } from "@/components/ui";
import { AmountInput, initialAmount, resolveAmount } from "@/components/nutrition/amount-input";
import { formatKcal } from "@/lib/nutrition";
import type { FoodEntry } from "@/types";

/** Cambiar la cantidad (porciones o gramos) de un alimento registrado o quitarlo. */
export function EntryEditor({ entry, onSave, onDelete }: { entry: FoodEntry; onSave: (amount: { portions: number; grams?: number }) => void; onDelete: () => void }) {
  const [amount, setAmount] = useState(() => initialAmount(entry.portion, { portions: entry.portions, grams: entry.grams }));
  const resolved = resolveAmount(amount, entry.portion);
  const factor = resolved?.portions ?? 0;
  return (
    <div className="nut-picker">
      <div className="nut-detail-head">
        <h3 className="title-m">{entry.name}</h3>
        <p className="muted">Porción: {entry.portion}</p>
      </div>
      <AmountInput portion={entry.portion} value={amount} onChange={setAmount} />
      <div className="nut-detail-values">
        <NumberMetric size="l" value={formatKcal(entry.kcal * factor)} unit="kcal" />
        <MetaLine items={[`${Math.round(entry.protein * factor)} g proteína`, `${Math.round(entry.carbs * factor)} g carbohidratos`, `${Math.round(entry.fat * factor)} g grasa`]} />
      </div>
      <Button size="l" block disabled={!resolved} onClick={() => resolved && onSave(resolved)}><Check size={18} />Guardar</Button>
      <Button variant="danger" block onClick={onDelete}><Trash2 size={16} />Quitar de la comida</Button>
    </div>
  );
}
