"use client";

import Link from "@/components/ui/app-link";
import type { ReactNode } from "react";
import { Calculator, ChevronRight, Lightbulb, Plus, Scale } from "lucide-react";
import { ButtonLink, ProgressRing } from "@/components/ui";
import { WaterTracker } from "@/components/nutrition/water-tracker";
import { isLogged } from "@/components/content/meal-log";
import { foods } from "@/data/foods";
import { dayGap, forMeal } from "@/lib/day-gap";
import { formatKcal } from "@/lib/nutrition";
import { useCustomFoods, useFoodLog, useMeals } from "@/lib/store";
import { useNutritionDay, useWaterToday, useWeeklyReview } from "@/lib/use-nutrition";
import { cn } from "@/lib/utils";

/**
 * «Tu día» en Inicio, en un solo bloque: el chequeo antes de entrenar (si toca), las comidas (calorías y
 * proteína si cuentas calorías; si no, cuántas registraste) y el agua, con registro directo.
 */
export function DayFuel({ now, readiness }: { now: number; readiness?: ReactNode }) {
  const { profile, targets, totals, counting } = useNutritionDay(now);
  const water = useWaterToday(now);
  const [meals] = useMeals();
  const review = useWeeklyReview(now);
  const [log] = useFoodLog();
  const [customFoods] = useCustomFoods();
  // Sólo la proteína pendiente: Inicio no invita a comer más calorías.
  const gap = counting && targets ? dayGap({ targets, totals, now: new Date(now), catalog: [...customFoods, ...foods], history: log }) : null;
  const proteinGap = gap?.focus === "protein" && gap.ideas.length ? gap : null;

  return (
    <section className="section home-fuel" aria-labelledby="home-fuel-title">
      <div className="home-fuel-head">
        <h2 id="home-fuel-title" className="meta">Tu día</h2>
        <Link href="/comidas" className="home-fuel-link">Comidas<ChevronRight size={15} aria-hidden="true" /></Link>
      </div>
      <div className="home-fuel-card">
        {readiness && <div className="home-fuel-ready">{readiness}</div>}
        {counting && targets ? <Calories kcal={totals.kcal} protein={totals.protein} targetKcal={targets.kcal} targetProtein={targets.protein} /> : profile ? (
          <div className="home-fuel-simple">
            <p><b>Comidas</b> <span className="num">{meals.filter(isLogged).length}</span> de <span className="num">{meals.length}</span> registradas</p>
            <ButtonLink href="/comidas?registrar=1" variant="secondary" size="s"><Plus size={16} />Añadir</ButtonLink>
          </div>
        ) : (
          <div className="home-fuel-simple">
            <p><b>¿Cuánto deberías comer?</b> Calcula tus calorías y macros en un minuto.</p>
            <ButtonLink href="/comidas?calcular=1" variant="secondary" size="s"><Calculator size={16} />Calcular</ButtonLink>
          </div>
        )}
        {proteinGap && (
          <Link href="/comidas#falta" className="home-fuel-review">
            <span className="icon-tile accent" aria-hidden="true"><Lightbulb size={17} /></span>
            <span className="grow"><strong>Te faltan <span className="num">{proteinGap.proteinLeft}</span> g de proteína</strong><small>Ideas para {forMeal[proteinGap.meal]}</small></span>
            <ChevronRight size={18} className="subtle" aria-hidden="true" />
          </Link>
        )}
        {review.status === "ready" && review.due && (
          <Link href="/comidas#revision" className="home-fuel-review">
            <span className="icon-tile accent" aria-hidden="true"><Scale size={17} /></span>
            <span className="grow"><strong>Tu revisión semanal está lista</strong><small>Ajusta tus calorías según tu peso real</small></span>
            <ChevronRight size={18} className="subtle" aria-hidden="true" />
          </Link>
        )}
        <WaterTracker className="home-fuel-water" glasses={water.glasses} goal={water.goal} onChange={water.change} />
      </div>
    </section>
  );
}

/** Una fila compacta: el anillo del día, lo que queda y la proteína; el detalle vive en Comidas. */
function Calories({ kcal, protein, targetKcal, targetProtein }: { kcal: number; protein: number; targetKcal: number; targetProtein: number }) {
  const remaining = Math.round(targetKcal - kcal);
  const over = remaining < 0;
  const percent = Math.round((kcal / targetKcal) * 100);
  return (
    <div className="home-fuel-kcal">
      <ProgressRing value={percent} size={52} stroke={6} color={over ? "var(--gold)" : undefined} label={`${percent} % de tus calorías del día`}>
        <span className="home-fuel-percent num">{percent}<small>%</small></span>
      </ProgressRing>
      <p className={cn("grow home-fuel-number", over && "is-over")}>
        <strong><span className="num">{formatKcal(Math.abs(remaining))}</span> kcal {over ? "sobre tu objetivo" : "restantes"}</strong>
        <small>Proteína <b className="num">{Math.round(protein)}</b> de <span className="num">{targetProtein}</span> g</small>
      </p>
      <ButtonLink href="/comidas?registrar=1" variant="secondary" size="s"><Plus size={16} />Añadir</ButtonLink>
    </div>
  );
}
