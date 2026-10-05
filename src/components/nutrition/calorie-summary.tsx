import type { CSSProperties } from "react";
import { NumberMetric } from "@/components/ui";
import { formatKcal, type NutritionTargets, type Totals } from "@/lib/nutrition";
import { cn } from "@/lib/utils";

/**
 * El día en números: calorías restantes en grande, lo consumido frente al objetivo
 * y las barras de proteína, carbohidratos y grasa.
 */
export function CalorieSummary({ targets, totals }: { targets: NutritionTargets; totals: Totals }) {
  const remaining = Math.round(targets.kcal - totals.kcal);
  const over = remaining < 0;
  const progress = Math.min(1, totals.kcal / targets.kcal);
  const macros = [
    { key: "protein", label: "Proteína", value: totals.protein, goal: targets.protein },
    { key: "carbs", label: "Carbohidratos", value: totals.carbs, goal: targets.carbs },
    { key: "fat", label: "Grasa", value: totals.fat, goal: targets.fat },
  ];

  return (
    <section className="nut-summary" aria-labelledby="nut-summary-title">
      <h2 id="nut-summary-title" className="meta">Hoy · Objetivo {formatKcal(targets.kcal)} kcal</h2>
      <NumberMetric
        size="xl"
        className={cn("nut-remaining", over && "is-over")}
        value={formatKcal(Math.abs(remaining))}
        label={over ? "kcal sobre tu objetivo" : remaining === 0 ? "Objetivo justo" : "kcal restantes"}
      />
      <div className="nut-kcal-track" role="progressbar" aria-label="Calorías consumidas" aria-valuenow={Math.round(totals.kcal)} aria-valuemin={0} aria-valuemax={targets.kcal}>
        <span style={{ "--value": progress } as CSSProperties} className={over ? "is-over" : undefined} />
      </div>
      <p className="nut-summary-line"><b className="num">{formatKcal(totals.kcal)}</b> de <span className="num">{formatKcal(targets.kcal)}</span> kcal consumidas</p>
      <ul className="nut-macros">
        {macros.map((macro) => {
          const met = macro.goal > 0 && macro.value >= macro.goal;
          return (
            <li key={macro.key} className={cn("nut-macro", `nut-macro-${macro.key}`, met && "is-met")}>
              <span className="nut-macro-head">
                <span>{macro.label}</span>
                <span className="num"><b>{Math.round(macro.value)}</b> / {macro.goal} g</span>
              </span>
              <span className="nut-macro-track" aria-hidden="true">
                <span style={{ "--value": macro.goal ? Math.min(1, macro.value / macro.goal) : 0 } as CSSProperties} />
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
