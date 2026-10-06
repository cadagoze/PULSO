import type { Audience } from "@/lib/personalize";
import type { Program, TrainingLocation } from "@/types";

type Photo = { src: string; alt: string; position?: string };

/**
 * Portadas con fotografía (recortes verticales editoriales) para los programas de casa o de
 * cualquier lugar, con versión de mujer y de hombre. Los de gimnasio usan la portada tipográfica.
 */
const photos: Partial<Record<string, { male: Photo; female: Photo }>> = {
  "base-casa": {
    male: { src: "/images/editorial/chair-squat-end.webp", alt: "Persona haciendo una sentadilla hacia una silla en su casa", position: "center 30%" },
    female: { src: "/images/editorial/hero-f-home-squat.webp", alt: "Mujer haciendo una sentadilla al aire libre", position: "center 22%" },
  },
  "fuerza-mancuernas": {
    male: { src: "/images/editorial/incline-pushup-end.webp", alt: "Persona haciendo flexiones inclinadas apoyada en la encimera de la cocina", position: "62% 35%" },
    female: { src: "/images/editorial/hero-gym-back.webp", alt: "Mujer de espaldas, con la musculatura marcada, en un gimnasio oscuro", position: "62% 30%" },
  },
  acondicionamiento: {
    male: { src: "/images/editorial/brisk-march-end.webp", alt: "Persona marchando a paso vivo en su sala", position: "center 25%" },
    female: { src: "/images/editorial/hero-f-cardio-run.webp", alt: "Mujer con polerón que dice RUN", position: "center 30%" },
  },
  "movilidad-diaria": {
    male: { src: "/images/editorial/glute-bridge-end.webp", alt: "Persona haciendo un puente de glúteos sobre una esterilla", position: "center 58%" },
    female: { src: "/images/editorial/hero-f-mobility-stretch.webp", alt: "Mujer estirando el cuádriceps en una pista de atletismo", position: "center 30%" },
  },
};

/** Foto del programa para esa audiencia; las mixtas alternan entre programas para mostrar a ambos. */
export function programPhoto(program: Program, audience: Audience = "male"): Photo | undefined {
  const set = photos[program.id];
  if (!set) return undefined;
  if (audience !== "mixed") return set[audience];
  const index = Object.keys(photos).indexOf(program.id);
  return index % 2 === 0 ? set.female : set.male;
}

/** Orden del carrusel: el programa activo, luego los de tu lugar, los de cualquier lugar y el resto. */
export function orderPrograms(list: Program[], location: TrainingLocation, activeId?: string) {
  const rank = (program: Program) => (program.id === activeId ? 0 : program.location === location ? 1 : program.location === "any" ? 2 : 3);
  return [...list].sort((a, b) => rank(a) - rank(b));
}
