"use client";

import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { Button, MetaLine, NumberMetric, Stepper } from "@/components/ui";
import { formatKcal } from "@/lib/nutrition";
import type { FoodEntry } from "@/types";

/** Cambiar las porciones de un alimento registrado o quitarlo. */
export function EntryEditor({ entry, onSave, onDelete }: { entry: FoodEntry; onSave: (portions: number) => void; onDelete: () => void }) {
  const [portions, setPortions] = useState(entry.portions);
  return (
    <div className="nut-picker">
      <div className="nut-detail-head">
        <h3 className="title-m">{entry.name}</h3>
        <p className="muted">Porción: {entry.portion}</p>
      </div>
      <div className="nut-portions">
        <span className="nut-label">Porciones</span>
        <Stepper value={portions} onChange={setPortions} min={0.5} max={10} step={0.5} label="porciones" format={(value) => value.toLocaleString("es-CL")} />
      </div>
      <div className="nut-detail-values">
        <NumberMetric size="l" value={formatKcal(entry.kcal * portions)} unit="kcal" />
        <MetaLine items={[`${Math.round(entry.protein * portions)} g proteína`, `${Math.round(entry.carbs * portions)} g carbohidratos`, `${Math.round(entry.fat * portions)} g grasa`]} />
      </div>
      <Button size="l" block onClick={() => onSave(portions)}><Check size={18} />Guardar</Button>
      <Button variant="danger" block onClick={onDelete}><Trash2 size={16} />Quitar de la comida</Button>
    </div>
  );
}
