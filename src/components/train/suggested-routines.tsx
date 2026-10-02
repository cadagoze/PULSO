"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import { Plus } from "lucide-react";
import { programs } from "@/data/programs";
import { goalLabels, levelLabels } from "@/data/catalog";
import { RoutineCard } from "@/components/ui/cards";
import { nextProgramSession, programTotalSessions } from "@/lib/programs";
import { usePreference, useProgram } from "@/lib/store";
import { locationLabels, pad2 } from "@/components/train/shared";
import { orderPrograms, programPhoto } from "@/components/train/program-covers";
import type { Program, ProgramProgress } from "@/types";

/**
 * Programas como portadas grandes en carrusel: foto editorial para los de casa, portada tipográfica
 * (semanas en grande) para los de gimnasio. Primero el activo y los que encajan con tu lugar.
 * Termina con la entrada para crear una rutina propia.
 */
export function SuggestedRoutines({ onCreate }: { onCreate: () => void }) {
  const [preference] = usePreference();
  const [progress] = useProgram();
  const ordered = useMemo(() => orderPrograms(programs, preference.location, progress?.programId), [preference.location, progress?.programId]);

  return (
    <section id="programas" className="section train-section" aria-labelledby="train-suggested-title">
      <div className="section-head">
        <h2 id="train-suggested-title">Rutinas sugeridas</h2>
        <span className="meta num">{programs.length} programas</span>
      </div>
      <p className="train-section-line">Planes de varias semanas con la progresión incluida.</p>
      <div className="scroll-x train-carousel">
        {ordered.map((program, index) => (
          <ProgramCover key={program.id} program={program} progress={progress?.programId === program.id ? progress : null} index={index} />
        ))}
        <button type="button" className="train-create pressable" onClick={onCreate}>
          <span className="train-create-icon" aria-hidden="true"><Plus size={24} /></span>
          <span className="train-create-body">
            <span className="meta">Tu rutina</span>
            <span className="train-create-title">Crea la tuya</span>
            <span className="train-create-text">Elige ejercicios, series y los días que entrenas.</span>
          </span>
        </button>
      </div>
    </section>
  );
}

function ProgramCover({ program, progress, index }: { program: Program; progress: ProgramProgress | null; index: number }) {
  const photo = programPhoto(program);
  const total = programTotalSessions(program);
  const done = progress?.completed.length ?? 0;
  const next = progress ? nextProgramSession(program, progress) : null;
  const eyebrow = progress
    ? next ? `En curso · semana ${next.week} de ${program.weeks}` : "Completado"
    : `${goalLabels[program.goal]} · ${levelLabels[program.level]}`;
  return (
    <RoutineCard
      href={`/entrenar/programas/${program.id}`}
      photo={photo}
      number={photo ? undefined : pad2(program.weeks)}
      numberLabel={photo ? undefined : "Semanas"}
      eyebrow={eyebrow}
      title={program.name}
      meta={[photo ? `${program.weeks} semanas` : null, `${program.days.length} días`, `${program.minutes} min`, locationLabels[program.location]]}
      progress={progress ? (done / total) * 100 : undefined}
      className="train-program-card rise"
      style={{ "--i": index } as CSSProperties}
    />
  );
}
