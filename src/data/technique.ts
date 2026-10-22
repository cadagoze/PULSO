import type { Exercise, MovementPattern } from "@/types";

/**
 * Lo que la ficha enseña además de los pasos de cada ejercicio: el recorrido por patrón, el ritmo y
 * cómo distinguir el esfuerzo normal de una señal para detenerse. Orientativo, no indicación médica.
 */

/** Recorrido: hasta dónde bajar y subir, por patrón de movimiento. */
export const rangeOfMotion: Record<MovementPattern, string> = {
  squat: "Baja hasta donde mantengas la espalda neutra y los talones apoyados; sube hasta quedar de pie sin bloquear las rodillas.",
  hinge: "Lleva la cadera atrás hasta sentir el estiramiento detrás del muslo, con la espalda neutra; sube apretando glúteos, sin arquear la zona lumbar.",
  lunge: "Baja hasta que la rodilla de atrás quede cerca del suelo, con el tronco estable; sube empujando con la pierna de adelante.",
  "horizontal-push": "Baja con control hasta quedar cerca del apoyo, con los codos a unos 45°; empuja hasta extender los brazos sin bloquear de golpe.",
  "vertical-push": "Empuja desde los hombros hasta extender los brazos sobre la cabeza, sin arquear la espalda; baja con control hasta la barbilla.",
  "horizontal-pull": "Tira hasta que los codos pasen el tronco y los omóplatos se junten; vuelve hasta estirar los brazos sin perder la postura.",
  "vertical-pull": "Desde los brazos estirados, tira hasta llevar el pecho alto hacia la barra o el agarre; baja controlado hasta estirar del todo.",
  core: "Mantén la posición sin que la zona lumbar se hunda ni se arquee: si pierdes la postura, la serie terminó.",
  carry: "Camina erguido, con pasos cortos y los hombros abajo; termina antes de que el tronco se doble.",
  isolation: "Recorrido completo: estira del todo y contrae del todo, sin balancearte para ayudarte.",
  cardio: "Empieza suave y sube el ritmo de a poco, hasta uno que puedas sostener.",
  mobility: "Llega hasta donde sientas estiramiento, sin dolor; respira y avanza de a poco.",
};

/** Ritmo simple: en fuerza, bajar controlado y subir con intención. */
export function tempoCue(exercise: Exercise) {
  if (exercise.category !== "strength" || exercise.unit === "seconds" || exercise.pattern === "carry") return null;
  return "Baja en 2–3 segundos, con control, y sube con intención, sin rebotar.";
}

/** Lo que es normal sentir durante el esfuerzo. */
export function normalEffort(exercise: Exercise) {
  if (exercise.category === "mobility") return "Un estiramiento suave y cómodo, nunca dolor.";
  if (exercise.category === "cardio") return "El pulso y la respiración suben: deberías poder decir frases cortas.";
  return "Es normal el cansancio, el ardor en el músculo y respirar agitado.";
}

/** Señales para detenerse (distintas del esfuerzo normal). */
export const stopSigns = [
  "Dolor agudo o punzante",
  "Dolor repentino en una articulación",
  "Mareo importante o visión borrosa",
  "Dolor o presión en el pecho",
  "Pérdida súbita de fuerza",
  "Hormigueo o adormecimiento",
];
