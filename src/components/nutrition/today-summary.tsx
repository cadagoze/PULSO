"use client";

import Link from "@/components/ui/app-link";
import { Check } from "lucide-react";
import { ProgressBar } from "@/components/ui";
import { WaterTracker } from "@/components/nutrition/water-tracker";
import { WeightLogButton } from "@/components/progress/weight-sheet";
import { formatKcal, mealSlots } from "@/lib/nutrition";
import { cn } from "@/lib/utils";
import type { MealSlot } from "@/types";

const mainMeals: MealSlot[] = ["desayuno", "almuerzo", "once", "cena"];

/**
 * Tu día de comidas en un bloque (Inicio y Comidas): las cuatro comidas con ✓ o +, la proteína frente a
 * tu meta y el agua. Las calorías sólo aparecen, en pequeño, si elegiste contarlas; con antecedente de
 * TCA no se muestran números (`protein` en null).
 */
export function TodaySummary({ done, href, onPick, protein, water, className }: {
  /** Comidas ya registradas hoy (por saciedad o con alimentos). */
  done: Set<string>;
  /** Inicio: cada comida enlaza a Comidas. */
  href?: (slot: MealSlot) => string;
  /** Comidas: cada comida abre su registro. */
  onPick?: (slot: MealSlot) => void;
  protein: { value: number; goal: number | null; kcal?: { value: number; goal: number } } | null;
  water: { glasses: number; goal: { glasses: number; liters: number }; change: (delta: number) => void };
  className?: string;
}) {
  return (
    <div className={cn("day-summary", className)}>
      <ul className="meal-check" aria-label="Comidas de hoy">
        {mainMeals.map((slot) => {
          const isDone = done.has(slot);
          const label = mealSlots.find((item) => item.value === slot)?.label ?? slot;
          const aria = `${label}: ${isDone ? "registrada" : "sin registrar, añadir"}`;
          const body = (
            <>
              <span className="meal-check-mark" aria-hidden="true">{isDone ? <Check size={14} strokeWidth={3} /> : "+"}</span>
              <span>{label}</span>
            </>
          );
          return (
            <li key={slot}>
              {href
                ? <Link href={href(slot)} className={cn("meal-check-item", isDone && "is-done")} aria-label={aria}>{body}</Link>
                : <button type="button" className={cn("meal-check-item", isDone && "is-done")} onClick={() => onPick?.(slot)} aria-label={aria}>{body}</button>}
            </li>
          );
        })}
      </ul>
      {protein && (
        <div className="protein-row">
          <p>
            <b>Proteína</b> <span className="num">{Math.round(protein.value)}</span>{protein.goal ? <> de <span className="num">{protein.goal}</span> g</> : " g hoy"}
            {protein.kcal && <span className="subtle"> · <span className="num">{formatKcal(protein.kcal.value)}</span> de <span className="num">{formatKcal(protein.kcal.goal)}</span> kcal</span>}
          </p>
          {protein.goal
            ? <ProgressBar value={Math.min(100, (protein.value / protein.goal) * 100)} label="Proteína de hoy" />
            : <WeightLogButton label="Agrega tu peso para ver tu meta" className="protein-row-weight" />}
        </div>
      )}
      <WaterTracker className="day-summary-water" glasses={water.glasses} goal={water.goal} onChange={water.change} />
    </div>
  );
}
