"use client";

import Link from "@/components/ui/app-link";
import { Check, Lock } from "lucide-react";
import { levelLabels } from "@/data/catalog";
import { equipmentText } from "@/components/exercises/exercise-technique";
import { FavoriteButton } from "@/components/library/favorite-button";
import { ExerciseVisual } from "@/components/exercises/exercise-visual";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/types";

/** Tres barras crecientes, decorativas (el nombre del nivel va aparte). */
export function LevelBars({ level }: { level: Exercise["level"] }) {
  return (
    <span className="lib-level-dots" aria-hidden="true">
      {[1, 2, 3].map((step) => <i key={step} className={step <= level ? "on" : undefined} />)}
    </span>
  );
}

/** Nivel como tres barras y su nombre (en `compact`, el nombre sólo para lectores de pantalla). */
export function LevelDots({ level, compact = false }: { level: Exercise["level"]; compact?: boolean }) {
  return (
    <span className="lib-level" title={levelLabels[level]}>
      <LevelBars level={level} />
      {compact ? <span className="sr-only">{levelLabels[level]}</span> : levelLabels[level]}
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

/** Tarjeta de la biblioteca: visual arriba, nombre, músculo y una línea sutil de nivel y equipo. */
export function LibraryCard({ exercise, available, eager = false, className }: { exercise: Exercise; available: boolean; eager?: boolean; className?: string }) {
  return (
    <article className={cn("lib-card", className)}>
      <Link href={`/ejercicios/${exercise.id}`} className="lib-card-link">
        <ExerciseVisual exercise={exercise} size="card" eager={eager} className="lib-card-visual" />
        <div className="lib-card-text">
          <h3 className="lib-card-name">{exercise.name}</h3>
          <span className="lib-card-muscle">{exercise.muscle}</span>
          <span className={cn("lib-card-meta", !available && "is-locked")}>
            <LevelDots level={exercise.level} compact />
            {!available && <Lock size={11} aria-hidden="true" className="lib-card-lock" />}
            <span className="lib-card-equip">{equipmentText(exercise)}</span>
            {!available && <span className="sr-only">(requiere equipo que no tienes marcado)</span>}
          </span>
        </div>
      </Link>
      <FavoriteButton exercise={exercise} className="lib-card-fav" size={16} />
    </article>
  );
}
