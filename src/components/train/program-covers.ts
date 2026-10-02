import type { Program, TrainingLocation } from "@/types";

type Photo = { src: string; alt: string; position?: string };

/**
 * Portadas con fotografía (recortes verticales editoriales) para los programas de casa o de
 * cualquier lugar. Los de gimnasio no tienen una foto que encaje: usan la portada tipográfica.
 */
const photos: Partial<Record<string, Photo>> = {
  "base-casa": { src: "/images/editorial/chair-squat-end.webp", alt: "Persona haciendo una sentadilla hacia una silla en su casa", position: "center 30%" },
  "fuerza-mancuernas": { src: "/images/editorial/incline-pushup-end.webp", alt: "Persona haciendo flexiones inclinadas apoyada en la encimera de la cocina", position: "62% 35%" },
  acondicionamiento: { src: "/images/editorial/brisk-march-end.webp", alt: "Persona marchando a paso vivo en su sala", position: "center 25%" },
  "movilidad-diaria": { src: "/images/editorial/glute-bridge-end.webp", alt: "Persona haciendo un puente de glúteos sobre una esterilla", position: "center 58%" },
};

export function programPhoto(program: Program): Photo | undefined {
  return photos[program.id];
}

/** Orden del carrusel: el programa activo, luego los de tu lugar, los de cualquier lugar y el resto. */
export function orderPrograms(list: Program[], location: TrainingLocation, activeId?: string) {
  const rank = (program: Program) => (program.id === activeId ? 0 : program.location === location ? 1 : program.location === "any" ? 2 : 3);
  return [...list].sort((a, b) => rank(a) - rank(b));
}
