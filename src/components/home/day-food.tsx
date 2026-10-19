"use client";

import Link from "@/components/ui/app-link";
import { Check, ChevronRight } from "lucide-react";
import { ProgressBar } from "@/components/ui";
import { isLogged } from "@/components/content/meal-log";
import { WaterTracker } from "@/components/nutrition/water-tracker";
import { formatKcal, mealSlots } from "@/lib/nutrition";
import { useFoodLog, useMeals } from "@/lib/store";
import { useNutritionDay, useWaterToday } from "@/lib/use-nutrition";
import { cn, localDateKey } from "@/lib/utils";
import type { MealSlot } from "@/types";

const mainMeals: MealSlot[] = ["desayuno", "almuerzo", "once", "cena"];

/**
 * «Tu día» en Inicio: qué comidas registraste (con o sin alimentos), la proteína si hay meta y el agua.
 * Las calorías sólo aparecen, en pequeño, si elegiste contarlas.
 */
export function DayFood({ now }: { now: number }) {
  const { profile, targets, totals, counting } = useNutritionDay(now);
  const water = useWaterToday(now);
  const [meals] = useMeals();
  const [log] = useFoodLog();
  const today = localDateKey(new Date(now));
  const logged = new Set<string>([...meals.filter(isLogged).map((meal) => meal.id), ...log.filter((entry) => entry.date === today).map((entry) => entry.meal)]);
  // Con antecedente de TCA no se muestran números de comida.
  const protein = targets && profile?.special !== "eating-disorder" ? { value: Math.round(totals.protein), goal: targets.protein } : null;

  return (
    <section className="home-food" aria-labelledby="home-food-title">
      <div className="home-section-head">
        <h2 id="home-food-title" className="meta">Tu día</h2>
        <Link href="/comidas" className="home-section-link">Comidas<ChevronRight size={15} aria-hidden="true" /></Link>
      </div>
      <div className="home-food-card">
        <ul className="home-meals" aria-label="Comidas de hoy">
          {mainMeals.map((slot) => {
            const done = logged.has(slot);
            const label = mealSlots.find((item) => item.value === slot)?.label ?? slot;
            return (
              <li key={slot}>
                <Link href={`/comidas?registrar=${slot}`} className={cn("home-meal", done && "is-done")} aria-label={`${label}: ${done ? "registrada" : "sin registrar, añadir"}`}>
                  <span className="home-meal-mark" aria-hidden="true">{done ? <Check size={14} strokeWidth={3} /> : "+"}</span>
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        {protein && (
          <div className="home-protein">
            <p>
              <b>Proteína</b> <span className="num">{protein.value}</span> de <span className="num">{protein.goal}</span> g
              {counting && targets && <span className="subtle"> · <span className="num">{formatKcal(totals.kcal)}</span> de <span className="num">{formatKcal(targets.kcal)}</span> kcal</span>}
            </p>
            <ProgressBar value={Math.min(100, (protein.value / protein.goal) * 100)} label="Proteína de hoy" />
          </div>
        )}
        <WaterTracker className="home-food-water" glasses={water.glasses} goal={water.goal} onChange={water.change} />
      </div>
    </section>
  );
}
