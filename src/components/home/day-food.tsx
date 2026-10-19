"use client";

import Link from "@/components/ui/app-link";
import { ChevronRight } from "lucide-react";
import { TodaySummary } from "@/components/nutrition/today-summary";
import { useDayMeals } from "@/lib/use-nutrition";

/** «Tu día» en Inicio: qué comidas registraste, la proteína si hay meta y el agua. Cada comida lleva a registrarla. */
export function DayFood({ now }: { now: number }) {
  const day = useDayMeals(now);
  return (
    <section className="home-food" aria-labelledby="home-food-title">
      <div className="home-section-head">
        <h2 id="home-food-title" className="meta">Tu día</h2>
        <Link href="/comidas" className="home-section-link">Comidas<ChevronRight size={15} aria-hidden="true" /></Link>
      </div>
      <TodaySummary className="home-food-card" done={day.done} href={(slot) => `/comidas?registrar=${slot}`} protein={day.protein} water={day.water} />
    </section>
  );
}
