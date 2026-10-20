"use client";

import { useId, useState } from "react";
import { ChevronDown, Flame } from "lucide-react";
import { Switch } from "@/components/ui";
import { cn } from "@/lib/utils";
import { warmupFocus, warmupMinutes, warmupPhaseLabels, warmupTarget, type WarmupItem } from "@/lib/warmup";

/**
 * «Calentamiento · 4 min»: lo primero de la sesión, enfocado en lo que toca hoy. Plegado dice qué
 * prepara; abierto, cada ejercicio con su parte (pulso, movilidad, activación) y si se incluye.
 */
export function WarmupPreview({ items, included, onToggle }: { items: WarmupItem[]; included: boolean; onToggle: (on: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  if (!items.length) return null;
  const focus = warmupFocus(items);

  return (
    <div className={cn("train-warm", !included && "is-off", open && "is-open")}>
      <button type="button" className="train-warm-head" aria-expanded={open} aria-controls={panel} onClick={() => setOpen((value) => !value)}>
        <span className="train-warm-icon" aria-hidden="true"><Flame size={16} /></span>
        <span className="train-warm-copy">
          <span className="train-warm-title">Calentamiento · <span className="num">{warmupMinutes(items)}</span> min</span>
          <span className="train-warm-focus">{included ? (focus ? `Para ${focus}` : "Antes de empezar") : "No se incluye en la sesión"}</span>
        </span>
        <ChevronDown size={18} className="train-warm-chevron" aria-hidden="true" />
      </button>
      <div id={panel} className="train-warm-panel" hidden={!open}>
        <ol className="train-warm-list" aria-label="Ejercicios del calentamiento">
          {items.map((item) => (
            <li key={item.exercise.id}>
              <span className="train-warm-step">
                <span className="meta train-warm-phase">{warmupPhaseLabels[item.phase]}</span>
                <span className="train-warm-name">{item.exercise.name}</span>
              </span>
              <span className="num train-warm-target">{warmupTarget(item)}</span>
            </li>
          ))}
        </ol>
        <div className="train-warm-include">
          <span>Incluir en la sesión</span>
          <Switch checked={included} onChange={onToggle} label="Incluir calentamiento" />
        </div>
      </div>
    </div>
  );
}
