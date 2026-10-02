"use client";

import type { ReactNode } from "react";
import { ArrowRight, Check, Flag, Plus, SkipForward } from "lucide-react";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import type { SetMode } from "./set-block";

export type DockMode = SetMode | "empty";

interface DockProps {
  mode: DockMode;
  restUntil: number | null;
  onComplete: () => void;
  onResume: () => void;
  onNextExercise: () => void;
  onFinish: () => void;
  onAdd: () => void;
  onAdjustRest: (deltaSeconds: number) => void;
  onSkipRest: () => void;
}

/**
 * Botón principal fijo abajo (con el área segura): «Completar serie» y, según el momento,
 * la confirmación con check, los controles del descanso, el siguiente ejercicio o terminar.
 * El botón es siempre el mismo nodo, así el foco del teclado no se pierde al cambiar de estado.
 */
export function SessionDock({ mode, restUntil, onComplete, onResume, onNextExercise, onFinish, onAdd, onAdjustRest, onSkipRest }: DockProps) {
  // Con un descanso en marcha el reloj se consulta cuatro veces por segundo; si no, casi nunca.
  const now = useNow(restUntil !== null ? 250 : 60_000);
  const hold = mode === "hold";
  const rest = !hold && mode !== "empty" && restUntil !== null && now !== 0 && now < restUntil;
  let main: { key: string; label: string; icon: ReactNode; trailing?: ReactNode; onClick?: () => void; tone: "primary" | "rest" };
  if (hold) main = { key: "hold", label: "Serie completada", icon: <span className="ses-cta-check"><Check size={18} strokeWidth={3} /></span>, tone: "primary" };
  else if (rest) main = { key: "rest", label: "Saltar descanso", icon: <SkipForward size={18} />, onClick: onSkipRest, tone: "rest" };
  else if (mode === "empty") main = { key: "empty", label: "Agregar ejercicios", icon: <Plus size={19} />, onClick: onAdd, tone: "primary" };
  else if (mode === "review") main = { key: "review", label: "Listo", icon: <Check size={19} />, onClick: onResume, tone: "primary" };
  else if (mode === "exercise-done") main = { key: "next", label: "Siguiente ejercicio", icon: null, trailing: <ArrowRight size={19} />, onClick: onNextExercise, tone: "primary" };
  else if (mode === "all-done") main = { key: "finish", label: "Terminar entrenamiento", icon: <Flag size={18} />, onClick: onFinish, tone: "primary" };
  else main = { key: "set", label: "Completar serie", icon: <Check size={20} strokeWidth={2.6} />, onClick: onComplete, tone: "primary" };

  return (
    <div className={cn("ses-dock", rest && "is-resting")}>
      <div className="ses-dock-inner">
        {rest && <button key="minus" type="button" className="ses-dock-adjust" onClick={() => onAdjustRest(-15)} aria-label="Restar 15 segundos"><span className="num">−15</span><small>s</small></button>}
        <button
          key="main"
          type="button"
          className={cn("btn btn-large ses-cta", main.tone === "rest" ? "ses-cta-rest" : "btn-primary", hold && "is-confirm")}
          onClick={main.onClick}
          aria-disabled={hold || undefined}
        >
          <span key={main.key} className="ses-cta-label">{main.icon}{main.label}{main.trailing}</span>
        </button>
        {rest && <button key="plus" type="button" className="ses-dock-adjust" onClick={() => onAdjustRest(15)} aria-label="Sumar 15 segundos"><span className="num">+15</span><small>s</small></button>}
      </div>
      <p className="sr-only" aria-live="polite">{hold ? "Serie completada." : ""}</p>
    </div>
  );
}
