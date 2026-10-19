"use client";

import Link from "@/components/ui/app-link";
import type { CSSProperties } from "react";
import { ChevronDown, Ellipsis, Play } from "lucide-react";
import { clockLabel, durationSeconds } from "@/lib/training";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import type { TrainingDraft } from "@/types";

/** Reloj de la sesión: se aísla para que sólo esta parte se vuelva a pintar cada segundo. */
export function SessionClock({ draft }: { draft: TrainingDraft }) {
  const now = useNow(1000);
  return <span className="num">{now === 0 ? "--:--" : clockLabel(durationSeconds(draft, now))}</span>;
}

/**
 * Barra superior sobre la imagen: minimizar (la sesión sigue en curso), reloj (toca para pausar o
 * reanudar), el avance por ejercicio en segmentos y el menú (ahí está «Ver sesión»).
 */
export function SessionTopBar({ draft, current, onTogglePause, onOpenMenu }: {
  draft: TrainingDraft;
  current: number;
  onTogglePause: () => void;
  onOpenMenu: () => void;
}) {
  const paused = draft.runningSince === null;
  const count = draft.records.length;
  return (
    <div className="ses-top">
      {count > 0 && (
        <div className="ses-segments" aria-hidden="true">
          {draft.records.map((record, index) => {
            const done = record.sets.filter((set) => set.done).length;
            return (
              <span key={index} className={cn(index === current && "is-current")}>
                <i style={{ "--value": record.sets.length ? done / record.sets.length : 0 } as CSSProperties} />
              </span>
            );
          })}
        </div>
      )}
      <div className="ses-top-row">
        <Link href="/" className="ses-glass ses-round" aria-label="Minimizar: el entrenamiento sigue en curso">
          <ChevronDown size={22} />
        </Link>
        <button type="button" className={cn("ses-glass ses-clock", paused && "is-paused")} onClick={onTogglePause} aria-pressed={paused}>
          {paused ? <Play size={13} fill="currentColor" aria-hidden="true" /> : <span className="ses-clock-dot" aria-hidden="true" />}
          <span className="sr-only">{paused ? "Reanudar entrenamiento. Tiempo:" : "Pausar entrenamiento. Tiempo:"}</span>
          <SessionClock draft={draft} />
          {paused && <span className="ses-clock-state" aria-hidden="true">En pausa</span>}
        </button>
        <span className="ses-top-gap" />
        <button type="button" className="ses-glass ses-round" onClick={onOpenMenu} aria-label={count > 0 ? `Más opciones · ejercicio ${current + 1} de ${count}` : "Más opciones"}>
          <Ellipsis size={21} />
        </button>
      </div>
    </div>
  );
}
