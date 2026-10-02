import { Check } from "lucide-react";
import { NumberMetric } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Meal } from "@/types";
import { isLogged, mealPhrase } from "./meal-log";

/** Frase bajo los números: cómo va el día y qué sigue. */
function dayLine(logged: number, totalMeals: number, habitsDone: number, totalHabits: number, next: Meal | undefined) {
  const habitsLeft = Math.max(0, totalHabits - habitsDone);
  if (logged >= totalMeals && habitsLeft === 0) return { lead: "Día completo", rest: "Comidas y hábitos al día." };
  if (logged >= totalMeals) return { lead: "Comidas completas", rest: habitsLeft === 1 ? "Te queda 1 hábito." : `Te quedan ${habitsLeft} hábitos.` };
  // Espacios duros para que "a las 17:30" no se corte entre líneas.
  const nextLine = next ? `Siguiente: ${mealPhrase(next)}, a\u00a0las\u00a0${next.time}.` : "";
  return { lead: logged === 0 && habitsDone === 0 ? "Aún sin registros" : "Vas bien encaminado", rest: nextLine };
}

/**
 * El día como bloque editorial: comidas registradas en grande y hábitos al lado.
 * Al cumplir una meta, la fracción se completa en tinta y aparece un check.
 */
export function DayProgress({ meals, habitsDone, habitsTotal }: { meals: Meal[]; habitsDone: number; habitsTotal: number }) {
  const logged = meals.filter(isLogged).length;
  const line = dayLine(logged, meals.length, habitsDone, habitsTotal, meals.find((meal) => !isLogged(meal)));
  return (
    <section className="cnt-day" aria-labelledby="cnt-day-title">
      <h2 id="cnt-day-title" className="meta">
        Tu día<span className="sr-only">: {logged} de {meals.length} comidas y {habitsDone} de {habitsTotal} hábitos</span>
      </h2>
      <div className="cnt-day-numbers" aria-hidden="true">
        <Fraction value={logged} total={meals.length} label="comidas" size="xl" />
        <Fraction value={habitsDone} total={habitsTotal} label="hábitos" size="l" />
      </div>
      <p className="cnt-day-line"><b>{line.lead}</b>{line.rest && ` · ${line.rest}`}</p>
    </section>
  );
}

function Fraction({ value, total, label, size }: { value: number; total: number; label: string; size: "xl" | "l" }) {
  const met = total > 0 && value >= total;
  return (
    <NumberMetric
      size={size}
      className={cn("cnt-fraction", met && "is-met")}
      value={<>{value}<span className={met ? undefined : "nmetric-soft"}>/{total}</span></>}
      label={<>{met && <span className="cnt-goal"><Check size={11} strokeWidth={3} /></span>}{label}</>}
    />
  );
}
