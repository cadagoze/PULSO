import { Plus, RotateCcw } from "lucide-react";
import { entryTotals, formatKcal, mealSlots } from "@/lib/nutrition";
import { cn } from "@/lib/utils";
import type { FoodEntry, MealSlot } from "@/types";

const portionLabel = (portions: number) => (portions === 1 ? "" : `${portions.toLocaleString("es-CL")} × `);

/**
 * Comidas del día con sus alimentos. Cada comida suma sus calorías; si está vacía y ayer tuvo
 * registros, ofrece repetirlos con un toque. `fresh` marca el último alimento agregado.
 */
export function MealDiary({ entries, yesterday, fresh, onAdd, onEdit, onRepeat }: {
  entries: FoodEntry[];
  yesterday: FoodEntry[];
  fresh: string | null;
  onAdd: (meal: MealSlot) => void;
  onEdit: (entry: FoodEntry) => void;
  onRepeat: (meal: MealSlot) => void;
}) {
  return (
    <ol className="nut-diary">
      {mealSlots.map((slot) => {
        const items = entries.filter((entry) => entry.meal === slot.value);
        const previous = yesterday.filter((entry) => entry.meal === slot.value);
        const total = entryTotals(items).kcal;
        return (
          <li key={slot.value} className={cn("nut-meal", items.length > 0 && "has-items")}>
            <div className="nut-meal-head">
              <span className="grow">
                <strong>{slot.label}</strong>
                <small className="num">{items.length ? `${formatKcal(total)} kcal` : "Sin registros"}</small>
              </span>
              <button type="button" className="btn-icon nut-add" onClick={() => onAdd(slot.value)} aria-label={`Agregar alimento a ${slot.label}`}>
                <Plus size={18} strokeWidth={2.4} />
              </button>
            </div>
            {items.length > 0 && (
              <ul className="nut-items">
                {items.map((entry) => (
                  <li key={entry.id}>
                    <button type="button" className={cn("nut-item", fresh === entry.id && "is-fresh")} onClick={() => onEdit(entry)}>
                      <span className="grow">
                        <span className="nut-item-name">{entry.name}</span>
                        <small>{portionLabel(entry.portions)}{entry.portion}</small>
                      </span>
                      <span className="num nut-item-kcal">{formatKcal(entry.kcal * entry.portions)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!items.length && previous.length > 0 && (
              <button type="button" className="nut-repeat" onClick={() => onRepeat(slot.value)}>
                <RotateCcw size={15} aria-hidden="true" />
                Repetir lo de ayer · <span className="num">{formatKcal(entryTotals(previous).kcal)} kcal</span>
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
