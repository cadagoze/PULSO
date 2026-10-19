/**
 * Fotos de la evaluación inicial: una por paso, de esfuerzo real (Pexels, licencia de Pexels; la de
 * «Lo que te frena» es la portada). En escritorio llenan el panel; en el teléfono, la franja del número.
 * Vienen recortadas en 4:5 con el atleta arriba. Mientras no sabemos cómo te identificas, se alternan.
 */
const steps: Array<{ female: string; male: string }> = [
  { female: "onb-f-overhead", male: "hero-m-gym-grip" }, // ¿Cómo te llamamos?
  { female: "hero-f-cardio-ropes", male: "hero-m-cardio-sprint" }, // ¿Cómo te identificas?
  { female: "hero-f-gym-deadlift", male: "hero-m-gym-squat" }, // ¿Qué te gustaría mejorar?
  { female: "onb-f-dumbbell", male: "onb-m-sprint-start" }, // Tu semana normal
  { female: "hero-f-home-pushup", male: "hero-m-home-floor" }, // ¿Dónde vas a entrenar?
  { female: "hero-f-gym-pull", male: "onb-m-curl" }, // Tiempo por sesión
  { female: "hero-f-mobility-lunge", male: "hero-m-mobility-side" }, // Zonas a cuidar
  { female: "onb-f-overhead", male: "splash-hard" }, // Lo que te frena
  { female: "onb-f-dumbbell", male: "onb-m-curl" }, // Tu cuerpo
];

type Identity = "female" | "male" | "unspecified" | null | undefined;

export function onboardingPhoto(step: number, sex: Identity) {
  const set = steps[Math.max(0, Math.min(step, steps.length - 1))];
  const pick = sex === "female" || sex === "male" ? sex : step % 2 === 0 ? "female" : "male";
  return `/images/editorial/${set[pick]}.webp`;
}

/** Fondo de «Tu plan inicial»: el lugar donde vas a entrenar, con la foto que te corresponde. */
export function resultPhoto(location: "home" | "gym" | undefined, sex: Identity) {
  const female = sex === "female";
  if (location === "gym") return `/images/editorial/${female ? "hero-f-gym-pull" : "hero-m-gym-squat"}.webp`;
  return `/images/editorial/${female ? "hero-f-home-pushup" : "hero-m-home-floor"}.webp`;
}

export const allOnboardingPhotos = [...new Set(steps.flatMap((set) => [set.female, set.male]))].map((name) => `/images/editorial/${name}.webp`);
