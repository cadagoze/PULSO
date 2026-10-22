import { ArrowDown, ArrowUp } from "lucide-react";
import type { PlanAdjustment } from "@/lib/training-plan";

/**
 * «PULSO ajustó tu semana»: lo que cambió en las series por músculo de cada zona, con su motivo. Las zonas que
 * comparten motivo van juntas, para no repetir la misma frase seis veces.
 */
export function AdjustmentList({ items }: { items: PlanAdjustment[] }) {
  const groups = items.reduce<Array<{ reason: string; items: PlanAdjustment[] }>>((list, item) => {
    const group = list.find((entry) => entry.reason === item.reason);
    if (group) group.items.push(item);
    else list.push({ reason: item.reason, items: [item] });
    return list;
  }, []);
  return (
    <div className="adjust-list">
      <p className="meta">PULSO ajustó tu semana · series por músculo</p>
      {groups.map((group) => {
        const up = group.items.every((item) => item.to > item.from);
        const Icon = up ? ArrowUp : ArrowDown;
        return (
          <div key={group.reason} className={up ? "adjust-group is-up" : "adjust-group is-down"}>
            <p className="adjust-reason"><Icon size={14} strokeWidth={2.4} aria-hidden="true" /><span>{group.reason}</span></p>
            <ul className="adjust-regions">
              {group.items.map((item) => (
                <li key={item.region}><strong>{item.label}</strong> <b className="num">{item.from} → {item.to}</b></li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
