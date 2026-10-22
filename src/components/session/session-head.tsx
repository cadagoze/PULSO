import { Link2, Maximize2, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Exercise, ExerciseRecord } from "@/types";

/**
 * Lo que necesitas mirar antes de la serie: el nombre, el objetivo (rango y RIR), tres claves técnicas y el aviso de seguridad.
 * La explicación completa (pasos, respiración, adaptaciones) se abre aparte con «Técnica».
 */
export function SessionHead({ exercise, record, target, explain, superset, fromPrev, onTechnique }: {
  exercise: Exercise;
  record: ExerciseRecord;
  /** «8–12 rep · RIR 2» (sin valor en el calentamiento). */
  target?: string;
  /** Qué significa el RIR, mientras aprendes. */
  explain?: string;
  /** Letra de la superserie (A, B…) si el ejercicio se alterna con el siguiente. */
  superset?: string;
  fromPrev: boolean;
  onTechnique: () => void;
}) {
  return (
    <header className={cn("ses-head", fromPrev && "from-prev")}>
      {superset && (
        <span className="photo-tag glass ses-head-tag"><Link2 size={13} aria-hidden="true" />Superserie {superset} · alterna sin descanso</span>
      )}
      <h1 className="ses-name">{exercise.name}</h1>
      {target && (
        <p className="ses-target">
          <span className="meta">Objetivo</span> <b className="num">{target}</b>
          {explain && <small>{explain}</small>}
        </p>
      )}
      <div className="ses-cues">
        <ol aria-label="Claves de técnica">
          {exercise.phases.slice(0, 3).map((phase, position) => (
            <li key={phase}><span className="num" aria-hidden="true">{position + 1}</span>{phase}</li>
          ))}
        </ol>
        <button type="button" className="ses-cues-more" onClick={onTechnique}>
          <Maximize2 size={13} aria-hidden="true" />Técnica
        </button>
      </div>
      <p className="ses-safety">Si aparece dolor agudo, detén el ejercicio.</p>
      {record.note && <p className="ses-head-note"><StickyNote size={14} aria-hidden="true" /><span>{record.note}</span></p>}
    </header>
  );
}
