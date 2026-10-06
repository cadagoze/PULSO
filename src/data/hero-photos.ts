import { pickPhoto, type Audience } from "@/lib/personalize";

/**
 * Portadas de Inicio según la sesión del día y según a quién se muestran (mujeres, hombres o mixtas),
 * en blanco y negro con brillo de fuego (CSS). Fotos de StockSnap y rawpixel con licencia CC0
 * (uso libre, sin atribución). Donde hay dos, se alternan por día.
 */

export interface HeroPhoto { src: string; alt: string; position?: string }
export type HeroKind = "home" | "gym" | "cardio" | "mobility";

const heroPhotos: Record<HeroKind, { female: HeroPhoto[]; male: HeroPhoto[] }> = {
  home: {
    female: [{ src: "/images/editorial/hero-f-home-squat.webp", alt: "Mujer haciendo una sentadilla al aire libre", position: "center 22%" }],
    male: [{ src: "/images/editorial/hero-home-pushup.webp", alt: "Hombre con polerón haciendo flexiones en una escalera de piedra", position: "center 35%" }],
  },
  gym: {
    female: [
      { src: "/images/editorial/hero-f-gym-ropes.webp", alt: "Mujer entrenando con cuerdas de batalla en un gimnasio", position: "30% center" },
      { src: "/images/editorial/hero-gym-back.webp", alt: "Mujer de espaldas, con la musculatura marcada, en un gimnasio oscuro", position: "62% 30%" },
    ],
    male: [
      { src: "/images/editorial/hero-gym-deadlift.webp", alt: "Manos con magnesio tomando una barra antes de un peso muerto", position: "center 40%" },
      { src: "/images/editorial/hero-gym-plate.webp", alt: "Primer plano de una barra cargada con discos", position: "center 40%" },
    ],
  },
  cardio: {
    female: [{ src: "/images/editorial/hero-f-cardio-run.webp", alt: "Mujer con polerón que dice RUN", position: "center 30%" }],
    male: [{ src: "/images/editorial/hero-cardio-run.webp", alt: "Hombre corriendo junto a un muro de piedra", position: "center 30%" }],
  },
  mobility: {
    female: [{ src: "/images/editorial/hero-f-mobility-stretch.webp", alt: "Mujer estirando el cuádriceps en una pista de atletismo", position: "center 30%" }],
    male: [{ src: "/images/editorial/hero-mobility-stretch.webp", alt: "Hombre estirando el cuádriceps en un sendero", position: "center 30%" }],
  },
};

/** Tipo de portada: cardio e intervalos, movilidad, gimnasio o casa. */
export function heroKind({ focus, location, programGoal }: { focus?: string; location: "home" | "gym" | "any"; programGoal?: string }): HeroKind {
  const theme = programGoal ?? focus;
  if (theme === "conditioning") return "cardio";
  if (theme === "mobility") return "mobility";
  return location === "gym" ? "gym" : "home";
}

/** Foto de la portada para ese tipo y esa audiencia; cambia cada día si hay varias. */
export function heroPhoto(kind: HeroKind, seed: number, audience: Audience = "mixed") {
  return pickPhoto(heroPhotos[kind], audience, seed);
}

/** Todas las fotos (para comprobar que existen). */
export const allHeroPhotos = Object.values(heroPhotos).flatMap((set) => [...set.female, ...set.male]);
