import { Plus } from "lucide-react";
import { forMeal, type DayGap, type FoodIdea } from "@/lib/day-gap";
import { amountLabel, formatKcal, mealSlots } from "@/lib/nutrition";

/**
 * ¿Qué me falta hoy?: calorías y proteína que quedan, y tres ideas para la comida de esta hora que
 * se agregan con un toque (con la porción de siempre). Sin ideas, no se muestra.
 */
export function DayGapCard({ gap, onAdd }: { gap: DayGap; onAdd: (idea: FoodIdea) => void }) {
  if (!gap.ideas.length) return null;
  const mealLabel = mealSlots.find((slot) => slot.value === gap.meal)?.label ?? "Comida";
  return (
    <section id="falta" className="cnt-section" aria-labelledby="nut-gap-title">
      <div className="cnt-head">
        <h2 id="nut-gap-title" className="meta">¿Qué me falta hoy?</h2>
        <span className="cnt-hint">Toca para agregar</span>
      </div>
      <div className="nut-gap">
        <p className="nut-gap-lead">
          Te quedan <b className="num">{formatKcal(gap.kcalLeft)} kcal</b>
          {gap.focus === "protein" && <> y <b className="num">{gap.proteinLeft} g</b> de proteína</>}. Ideas para {forMeal[gap.meal]}:
        </p>
        <ul className="nut-food-list">
          {gap.ideas.map((idea) => (
            <li key={idea.food.id}>
              <button type="button" className="nut-food" onClick={() => onAdd(idea)} aria-label={`Agregar ${idea.food.name} a ${mealLabel}: ${formatKcal(idea.kcal)} kcal, ${idea.protein} g de proteína`}>
                <span className="grow">
                  <span className="nut-item-name">{idea.food.name}{idea.usual && <span className="nut-gap-usual">Habitual</span>}</span>
                  <small>{amountLabel({ portions: idea.portions, portion: idea.food.portion })} · <span className="num">{idea.protein}</span> g proteína</small>
                </span>
                <span className="num nut-item-kcal">{formatKcal(idea.kcal)}</span>
                <span className="nut-gap-add" aria-hidden="true"><Plus size={16} strokeWidth={2.6} /></span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
