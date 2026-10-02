"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { exercises } from "@/data/mock-data";
import { muscleLabels, patternLabels } from "@/data/catalog";
import { ExerciseCard } from "@/components/exercises/exercise-card";
import { ExerciseVisual } from "@/components/exercises/exercise-visual";
import { equipmentText } from "@/components/exercises/exercise-technique";
import { AvailabilityHint, LevelDots, LibraryCard } from "@/components/library/library-card";
import { alternativesFor, availableEquipment, isAvailable } from "@/lib/generator";
import { exerciseById } from "@/lib/training";
import { usePreference } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/types";

/** Un peldaño de la progresión: más fácil, el actual o más difícil. */
function LadderStep({ exercise, label, current = false, fallback }: { exercise?: Exercise; label: string; current?: boolean; fallback?: string }) {
  if (!exercise) {
    return (
      <li className="lib-step lib-step-none">
        <span className="list-row">
          <span className="lib-step-blank" aria-hidden="true" />
          <span className="grow">
            <small className="meta">{label}</small>
            <strong>{fallback}</strong>
          </span>
        </span>
      </li>
    );
  }
  const content = (
    <>
      <ExerciseVisual exercise={exercise} size="thumb" />
      <span className="grow">
        <small className="meta">{label}</small>
        <strong>{exercise.name}</strong>
        <LevelDots level={exercise.level} />
      </span>
      {current ? <span className="badge badge-ink">Estás aquí</span> : <ChevronRight size={18} className="lib-step-chevron" aria-hidden="true" />}
    </>
  );
  return (
    <li className={cn("lib-step", current && "lib-step-current")}>
      {current
        ? <span className="list-row" aria-current="true">{content}</span>
        : <Link href={`/ejercicios/${exercise.id}`} className="list-row">{content}</Link>}
    </li>
  );
}

/** Progresión (más fácil y más difícil), sustitutos del mismo patrón y otros ejercicios del mismo músculo. */
export function ExerciseAlternatives({ exercise }: { exercise: Exercise }) {
  const [preference] = usePreference();
  const equipment = useMemo(() => availableEquipment(preference), [preference]);
  const alternatives = useMemo(() => alternativesFor(exercise).slice(0, 6), [exercise]);
  const easier = exercise.easier ? exerciseById(exercise.easier) : undefined;
  const harder = exercise.harder ? exerciseById(exercise.harder) : undefined;
  const mainMuscle = exercise.primary[0];
  const sameMuscle = useMemo(() => {
    const skip = new Set([exercise.id, ...alternatives.map((item) => item.id), exercise.easier, exercise.harder]);
    return exercises.filter((item) => !skip.has(item.id) && mainMuscle && item.primary.includes(mainMuscle)).slice(0, 6);
  }, [alternatives, exercise, mainMuscle]);

  return (
    <div className="lib-alts">
      <section className="lib-alt-section" aria-labelledby="lib-ladder-title">
        <div className="lib-section-head">
          <h3 id="lib-ladder-title" className="meta">Progresión</h3>
        </div>
        <ol className="list lib-ladder">
          <LadderStep exercise={easier} label="Más fácil" fallback="Es el punto de partida" />
          <LadderStep exercise={exercise} label="Actual" current />
          <LadderStep exercise={harder} label="Más difícil" fallback="Es la versión más exigente" />
        </ol>
      </section>

      <section className="lib-alt-section" aria-labelledby="lib-alt-title">
        <div className="lib-section-head">
          <h3 id="lib-alt-title" className="meta">Mismo movimiento</h3>
          <span className="meta lib-section-note">{patternLabels[exercise.pattern]}</span>
        </div>
        {alternatives.length ? (
          <div className="lib-rows">
            {alternatives.map((item) => (
              <ExerciseCard
                key={item.id}
                exercise={item}
                href={`/ejercicios/${item.id}`}
                meta={equipmentText(item)}
                trailing={<AvailabilityHint available={isAvailable(item, equipment)} />}
              />
            ))}
          </div>
        ) : (
          <p className="lib-alt-empty">No hay otras variantes de este patrón en la biblioteca.</p>
        )}
      </section>

      {mainMuscle && sameMuscle.length > 0 && (
        <section className="lib-alt-section" aria-labelledby="lib-same-title">
          <div className="lib-section-head">
            <h3 id="lib-same-title" className="meta">También para {muscleLabels[mainMuscle].toLowerCase()}</h3>
          </div>
          <div className="scroll-x lib-alt-row">
            {sameMuscle.map((item) => <LibraryCard key={item.id} exercise={item} available={isAvailable(item, equipment)} className="lib-card-s" />)}
          </div>
        </section>
      )}
    </div>
  );
}
