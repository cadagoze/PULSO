import Image from "next/image";
import { ExerciseIllustration } from "@/components/exercises/exercise-illustration";
import { MuscleMap } from "@/components/ui/muscle-map";
import { exerciseMedia } from "@/lib/exercise-media";
import { cn } from "@/lib/utils";
import type { IllustrationSpec } from "@/lib/illustration";
import type { Exercise, MuscleGroup } from "@/types";

/**
 * Recorte vertical de una de las dos posiciones de la foto de demostración
 * (`/images/editorial/<nombre>-start|end.webp`), o null si el ejercicio no tiene foto.
 */
export function exercisePhoto(exercise: Exercise, panel: "start" | "end" = "end") {
  return exerciseMedia(exercise).frames?.[panel] ?? null;
}

/**
 * Foto de demostración cuando existe; si no, la ilustración en dos pasos; y como último recurso,
 * el mapa muscular (todo viene de `exerciseMedia`, la capa propia de medios). `eager` carga la foto de inmediato (imágenes sobre el pliegue, LCP).
 * `immersive` llena su contenedor sobre fondo oscuro (sesión activa, portadas).
 */
export function ExerciseVisual({ exercise, size = "card", className, eager = false }: { exercise: Exercise; size?: "thumb" | "card" | "hero" | "immersive"; className?: string; eager?: boolean }) {
  const media = exerciseMedia(exercise);
  const illustration = media.illustration;
  if (size === "immersive") {
    // Movimiento: alterna sola entre la posición inicial y la final (con «reducir movimiento», queda fija).
    const start = media.frames?.start;
    const end = media.frames?.end;
    if (start && end) {
      return (
        <div className={cn("exercise-visual exercise-visual-immersive photo on-dark ex-move", className)} role="img" aria-label={`${exercise.name}: posición inicial y final`}>
          <Image src={start} alt="" fill sizes="(max-width: 720px) 100vw, 720px" preload={eager} loading={eager ? "eager" : undefined} className="photo-img ex-move-frame is-start" style={{ objectPosition: "center 30%" }} />
          <Image src={end} alt="" fill sizes="(max-width: 720px) 100vw, 720px" preload={eager} loading={eager ? "eager" : undefined} className="photo-img ex-move-frame is-end" style={{ objectPosition: "center 30%" }} />
          <MoveSteps />
        </div>
      );
    }
    if (illustration) {
      return <MovingIllustration spec={illustration} primary={exercise.primary} label={`Ilustración de ${exercise.name}: posición inicial y final`} className={className} />;
    }
  }
  if (media.image) {
    return (
      <div className={cn("exercise-visual", `exercise-visual-${size === "immersive" ? "hero" : size}`, className)}>
        <Image src={media.image} alt={exercise.imageAlt ?? exercise.name} fill sizes={size === "thumb" ? "64px" : size === "card" ? "(max-width: 720px) 50vw, 280px" : "(max-width: 720px) 100vw, 640px"} loading={eager ? "eager" : undefined} preload={eager && size !== "thumb" && size !== "card"} />
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

/** Ilustración a pantalla completa que alterna sola entre la posición inicial y la final (fija con «reducir movimiento»). */
export function MovingIllustration({ spec, primary, label, className }: { spec: IllustrationSpec; primary: MuscleGroup[]; label: string; className?: string }) {
  return (
    <div className={cn("exercise-visual exercise-visual-immersive exercise-visual-ill atmosphere grain on-dark ex-move", className)} role="img" aria-label={label}>
      {/* Las tres capas son una sola imagen para el lector de pantalla (la descripción va en el contenedor). */}
      <div className="ex-move-frame is-start" aria-hidden="true"><ExerciseIllustration spec={spec} primary={primary} panels="start" /></div>
      <div className="ex-move-frame is-end" aria-hidden="true"><ExerciseIllustration spec={spec} primary={primary} panels="end" /></div>
      <div className="ex-move-still" aria-hidden="true"><ExerciseIllustration spec={spec} primary={primary} labels /></div>
      <MoveSteps />
    </div>
  );
}

/** «Inicio · Final» sincronizado con la animación. */
function MoveSteps() {
  return (
    <span className="ex-move-steps" aria-hidden="true">
      <span className="is-start">Inicio</span>
      <span className="is-end">Final</span>
    </span>
  );
}

const backMuscles = new Set(["back", "lats", "traps", "lowerBack", "glutes", "hamstrings", "triceps", "calves"]);

function frontOrBack(exercise: Exercise): "front" | "back" {
  const back = exercise.primary.filter((muscle) => backMuscles.has(muscle)).length;
  return back > exercise.primary.length / 2 ? "back" : "front";
}
