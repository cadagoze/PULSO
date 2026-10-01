"use client";

import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { levelLabels } from "@/data/catalog";
import { equipmentText } from "@/components/exercises/exercise-technique";
import { FavoriteButton } from "@/components/library/favorite-button";
import { ExerciseVisual } from "@/components/exercises/exercise-visual";
import type { Exercise } from "@/types";

export function LevelDots({ level }: { level: Exercise["level"] }) {
  return (
    <span className="lib-level" title={levelLabels[level]}>
      <span className="lib-level-dots" aria-hidden="true">
        {[1, 2, 3].map((step) => <i key={step} className={step <= level ? "on" : undefined} />)}
      </span>
      {levelLabels[level]}
    </span>
  );
}

export function AvailabilityHint({ available }: { available: boolean }) {
  return available ? (
    <span className="lib-avail">
      <Check size={13} aria-hidden="true" />
      Disponible
    </span>
  ) : (
    <span className="lib-avail lib-avail-off">
      <Lock size={12} aria-hidden="true" />
      Requiere equipo
    </span>
  );
}

export function LibraryCard({ exercise, available, eager = false }: { exercise: Exercise; available: boolean; eager?: boolean }) {
  return (
    <article className="lib-card">
      <Link href={`/ejercicios/${exercise.id}`} className="lib-card-link">
        <ExerciseVisual exercise={exercise} size="card" eager={eager} className="lib-card-visual" />
        <div className="lib-card-body">
          <p className="lib-card-muscle">{exercise.muscle}</p>
          <h3>{exercise.name}</h3>
          <p className="lib-card-equip">{equipmentText(exercise)}</p>
          <div className="lib-card-meta">
            <LevelDots level={exercise.level} />
            <AvailabilityHint available={available} />
          </div>
        </div>
      </Link>
      <FavoriteButton exercise={exercise} className="lib-card-fav" />
    </article>
  );
}
