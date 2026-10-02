import type { Meal } from "@/types";
import { mealIdea, mealPhrase } from "./meal-log";

/** Banner editorial (atmósfera y grano) con una idea para la próxima comida o la lectura del día. */
export function MealIdea({ next }: { next: Meal | undefined }) {
  const idea = mealIdea(next);
  return (
    <aside className="cnt-idea atmosphere grain on-dark" aria-labelledby="cnt-idea-title">
      <div className="cnt-idea-top">
        <p className="meta">{next ? `Idea para ${mealPhrase(next)}` : "Lectura de tu día"}</p>
        {next && <p className="meta num">{next.time}</p>}
      </div>
      <h2 id="cnt-idea-title" className="cnt-idea-title">{idea.title}</h2>
      <p className="cnt-idea-detail">{idea.detail}</p>
    </aside>
  );
}
