import { Calculator } from "lucide-react";
import { Button } from "@/components/ui";

/** Invitación a calcular las calorías: portada oscura con un número editorial. */
export function SetupPrompt({ onStart, missingWeight = false }: { onStart: () => void; missingWeight?: boolean }) {
  return (
    <section className="nut-prompt atmosphere grain on-dark" aria-labelledby="nut-prompt-title">
      <span className="num-display nut-prompt-number" aria-hidden="true">kcal</span>
      <div className="nut-prompt-body">
        <p className="meta">Tu objetivo diario</p>
        <h2 id="nut-prompt-title" className="title-l">{missingWeight ? "Registra tu peso para calcular" : "¿Cuánto deberías comer?"}</h2>
        <p>Con tu edad, estatura, peso, actividad y objetivo calculamos tus calorías, proteína, carbohidratos y grasa. Toma un minuto.</p>
      </div>
      <Button size="l" block onClick={onStart}><Calculator size={18} />Calcular mis calorías</Button>
    </section>
  );
}
