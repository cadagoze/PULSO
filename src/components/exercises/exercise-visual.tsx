import Image from "next/image";
import { exerciseIllustrations } from "@/data/illustrations";
import { ExerciseIllustration } from "@/components/exercises/exercise-illustration";
import { MuscleMap } from "@/components/ui/muscle-map";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/types";

/**
 * Recorte vertical de una de las dos posiciones de la foto de demostración
 * (`/images/editorial/<nombre>-start|end.webp`), o null si el ejercicio no tiene foto.
 */
export function exercisePhoto(exercise: Exercise, panel: "start" | "end" = "end") {
  const name = exercise.image?.split("/").pop()?.replace(/\.\w+$/, "");
  return name ? `/images/editorial/${name}-${panel}.webp` : null;
}

/**
 * Foto de demostración cuando existe; si no, la ilustración en dos pasos; y como último recurso,
 * el mapa muscular. `eager` carga la foto de inmediato (imágenes sobre el pliegue, LCP).
 * `immersive` llena su contenedor sobre fondo oscuro (sesión activa, portadas).
 */
export function ExerciseVisual({ exercise, size = "card", className, eager = false }: { exercise: Exercise; size?: "thumb" | "card" | "hero" | "immersive"; className?: string; eager?: boolean }) {
  const illustration = exerciseIllustrations[exercise.id];
  if (size === "immersive") {
    const panel = exercisePhoto(exercise, "end");
    if (panel) {
      return (
        <div className={cn("exercise-visual exercise-visual-immersive photo on-dark", className)}>
          <Image src={panel} alt={exercise.imageAlt ?? exercise.name} fill sizes="(max-width: 720px) 100vw, 720px" preload={eager} loading={eager ? "eager" : undefined} className="photo-img" style={{ objectPosition: "center 30%" }} />
        </div>
      );
    }
    if (illustration) {
      return (
        <div className={cn("exercise-visual exercise-visual-immersive exercise-visual-ill atmosphere grain on-dark", className)}>
          <ExerciseIllustration spec={illustration} primary={exercise.primary} labels title={`Ilustración de ${exercise.name}: posición inicial y final`} />
        </div>
      );
    }
  }
  if (exercise.image) {
    return (
      <div className={cn("exercise-visual", `exercise-visual-${size === "immersive" ? "hero" : size}`, className)}>
        <Image src={exercise.image} alt={exercise.imageAlt ?? exercise.name} fill sizes={size === "thumb" ? "64px" : size === "card" ? "(max-width: 720px) 50vw, 280px" : "(max-width: 720px) 100vw, 640px"} loading={eager ? "eager" : undefined} preload={eager && size !== "thumb" && size !== "card"} />
      </div>
    );
  }
  if (illustration) {
    return (
      <div className={cn("exercise-visual", "exercise-visual-ill", `exercise-visual-${size === "immersive" ? "hero" : size}`, className)}>
        <ExerciseIllustration
          spec={illustration}
          primary={exercise.primary}
          panels={size === "thumb" ? "end" : "both"}
          labels={size === "hero"}
          title={`Ilustración de ${exercise.name}: posición inicial y final`}
        />
      </div>
    );
  }
  return (
    <div className={cn("exercise-visual", "exercise-visual-map", `exercise-visual-${size === "immersive" ? "hero" : size}`, className)}>
      <MuscleMap primary={exercise.primary} secondary={exercise.secondary} captions={size !== "thumb" && size !== "card"} views={size === "thumb" ? [frontOrBack(exercise)] : undefined} label={`Músculos trabajados: ${exercise.muscle}`} />
    </div>
  );
}

const backMuscles = new Set(["back", "lats", "traps", "lowerBack", "glutes", "hamstrings", "triceps", "calves"]);

function frontOrBack(exercise: Exercise): "front" | "back" {
  const back = exercise.primary.filter((muscle) => backMuscles.has(muscle)).length;
  return back > exercise.primary.length / 2 ? "back" : "front";
}
