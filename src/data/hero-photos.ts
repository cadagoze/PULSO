/**
 * Portadas de Inicio según la sesión del día, en blanco y negro con brillo de fuego (CSS). Fotos de
 * StockSnap y rawpixel con licencia CC0 (uso libre, sin atribución). Donde hay dos, se alternan por día.
 */

export interface HeroPhoto { src: string; alt: string; position?: string }
export type HeroKind = "home" | "gym" | "cardio" | "mobility";

const heroPhotos: Record<HeroKind, HeroPhoto[]> = {
  home: [{ src: "/images/editorial/hero-home-pushup.webp", alt: "Hombre con polerón haciendo flexiones en una escalera de piedra", position: "center 35%" }],
  gym: [
    { src: "/images/editorial/hero-gym-plate.webp", alt: "Primer plano de una barra cargada con discos", position: "center 40%" },
    { src: "/images/editorial/hero-gym-back.webp", alt: "Mujer de espaldas, con la musculatura marcada, en un gimnasio oscuro", position: "62% 30%" },
  ],
  cardio: [{ src: "/images/editorial/hero-cardio-run.webp", alt: "Hombre corriendo junto a un muro de piedra", position: "center 30%" }],
  mobility: [{ src: "/images/editorial/hero-mobility-stretch.webp", alt: "Hombre estirando el cuádriceps en un sendero", position: "center 30%" }],
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
