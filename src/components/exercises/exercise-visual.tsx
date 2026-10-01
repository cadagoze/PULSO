import Image from "next/image";
import { MuscleMap } from "@/components/ui/muscle-map";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/types";

/**
 * Foto de demostración cuando existe; si no, el mapa muscular del ejercicio.
 * `eager` carga la foto de inmediato (imágenes sobre el pliegue, LCP).
 */
export function ExerciseVisual({ exercise, size = "card", className, eager = false }: { exercise: Exercise; size?: "thumb" | "card" | "hero"; className?: string; eager?: boolean }) {
  if (exercise.image) {
    return (
      <div className={cn("exercise-visual", `exercise-visual-${size}`, className)}>
        <Image src={exercise.image} alt={exercise.imageAlt ?? exercise.name} fill sizes={size === "thumb" ? "64px" : size === "hero" ? "(max-width: 720px) 100vw, 560px" : "(max-width: 720px) 50vw, 280px"} loading={eager ? "eager" : undefined} preload={eager && size === "hero"} />
      </div>
    );
  }
  return (
    <div className={cn("exercise-visual", "exercise-visual-map", `exercise-visual-${size}`, className)}>
      <MuscleMap primary={exercise.primary} secondary={exercise.secondary} captions={size === "hero"} views={size === "thumb" ? [frontOrBack(exercise)] : undefined} label={`Músculos trabajados: ${exercise.muscle}`} />
    </div>
  );
}

const backMuscles = new Set(["back", "lats", "traps", "lowerBack", "glutes", "hamstrings", "triceps", "calves"]);

function frontOrBack(exercise: Exercise): "front" | "back" {
  const back = exercise.primary.filter((muscle) => backMuscles.has(muscle)).length;
  return back > exercise.primary.length / 2 ? "back" : "front";
}
