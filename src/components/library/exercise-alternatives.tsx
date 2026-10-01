"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import { exercises } from "@/data/mock-data";
import { muscleLabels } from "@/data/catalog";
import { ExerciseVisual } from "@/components/exercises/exercise-visual";
import { equipmentText } from "@/components/exercises/exercise-technique";
import { AvailabilityHint, LevelDots } from "@/components/library/library-card";
import { alternativesFor, availableEquipment, isAvailable } from "@/lib/generator";
import { exerciseById } from "@/lib/training";
import { usePreference } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Equipment, Exercise } from "@/types";

function ExerciseRow({ exercise, equipment }: { exercise: Exercise; equipment: Set<Equipment> }) {
  return (
    <li>
      <Link href={`/ejercicios/${exercise.id}`} className="lib-row">
        <ExerciseVisual exercise={exercise} size="thumb" />
        <span className="lib-row-text">
          <b>{exercise.name}</b>
          <span>{equipmentText(exercise)}</span>
        </span>
        <AvailabilityHint available={isAvailable(exercise, equipment)} />
        <ChevronRight size={18} className="lib-row-chevron" aria-hidden="true" />
      </Link>
    </li>
  );
}

function LadderStep({ exercise, label, current = false }: { exercise?: Exercise; label: string; current?: boolean }) {
  if (!exercise) {
    return (
      <div className="lib-step lib-step-none">
        <span className="lib-step-label">{label}</span>
        <p>{current ? "" : label === "Más fácil" ? "Es el punto de partida" : "Es la versión más exigente"}</p>
      </div>
    );
  }
  const body = (
    <>
      <span className="lib-step-label">{label}</span>
      <b>{exercise.name}</b>
      <LevelDots level={exercise.level} />
    </>
  );
  return current ? (
    <div className="lib-step lib-step-current" aria-current="true">{body}</div>
  ) : (
    <Link href={`/ejercicios/${exercise.id}`} className={cn("lib-step", "lib-step-link")}>{body}</Link>
  );
}

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
      <section aria-labelledby="lib-ladder-title">
        <h3 id="lib-ladder-title" className="lib-sub">Progresión</h3>
        <div className="lib-ladder">
          <LadderStep exercise={easier} label="Más fácil" />
          <ArrowRight size={16} className="lib-ladder-arrow" aria-hidden="true" />
          <LadderStep exercise={exercise} label="Actual" current />
          <ArrowRight size={16} className="lib-ladder-arrow" aria-hidden="true" />
          <LadderStep exercise={harder} label="Más difícil" />
        </div>
      </section>

      <section aria-labelledby="lib-alt-title">
        <h3 id="lib-alt-title" className="lib-sub">Mismo movimiento</h3>
        {alternatives.length ? (
          <ul className="lib-rows">
            {alternatives.map((item) => <ExerciseRow key={item.id} exercise={item} equipment={equipment} />)}
          </ul>
        ) : (
          <p className="subtle">No hay otras variantes de este patrón en la biblioteca.</p>
        )}
      </section>

      {mainMuscle && sameMuscle.length > 0 && (
        <section aria-labelledby="lib-same-title">
          <h3 id="lib-same-title" className="lib-sub">También para {muscleLabels[mainMuscle].toLowerCase()}</h3>
          <ul className="lib-rows">
            {sameMuscle.map((item) => <ExerciseRow key={item.id} exercise={item} equipment={equipment} />)}
          </ul>
        </section>
      )}
    </div>
  );
}
