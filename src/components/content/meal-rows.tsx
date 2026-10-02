import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Meal } from "@/types";
import { isLogged, parseSummary } from "./meal-log";

/**
 * Comidas del día en filas amplias. Tocar una abre el registro (o la edición si ya está registrada);
 * la próxima pendiente lleva el botón lima. `fresh` marca la recién registrada para animar su check.
 */
export function MealRows({ meals, fresh, onOpen }: { meals: Meal[]; fresh: string | null; onOpen: (id: string) => void }) {
  const nextId = meals.find((meal) => !isLogged(meal))?.id;
  return (
    <ol className="cnt-list">
      {meals.map((meal) => (
        <li key={meal.id}>
          <MealRow meal={meal} next={meal.id === nextId} fresh={fresh === `meal:${meal.id}`} onOpen={() => onOpen(meal.id)} />
        </li>
      ))}
    </ol>
  );
}

function MealRow({ meal, next, fresh, onOpen }: { meal: Meal; next: boolean; fresh: boolean; onOpen: () => void }) {
  const done = isLogged(meal);
  const detail = parseSummary(meal.summary);
  const facts = [detail.groups.join(", "), detail.satiety !== null ? `Saciedad ${detail.satiety}/5` : ""].filter(Boolean).join(" · ");
  const label = `${done ? "Editar" : "Registrar"} ${meal.name}, ${meal.time}, ${meal.status.toLocaleLowerCase("es-CL")}${done && facts ? `: ${facts}` : ""}`;

  return (
    <button type="button" className={cn("cnt-row cnt-meal", done && "is-done", fresh && "is-fresh")} onClick={onOpen} aria-label={label}>
      <span className="cnt-row-body">
        <span className="meta cnt-row-meta"><span className="num">{meal.time}</span> · {meal.status}</span>
        <strong className="cnt-row-title">{meal.name}</strong>
        {done && facts && <span className="cnt-row-detail">{facts}</span>}
        {done && detail.note && <span className="cnt-row-note">“{detail.note}”</span>}
      </span>
      {done ? (
        <span className="cnt-check" aria-hidden="true"><span className="cnt-check-fill"><Check size={16} strokeWidth={3} /></span></span>
      ) : next ? (
        <span className="btn btn-primary btn-small cnt-row-cta" aria-hidden="true"><Plus size={16} strokeWidth={2.4} />Registrar</span>
      ) : (
        <span className="cnt-check" aria-hidden="true"><Plus size={16} /></span>
      )}
    </button>
  );
}
