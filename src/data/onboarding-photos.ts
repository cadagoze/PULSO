import type { AssessmentStep } from "@/lib/assessment";

/**
 * Fotos de la evaluación inicial: una por paso, de esfuerzo real (Pexels, licencia de Pexels). En
 * escritorio llenan el panel; en el teléfono, la franja del número. Vienen recortadas en 4:5 con el
 * atleta arriba. Mientras no sabemos cómo te identificas (no se pregunta al empezar), se alternan.
 */
const steps: Record<AssessmentStep, { female: string; male: string }> = {
  goal: { female: "onb-f-overhead", male: "hero-m-gym-grip" },
  place: { female: "hero-f-gym-deadlift", male: "hero-m-gym-squat" },
  equipment: { female: "onb-f-dumbbell", male: "onb-m-curl" },
  time: { female: "hero-f-cardio-ropes", male: "onb-m-sprint-start" },
  consider: { female: "hero-f-mobility-lunge", male: "hero-m-mobility-side" },
};
const order: AssessmentStep[] = ["goal", "place", "equipment", "time", "consider"];

type Identity = "female" | "male" | "unspecified" | null | undefined;

export function onboardingPhoto(step: AssessmentStep, sex: Identity) {
  const pick = sex === "female" || sex === "male" ? sex : order.indexOf(step) % 2 === 0 ? "female" : "male";
  return `/images/editorial/${steps[step][pick]}.webp`;
}

/** Fondo de «Tu plan»: el lugar donde vas a entrenar, con la foto que te corresponde. */
export function resultPhoto(location: "home" | "gym" | undefined, sex: Identity) {
  const female = sex === "female";
  if (location === "gym") return `/images/editorial/${female ? "hero-f-gym-pull" : "hero-m-gym-squat"}.webp`;
  return `/images/editorial/${female ? "hero-f-home-pushup" : "hero-m-home-floor"}.webp`;
}

export const allOnboardingPhotos = [...new Set(Object.values(steps).flatMap((set) => [set.female, set.male]))].map((name) => `/images/editorial/${name}.webp`);
