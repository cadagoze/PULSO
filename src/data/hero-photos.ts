/**
 * Portadas de Inicio según la sesión del día. Fotos de StockSnap con licencia CC0 (uso libre, sin
 * atribución); la de casa es la editorial original. Donde hay dos, se alternan por día.
 */

export interface HeroPhoto { src: string; alt: string; position?: string }
export type HeroKind = "home" | "gym" | "cardio" | "mobility";

const heroPhotos: Record<HeroKind, HeroPhoto[]> = {
  home: [{ src: "/images/editorial/home-squat.webp", alt: "Persona haciendo una sentadilla en su sala, con luz natural", position: "66% 38%" }],
  gym: [
    { src: "/images/editorial/hero-gym-kettlebell.webp", alt: "Hombre mayor sonriendo mientras levanta una pesa rusa", position: "center 22%" },
    { src: "/images/editorial/hero-gym-squat.webp", alt: "Mujer haciendo una sentadilla con banda elástica al aire libre", position: "center top" },
  ],
  cardio: [{ src: "/images/editorial/hero-cardio.webp", alt: "Hombre corriendo por un sendero entre árboles", position: "center 30%" }],
  mobility: [{ src: "/images/editorial/hero-mobility-lake.webp", alt: "Mujer de espaldas estirando los brazos hacia el cielo frente a un lago", position: "center 18%" }],
};

/** Tipo de portada: cardio e intervalos, movilidad, gimnasio o casa. */
export function heroKind({ focus, location, programGoal }: { focus?: string; location: "home" | "gym" | "any"; programGoal?: string }): HeroKind {
  const theme = programGoal ?? focus;
  if (theme === "conditioning") return "cardio";
  if (theme === "mobility") return "mobility";
  return location === "gym" ? "gym" : "home";
}

/** Foto de la portada; si hay varias para el mismo tipo, cambia cada día. */
export function heroPhoto(kind: HeroKind, seed: number) {
  const options = heroPhotos[kind];
  return options[Math.abs(seed) % options.length];
}
