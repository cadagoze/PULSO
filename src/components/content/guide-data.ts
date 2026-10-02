import type { Article } from "@/types";

/** Texto de cada lectura: entradilla (portada), introducción y qué hacer con la información. */
export const articleDetails: Record<number, { dek: string; intro: string; action: string }> = {
  1: {
    dek: "Distingue una variación normal de una tendencia antes de cambiar tu alimentación.",
    intro: "El agua, la sal, el horario de la última comida y el tránsito intestinal pueden mover la balanza de un día a otro sin que hayas ganado grasa.",
    action: "Compara promedios de siete días y pésate en condiciones similares. Recién ahí decide si necesitas ajustar algo.",
  },
  2: {
    dek: "Dos sesiones de fuerza y caminatas breves ya son una base que sí puedes sostener.",
    intro: "Dos sesiones de fuerza y caminatas breves ya forman una base útil. No es necesario concentrar todo el esfuerzo el fin de semana.",
    action: "Separa las sesiones de fuerza por al menos un día y usa caminatas de 10 minutos después de comer cuando tengas espacio.",
  },
  3: {
    dek: "Volver de a poco te devuelve la capacidad más rápido que intentar compensar.",
    intro: "Después de una pausa, intentar recuperar todo en una sesión suele dejar más fatiga que progreso. Tu capacidad regresa más rápido con una entrada gradual.",
    action: "Haz la versión corta, usa dos series por ejercicio y termina sintiendo que podrías haber hecho un poco más.",
  },
  4: {
    dek: "Sueño, molestias y energía: cuándo bajar la exigencia sin abandonar.",
    intro: "Sueño insuficiente, dolor muscular que cambia tu técnica y falta de energía inusual son señales para reducir la exigencia, no para abandonar.",
    action: "Cambia la sesión por una caminata suave, hidrátate y vuelve a evaluar mañana cómo te sientes.",
  },
  5: {
    dek: "Tu plato y tu mano bastan para estimar proporciones.",
    intro: "Un plato completo no requiere pesar alimentos: puedes estimar proporciones usando el plato y tu propia mano.",
    action: "Prueba medio plato de verduras, una palma de proteína y un puño de carbohidrato. Ajusta según hambre y energía.",
  },
  6: {
    dek: "Sube la dificultad sólo cuando la técnica se mantiene estable.",
    intro: "Subir dificultad sólo tiene sentido cuando completas todas las series con técnica estable y sin dolor durante dos sesiones seguidas.",
    action: "Agrega primero una o dos repeticiones. Si la técnica cambia, vuelve al número anterior y consolídalo.",
  },
};

/** Minutos de lectura como número ("4 min" → 4), o null si el texto no empieza con uno. */
export function readMinutes(article: Article) {
  const value = Number.parseInt(article.readTime, 10);
  return Number.isFinite(value) ? value : null;
}
