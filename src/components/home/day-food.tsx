"use client";

import type { ReactNode } from "react";
import Link from "@/components/ui/app-link";
import { Check, ChevronRight } from "lucide-react";
import { ProgressBar } from "@/components/ui";
import { formatKcal } from "@/lib/nutrition";
import { useDayMeals } from "@/lib/use-nutrition";

const MAIN_MEALS = ["desayuno", "almuerzo", "once", "cena"];

/**
 * Alimentación en Inicio, secundaria y breve: proteína (o calorías, si las cuentas) y agua; con todo al
 * día, una sola línea. Desde la tarde, si falta bastante proteína, cuánto y dónde ver ideas. Con
 * antecedente de TCA, comidas registradas en vez de números. El diario completo vive en Comidas.
 */
export function DayFood({ now }: { now: number }) {
  const day = useDayMeals(now);
  const { protein, water, safe, counting } = day;
  const meals = MAIN_MEALS.filter((slot) => day.done.has(slot)).length;
  const goal = safe ? null : protein?.goal ?? null;
  const eaten = Math.round(protein?.value ?? 0);
  const gap = goal ? Math.round(goal - eaten) : 0;
  const waterGoal = water.goal.glasses;
  const waterDone = water.glasses >= waterGoal;
  const allGood = waterDone && (goal ? eaten >= goal * 0.95 : meals >= MAIN_MEALS.length);
  const showGap = !allGood && Boolean(goal) && new Date(now).getHours() >= 14 && gap >= 20;

  return (
    <section className="home-food" aria-labelledby="home-food-title">
      <div className="home-section-head">
        <h2 id="home-food-title" className="meta">Alimentación</h2>
        <Link href="/comidas" className="home-section-link">Comidas<ChevronRight size={15} aria-hidden="true" /></Link>
      </div>
      {allGood ? (
        <p className="home-food-ok"><Check size={16} strokeWidth={2.6} aria-hidden="true" />Alimentación al día</p>
      ) : (
        <ul className="home-food-rows">
          {goal
            ? <FoodRow label="Proteína" value={<><b className="num">{eaten}</b> / <span className="num">{goal}</span> g</>} ratio={eaten / goal} />
            : <FoodRow label="Comidas" value={<><b className="num">{meals}</b> de <span className="num">{MAIN_MEALS.length}</span></>} ratio={meals / MAIN_MEALS.length} />}
          {counting && protein?.kcal && <FoodRow label="Calorías" value={<><b className="num">{formatKcal(protein.kcal.value)}</b> / <span className="num">{formatKcal(protein.kcal.goal)}</span></>} ratio={protein.kcal.value / protein.kcal.goal} />}
          <FoodRow label="Agua" value={<><b className="num">{water.glasses}</b> / <span className="num">{waterGoal}</span> vasos</>} ratio={water.glasses / waterGoal} />
        </ul>
      )}
      {showGap && (
        <p className="home-food-gap">
          Te faltan ~<span className="num">{gap}</span> g de proteína. <Link href="/comidas?registrar" className="home-food-link">Ver ideas</Link>
        </p>
      )}
    </section>
  );
}

function FoodRow({ label, value, ratio }: { label: string; value: ReactNode; ratio: number }) {
  return (
    <li className="home-food-row">
      <span className="home-food-label">{label}</span>
      <span className="home-food-value">{value}</span>
      <ProgressBar value={ratio * 100} label={label} />
    </li>
  );
}
