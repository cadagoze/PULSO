import { BookmarkCheck, BookmarkPlus, Plus, RotateCcw } from "lucide-react";
import { entryTotals, formatKcal, mealSlots } from "@/lib/nutrition";
import { cn } from "@/lib/utils";
import type { FoodEntry, MealSlot, SavedMeal } from "@/types";

const portionLabel = (portions: number) => (portions === 1 ? "" : `${portions.toLocaleString("es-CL")} × `);
/** Identifica una combinación de alimentos y porciones (para saber si ya está guardada). */
const mealKey = (items: Array<{ foodId: string; portions: number }>) => items.map((item) => `${item.foodId}:${item.portions}`).sort().join("|");

/**
 * Comidas del día con sus alimentos. Cada comida suma sus calorías; si está vacía, ofrece con un
 * toque tus comidas guardadas y lo de ayer. Una comida con registros se puede guardar para repetirla.
 * `fresh` marca el último alimento agregado.
 */
export function MealDiary({ entries, yesterday, saved, fresh, onAdd, onEdit, onRepeat, onSave, onUseSaved }: {
  entries: FoodEntry[];
  yesterday: FoodEntry[];
  saved: SavedMeal[];
  fresh: string | null;
  onAdd: (meal: MealSlot) => void;
  onEdit: (entry: FoodEntry) => void;
  onRepeat: (meal: MealSlot) => void;
  onSave: (meal: MealSlot) => void;
  onUseSaved: (meal: MealSlot, saved: SavedMeal) => void;
}) {
  const savedKeys = new Map(saved.map((item) => [mealKey(item.items), item.name]));
  return (
    <ol className="nut-diary">
      {mealSlots.map((slot) => {
        const items = entries.filter((entry) => entry.meal === slot.value);
        const previous = yesterday.filter((entry) => entry.meal === slot.value);
        const total = entryTotals(items).kcal;
        // Atajos: las comidas guardadas en esta misma comida (las demás están en el buscador).
        const shortcuts = saved.filter((item) => item.meal === slot.value).slice(0, 2);
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
            {items.length > 0 && (savedKeys.has(mealKey(items))
              ? <p className="nut-saved-note"><BookmarkCheck size={15} aria-hidden="true" />Guardada como «{savedKeys.get(mealKey(items))}»</p>
              : <button type="button" className="nut-save" onClick={() => onSave(slot.value)}><BookmarkPlus size={15} aria-hidden="true" />Guardar comida</button>)}
            {!items.length && (shortcuts.length > 0 || previous.length > 0) && (
              <div className="nut-quick">
                {shortcuts.map((item) => (
                  <button key={item.id} type="button" className="nut-repeat is-saved" onClick={() => onUseSaved(slot.value, item)}>
                    <Plus size={15} aria-hidden="true" />
                    {item.name} · <span className="num">{formatKcal(entryTotals(item.items).kcal)} kcal</span>
                  </button>
                ))}
                {previous.length > 0 && (
                  <button type="button" className="nut-repeat" onClick={() => onRepeat(slot.value)}>
                    <RotateCcw size={15} aria-hidden="true" />
                    Repetir lo de ayer · <span className="num">{formatKcal(entryTotals(previous).kcal)} kcal</span>
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
