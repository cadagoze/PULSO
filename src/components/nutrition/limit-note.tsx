import { HeartPulse } from "lucide-react";
import type { NutritionTargets } from "@/lib/nutrition";
import type { NutritionSpecialCase } from "@/types";

/** Explica por qué el objetivo no sigue el ritmo elegido (mínimo seguro o situación especial). */
export function LimitNote({ targets, special }: { targets: NutritionTargets; special: NutritionSpecialCase }) {
  let text = "";
  if (targets.limited === "floor") text = "Ajustamos tu objetivo al mínimo seguro: bajar más rápido haría difícil sostenerlo y conservar músculo.";
  if (targets.limited === "minor") text = "Antes de los 18 años no proponemos déficit: te mostramos tu mantención como referencia. Si quieres cambiar tu peso, consúltalo con un profesional.";
  if (targets.limited === "special" && special === "pregnancy") text = "Durante el embarazo o la lactancia no proponemos déficit. Tus necesidades cambian: define tus calorías con tu matrona o nutricionista.";
  if (targets.limited === "special" && special === "eating-disorder") text = "Por tu bienestar, PULSO usa el registro por saciedad, sin contar calorías. Si quieres un plan con números, hazlo de la mano de un profesional.";
  if (!text) return null;
  return (
    <p className="notice warn nut-note">
      <HeartPulse size={17} aria-hidden="true" />
      <span>{text}</span>
    </p>
  );
}
