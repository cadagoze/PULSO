import Link from "@/components/ui/app-link";
import type { ReactNode } from "react";
import { ExerciseVisual } from "@/components/exercises/exercise-visual";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/types";

/**
 * Ejercicio en una lista: miniatura (foto o ilustración), nombre y detalle.
 * Con acciones propias (cambiar, quitar) usa `trailing` sin `href` ni `onClick`, para no anidar botones.
 */
export function ExerciseCard({ exercise, href, onClick, meta, trailing, index, className }: { exercise: Exercise; href?: string; onClick?: () => void; meta?: ReactNode; trailing?: ReactNode; index?: number; className?: string }) {
  const content = (
    <>
      {index !== undefined && <span className="exercise-card-index num">{String(index + 1).padStart(2, "0")}</span>}
      <ExerciseVisual exercise={exercise} size="thumb" />
      <span className="grow">
        <strong>{exercise.name}</strong>
        <small>{meta ?? exercise.muscle}</small>
      </span>
      {trailing && <span className="exercise-card-trailing">{trailing}</span>}
    </>
  );
  if (href) return <Link href={href} className={cn("exercise-card", className)}>{content}</Link>;
  if (onClick) return <button type="button" className={cn("exercise-card", className)} onClick={onClick}>{content}</button>;
  return <div className={cn("exercise-card", className)}>{content}</div>;
}
