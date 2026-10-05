import { Check, GlassWater, Minus, Plus } from "lucide-react";
import { formatLiters } from "@/lib/nutrition";
import { cn } from "@/lib/utils";

/**
 * Contador de agua: un toque suma un vaso de 250 ml. Los segmentos muestran la meta del día;
 * lo que pasa de la meta se indica con «+n».
 */
export function WaterTracker({ glasses, goal, onChange, className }: { glasses: number; goal: { glasses: number; liters: number }; onChange: (delta: number) => void; className?: string }) {
  const met = glasses >= goal.glasses;
  const extra = glasses - goal.glasses;
  return (
    <section className={cn("water", met && "is-met", className)} aria-label="Agua de hoy">
      <div className="water-head">
        <span className={cn("icon-tile", met && "lime")} aria-hidden="true">{met ? <Check size={18} strokeWidth={2.6} /> : <GlassWater size={18} />}</span>
        <span className="grow" aria-live="polite">
          <strong><b className="num">{glasses}</b> de <span className="num">{goal.glasses}</span> vasos</strong>
          <small>{met ? "Meta de agua cumplida" : "Agua"} · <span className="num">{formatLiters(glasses)}</span> de <span className="num">{goal.liters.toLocaleString("es-CL")}</span> L</small>
        </span>
        <button type="button" className="water-btn" onClick={() => onChange(-1)} disabled={glasses === 0} aria-label="Quitar un vaso">
          <Minus size={18} />
        </button>
        <button type="button" className="water-btn water-add" onClick={() => onChange(1)} aria-label="Sumar un vaso de agua">
          <Plus size={20} strokeWidth={2.4} />
        </button>
      </div>
      <div className="water-glasses" aria-hidden="true">
        {Array.from({ length: goal.glasses }, (_, index) => <span key={index} className={cn(index < glasses && "is-full")} />)}
        {extra > 0 && <small className="num">+{extra}</small>}
      </div>
    </section>
  );
}
