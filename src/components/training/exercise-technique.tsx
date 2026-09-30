import { CircleAlert, Gauge, MoveDown, Wind } from "lucide-react";
import type { Exercise } from "@/types";
import { ExerciseDemo } from "@/components/training/exercise-demo";

export function ExerciseTechnique({ exercise }: { exercise: Exercise }) {
  return (
    <div className="exercise-technique">
      <ExerciseDemo exercise={exercise} />
      <section className="technique-purpose">
        <Gauge size={20} />
        <div><small>PARA QUÉ SIRVE</small><p>{exercise.benefit}</p></div>
      </section>

      <section className="technique-section">
        <small>ANTES DE COMENZAR</small>
        <p>{exercise.setup}</p>
      </section>

      <section className="technique-section">
        <small>HAZLO EN TRES PASOS</small>
        <ol>{exercise.phases.map((phase, index) => <li key={phase}><i>{index + 1}</i><span>{phase}</span></li>)}</ol>
        <p className="technique-key"><MoveDown size={16} /><span><b>Clave:</b> {exercise.cue}</span></p>
      </section>

      <div className="technique-grid">
        <section><Wind size={18} /><small>RESPIRACIÓN</small><p>{exercise.breathing}</p></section>
        <section><Gauge size={18} /><small>VERSIÓN MÁS FÁCIL</small><p>{exercise.adaptation}</p></section>
      </div>

      <aside className="technique-warning"><CircleAlert size={19} /><div><strong>Evita este error</strong><p>{exercise.avoid}</p><span>Detente si aparece dolor agudo, mareo o pérdida de equilibrio.</span></div></aside>
    </div>
  );
}
