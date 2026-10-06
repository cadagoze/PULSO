"use client";

import Link from "next/link";
import { Calculator, ChevronRight, Plus, Scale } from "lucide-react";
import { ButtonLink, ProgressRing } from "@/components/ui";
import { WaterTracker } from "@/components/nutrition/water-tracker";
import { isLogged } from "@/components/content/meal-log";
import { formatKcal } from "@/lib/nutrition";
import { useMeals } from "@/lib/store";
import { useNutritionDay, useWaterToday, useWeeklyReview } from "@/lib/use-nutrition";
import { cn } from "@/lib/utils";

/**
 * Lo que comes y bebes hoy, a la vista en Inicio: calorías restantes y proteína (si cuentas calorías),
 * comidas registradas (si no) y el contador de agua, con registro directo.
 */
export function DayFuel({ now }: { now: number }) {
  const { profile, targets, totals, counting } = useNutritionDay(now);
  const water = useWaterToday(now);
  const [meals] = useMeals();
  const review = useWeeklyReview(now);

  return (
    <section className="section home-fuel" aria-labelledby="home-fuel-title">
      <div className="home-fuel-head">
        <h2 id="home-fuel-title" className="meta">Nutrición de hoy</h2>
        <Link href="/comidas" className="home-fuel-link">Ver día<ChevronRight size={15} aria-hidden="true" /></Link>
      </div>
      <div className="home-fuel-card">
        {counting && targets ? <Calories kcal={totals.kcal} protein={totals.protein} targetKcal={targets.kcal} targetProtein={targets.protein} /> : profile ? (
          <div className="home-fuel-simple">
            <p><b className="num">{meals.filter(isLogged).length}</b> de <span className="num">{meals.length}</span> comidas registradas</p>
            <ButtonLink href="/comidas?registrar=1" variant="secondary" size="s"><Plus size={16} />Registrar</ButtonLink>
          </div>
        ) : (
          <div className="home-fuel-simple">
            <p><b>¿Cuánto deberías comer?</b> Calcula tus calorías y macros en un minuto.</p>
            <ButtonLink href="/comidas?calcular=1" variant="secondary" size="s"><Calculator size={16} />Calcular</ButtonLink>
          </div>
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

function Calories({ kcal, protein, targetKcal, targetProtein }: { kcal: number; protein: number; targetKcal: number; targetProtein: number }) {
  const remaining = Math.round(targetKcal - kcal);
  const over = remaining < 0;
  const percent = Math.round((kcal / targetKcal) * 100);
  return (
    <div className="home-fuel-kcal">
      <div className="grow">
        <p className={cn("home-fuel-number", over && "is-over")}>
          <span className="num-display">{formatKcal(Math.abs(remaining))}</span>
          <span>kcal {over ? "sobre tu objetivo" : "restantes"}</span>
        </p>
        <p className="home-fuel-line">
          <span><b className="num">{formatKcal(kcal)}</b> de <span className="num">{formatKcal(targetKcal)}</span> kcal consumidas</span>
          <span>Proteína <b className="num">{Math.round(protein)}</b> de <span className="num">{targetProtein}</span> g</span>
        </p>
        <ButtonLink href="/comidas?registrar=1" variant="secondary" size="s" className="home-fuel-add"><Plus size={16} />Registrar comida</ButtonLink>
      </div>
      <ProgressRing value={percent} size={88} stroke={9} color={over ? "var(--gold)" : undefined} label={`${percent} % de tus calorías del día`}>
        <span className="home-fuel-percent num">{percent}<small>%</small></span>
      </ProgressRing>
    </div>
  );
}
