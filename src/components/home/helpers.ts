import { localDaySeed } from "@/lib/utils";
import type { BodyArea } from "@/types";

/** Número de día del año (1–366): sirve de semilla para variar sugerencias entre días. */
/** Semilla del día local, compartida con Entrenar para que "Personalizar" muestre la misma sesión. */
export function dayOfYear(now: number) {
  return localDaySeed(now);
}

/** Zonas a cuidar de la evaluación, sin "none" ni respuestas libres. */
export function profileLimitations(limitations: string[] | undefined): BodyArea[] {
  return (limitations ?? []).filter((item): item is BodyArea => item === "knees" || item === "back" || item === "shoulders");
}
