import { exerciseIllustrations } from "@/data/illustrations";
import type { IllustrationSpec } from "@/lib/illustration";
import type { Exercise } from "@/types";

/**
 * Medios de un ejercicio, sin depender de ningún proveedor. Hoy todo es propio y funciona sin conexión:
 * fotos de demostración (pocas) e ilustraciones en dos pasos (el resto). Si algún día se suma un proveedor
 * externo (GIF o video), se resuelve aquí; la interfaz sólo consume esta estructura y, si falla, vuelve a
 * lo local. La sesión activa nunca debe depender de internet.
 */
export interface ExerciseMedia {
  source: "local" | "exercisedb" | "musclewiki";
  /** Foto de demostración (portadas y tarjetas). */
  image?: string;
  /** Posición inicial y final de la foto, para la animación de la sesión y la técnica. */
  frames?: { start: string; end: string };
  gif?: string;
  video?: string;
  /** Ilustración propia (SVG en la app: no se descarga nada). */
  illustration?: IllustrationSpec;
}

export function exerciseMedia(exercise: Exercise): ExerciseMedia {
  const name = exercise.image?.split("/").pop()?.replace(/\.\w+$/, "");
  return {
    source: "local",
    image: exercise.image,
    frames: name ? { start: `/images/editorial/${name}-start.webp`, end: `/images/editorial/${name}-end.webp` } : undefined,
    illustration: exerciseIllustrations[exercise.id],
  };
}
