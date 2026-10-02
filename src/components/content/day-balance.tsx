import { Metric, ProgressBar } from "@/components/ui";
import { formatNumber } from "@/lib/utils";
import type { Meal } from "@/types";
import { mealGroups, mealStats } from "./meal-log";

/** Equilibrio de lo registrado hoy: saciedad media, comidas con verduras y presencia de cada grupo. */
export function DayBalance({ meals }: { meals: Meal[] }) {
  const { details, satiety, withVeggies } = mealStats(meals);
  if (!details.length) return null;
  return (
    <section className="cnt-section" aria-labelledby="cnt-balance-title">
      <div className="cnt-head">
        <h2 id="cnt-balance-title" className="meta">Equilibrio del día</h2>
        <span className="cnt-hint">en <span className="num">{details.length}</span> {details.length === 1 ? "comida" : "comidas"}</span>
      </div>
      <div className="cnt-balance">
        <div className="cnt-balance-stats">
          <Metric value={<>{satiety === null ? "—" : formatNumber(satiety)}<span className="nmetric-soft">/5</span></>} label="Saciedad media" />
          <Metric value={<>{withVeggies}<span className="nmetric-soft">/{meals.length}</span></>} label="Comidas con verduras" />
        </div>
        <ul className="cnt-bars">
          {mealGroups.map((group) => {
            const count = details.filter((detail) => detail.groups.includes(group)).length;
            return (
              <li key={group}>
                <span>{group}</span>
                <ProgressBar value={(count / details.length) * 100} label={`${group}: ${count} de ${details.length}`} />
                <b className="num">{count}</b>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
