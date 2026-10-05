"use client";

import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Button, MetaLine, NumberMetric, Stepper } from "@/components/ui";
import { calorieFloor, formatKcal, nutritionTargets } from "@/lib/nutrition";
import type { NutritionProfile } from "@/types";

/** Fijar las calorías a mano (por ejemplo, las que indicó un nutricionista), nunca bajo el mínimo seguro. */
export function CalorieAdjust({ profile, weightKg, onSave }: { profile: NutritionProfile; weightKg: number; onSave: (customKcal: number | undefined) => void }) {
  const automatic = nutritionTargets({ ...profile, customKcal: undefined }, weightKg);
  const [kcal, setKcal] = useState(profile.customKcal ?? automatic.kcal);
  const preview = nutritionTargets({ ...profile, customKcal: kcal }, weightKg);
  return (
    <div className="nut-picker">
      <p className="muted">El cálculo automático propone <b className="num">{formatKcal(automatic.kcal)}</b> kcal. Úsalo si un profesional te indicó otra cifra.</p>
      <div className="nut-portions">
        <span className="nut-label">Calorías al día</span>
        <Stepper value={kcal} onChange={setKcal} min={calorieFloor[profile.sex]} max={6000} step={50} label="calorías" format={formatKcal} />
      </div>
      <div className="nut-detail-values">
        <NumberMetric size="l" value={formatKcal(preview.kcal)} unit="kcal" />
        <MetaLine items={[`${preview.protein} g proteína`, `${preview.carbs} g carbohidratos`, `${preview.fat} g grasa`]} />
      </div>
      <Button size="l" block onClick={() => onSave(kcal === automatic.kcal ? undefined : kcal)}><Check size={18} />Guardar</Button>
      {profile.customKcal !== undefined && <Button variant="ghost" block onClick={() => onSave(undefined)}><RotateCcw size={16} />Volver al cálculo automático</Button>}
    </div>
  );
}
