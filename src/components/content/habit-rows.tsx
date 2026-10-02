import { Check } from "lucide-react";
import { habits } from "@/data/mock-data";
import { cn } from "@/lib/utils";

/** Hábitos del día: cada fila se marca y desmarca con un toque. `fresh` anima sólo el recién marcado. */
export function HabitRows({ checked, fresh, onToggle }: { checked: number[]; fresh: string | null; onToggle: (id: number) => void }) {
  return (
    <ul className="cnt-list">
      {habits.map((habit) => {
        const on = checked.includes(habit.id);
        return (
          <li key={habit.id}>
            <button type="button" className={cn("cnt-row cnt-habit", on && "is-done", fresh === `habit:${habit.id}` && "is-fresh")} aria-pressed={on} onClick={() => onToggle(habit.id)}>
              <span className="cnt-row-body">
                <strong className="cnt-row-title">{habit.title}</strong>
                <span className="cnt-row-detail">{habit.detail}</span>
              </span>
              <span className="cnt-check" aria-hidden="true">
                {on && <span className="cnt-check-fill"><Check size={16} strokeWidth={3} /></span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
