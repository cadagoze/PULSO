/**
 * Primera semana guiada: los pasos para aprovechar PULSO desde el día uno. Cada uno se marca solo
 * según lo que ya hiciste; instalar sólo aplica en el teléfono y los avisos donde el navegador los permite.
 */

export type FirstWeekStepId = "plan" | "workout" | "meal" | "install" | "push";
export interface FirstWeekStep { id: FirstWeekStepId; title: string; detail: string; done: boolean }

export function firstWeekSteps({ hasPlan, hasWorkout, hasMeal, platform, standalone, push, pushEnabled }: {
  hasPlan: boolean;
  hasWorkout: boolean;
  hasMeal: boolean;
  platform: "ios" | "android" | "desktop";
  standalone: boolean;
  push: "ready" | "needs-install" | "denied" | "unsupported";
  pushEnabled: boolean;
}): FirstWeekStep[] {
  const steps: FirstWeekStep[] = [
    { id: "plan", title: "Calcula tus calorías", detail: "Un minuto para saber cuánto comer según tu objetivo.", done: hasPlan },
    { id: "workout", title: "Haz tu primer entrenamiento", detail: "La sesión de hoy ya está lista. Sin excusas.", done: hasWorkout },
    { id: "meal", title: "Registra tu primera comida", detail: "Búscala, escanea el envase o anota las calorías.", done: hasMeal },
  ];
  if (platform !== "desktop") steps.push({ id: "install", title: "Instala PULSO", detail: "Ábrela con un toque desde tu pantalla de inicio.", done: standalone });
  if (push !== "unsupported") {
    const detail = push === "needs-install" ? "En iPhone llegan con PULSO instalada: instálala primero." : push === "denied" ? "Están bloqueados: actívalos en los ajustes de tu navegador." : "Te recordamos entrenar a tu hora y cuidar tu racha.";
    steps.push({ id: "push", title: "Activa los avisos", detail, done: pushEnabled && push === "ready" });
  }
  return steps;
}
