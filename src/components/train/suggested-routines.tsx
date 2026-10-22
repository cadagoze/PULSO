"use client";

import Link from "@/components/ui/app-link";
import type { CSSProperties } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { programs } from "@/data/programs";
import { goalLabels, levelLabels } from "@/data/catalog";
import { RoutineCard } from "@/components/ui/cards";
import { availableEquipment, levelFromActivities, trainingLevel } from "@/lib/generator";
import { featuredPrograms, nextProgramSession, programById, programTotalSessions, recommendedProgram } from "@/lib/programs";
import { usePreference, useProfile, useProgram, useSettings, useWorkouts } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { locationLabels, pad2 } from "@/components/train/shared";
import { programPhoto } from "@/components/train/program-covers";
import type { Program, ProgramProgress } from "@/types";
import { usePersonalization } from "@/lib/use-personalize";

/**
 * Programas sin saturar: primero el que llevas (si hay), el recomendado y los otros dos tipos (Full Body,
 * Torso / Pierna, Push / Pull / Legs), y «Personalizada» para crear tu rutina. El resto, en «Más programas».
 */
export function SuggestedRoutines({ onCreate }: { onCreate: () => void }) {
  const [preference] = usePreference();
  const [progress] = useProgram();
  const [profile] = useProfile();
  const [settings] = useSettings();
  const [workouts] = useWorkouts();
  const now = useNow();
  // El nivel sube con tu constancia (nunca baja de lo que respondiste al empezar).
  const level = now ? trainingLevel(profile?.activities, workouts, new Date(now)) : levelFromActivities(profile?.activities);
  const featured = featuredPrograms({ location: preference.location, level, hasDumbbells: availableEquipment(preference).has("dumbbells") });
  const recommended = recommendedProgram(featured, { location: preference.location, days: settings.weeklyGoal, level });
  const active = progress ? programById(progress.programId) : undefined;
  const shown = [...(active ? [active] : []), ...(recommended ? [recommended] : []), ...featured].filter((program, index, list) => list.findIndex((item) => item.id === program.id) === index);
  const more = programs.filter((program) => !shown.some((item) => item.id === program.id));

  return (
    <section id="programas" className="section train-section" aria-labelledby="train-suggested-title">
      <div className="section-head">
        <h2 id="train-suggested-title">Programas</h2>
      </div>
      <p className="train-section-line">Planes de varias semanas con la progresión incluida. Te recomendamos uno según tus días y tu lugar.</p>
      <div className="scroll-x train-carousel">
        {shown.map((program, index) => (
          <ProgramCover key={program.id} program={program} progress={progress?.programId === program.id ? progress : null} recommended={program.id === recommended?.id && progress?.programId !== program.id} away={program.location !== "any" && program.location !== preference.location} index={index} />
        ))}
        <button type="button" className="train-create pressable" onClick={onCreate}>
          <span className="train-create-icon" aria-hidden="true"><Plus size={24} /></span>
          <span className="train-create-body">
            <span className="meta">Personalizada</span>
            <span className="train-create-title">Crea la tuya</span>
            <span className="train-create-text">Elige ejercicios, series y los días que entrenas.</span>
          </span>
        </button>
      </div>
      {more.length > 0 && (
        <details className="train-more-programs">
          <summary>Más programas · <span className="num">{more.length}</span></summary>
          <ul className="list">
            {more.map((program) => (
              <li key={program.id}>
                <Link href={`/entrenar/programas/${program.id}`} className="list-row">
                  <span className="grow">
                    <strong>{program.name}</strong>
                    <small>{program.weeks} semanas · {program.days.length} días · {program.minutes} min · {locationLabels[program.location]}</small>
                  </span>
                  <ChevronRight size={18} className="subtle" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function ProgramCover({ program, progress, recommended, away, index }: { program: Program; progress: ProgramProgress | null; recommended: boolean; away: boolean; index: number }) {
  const { audience } = usePersonalization();
  const photo = programPhoto(program, audience);
  const total = programTotalSessions(program);
  const done = progress?.completed.length ?? 0;
  const next = progress ? nextProgramSession(program, progress) : null;
  const eyebrow = progress
    ? next ? `En curso · semana ${next.week} de ${program.weeks}` : "Completado"
    : recommended ? "Recomendado para ti" : `${goalLabels[program.goal]} · ${levelLabels[program.level]}`;
  return (
    <RoutineCard
      href={`/entrenar/programas/${program.id}`}
      photo={photo}
      number={photo ? undefined : pad2(program.weeks)}
      numberLabel={photo ? undefined : "Semanas"}
      eyebrow={eyebrow}
      title={program.name}
      meta={[photo ? `${program.weeks} semanas` : null, `${program.days.length} días`, `${program.minutes} min`, away ? `Sólo ${locationLabels[program.location].toLowerCase()}` : locationLabels[program.location]]}
      progress={progress ? (done / total) * 100 : undefined}
      className="train-program-card rise"
      style={{ "--i": index } as CSSProperties}
    />
  );
}
