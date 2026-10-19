import { pickPhoto, type Audience } from "@/lib/personalize";

/**
 * Portadas de Inicio según la sesión del día y según a quién se muestran (mujeres, hombres o mixtas),
 * en blanco y negro con brillo de fuego (CSS). Fotos de esfuerzo real que invitan a entrenar: Pexels
 * (licencia de Pexels: uso comercial libre, sin atribución; el id va en el comentario) y una de StockSnap
 * con licencia CC0. Vienen recortadas en 4:5 con el atleta en el tercio de arriba, para que el texto
 * de la tarjeta no lo tape. Donde hay varias, se alternan por día.
 */

export interface HeroPhoto { src: string; alt: string; position?: string }
export type HeroKind = "home" | "gym" | "cardio" | "mobility";

const heroPhotos: Record<HeroKind, { female: HeroPhoto[]; male: HeroPhoto[] }> = {
  home: {
    // Pexels 2780762 · 14598858
    female: [{ src: "/images/editorial/hero-f-home-pushup.webp", alt: "Mujer haciendo flexiones sobre una colchoneta, con luz lateral", position: "center 15%" }],
    male: [{ src: "/images/editorial/hero-m-home-floor.webp", alt: "Hombre haciendo flexiones sobre un piso de cemento junto a un muro de ladrillo", position: "center 15%" }],
  },
  gym: {
    // Pexels 14591521 · 14623740 · 5327530 · 5837244; la barra con magnesio es de StockSnap (CC0).
    female: [
      { src: "/images/editorial/hero-f-gym-deadlift.webp", alt: "Mujer preparando un peso muerto frente a un muro de ladrillo", position: "center 15%" },
      { src: "/images/editorial/hero-f-gym-pull.webp", alt: "Mujer levantando una barra cargada en un gimnasio oscuro", position: "center 15%" },
    ],
    male: [
      { src: "/images/editorial/hero-m-gym-squat.webp", alt: "Hombre bajando en una sentadilla con barra dentro del rack", position: "center 15%" },
      { src: "/images/editorial/hero-m-gym-grip.webp", alt: "Hombre concentrado tomando la barra antes de levantar", position: "center 15%" },
      { src: "/images/editorial/hero-gym-deadlift.webp", alt: "Manos con magnesio tomando una barra antes de un peso muerto", position: "center 40%" },
    ],
  },
  cardio: {
    // Pexels 1552108 · 27948294
    female: [{ src: "/images/editorial/hero-f-cardio-ropes.webp", alt: "Mujer agitando cuerdas de batalla en un gimnasio en penumbra", position: "center 15%" }],
    male: [{ src: "/images/editorial/hero-m-cardio-sprint.webp", alt: "Hombre saliendo en un sprint explosivo sobre una pista", position: "center 15%" }],
  },
  mobility: {
    // Pexels 10039535 · 6388979
    female: [{ src: "/images/editorial/hero-f-mobility-lunge.webp", alt: "Mujer en una zancada baja estirando la cadera en un gimnasio", position: "center 15%" }],
    male: [{ src: "/images/editorial/hero-m-mobility-side.webp", alt: "Hombre en un estiramiento lateral con luz de ventana en un gimnasio", position: "center 15%" }],
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
