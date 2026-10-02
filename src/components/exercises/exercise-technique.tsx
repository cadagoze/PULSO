import { CircleAlert, Gauge, MoveDown, Wind } from "lucide-react";
import { equipmentLabels, muscleLabels } from "@/data/catalog";
import { ExerciseVisual } from "@/components/exercises/exercise-visual";
import { MuscleMap } from "@/components/ui/muscle-map";
import type { Exercise } from "@/types";

export function equipmentText(exercise: Exercise) {
  if (!exercise.equipment.length) return "Peso corporal";
  return exercise.equipment.map((option) => option.map((item) => equipmentLabels[item]).join(" + ")).join(" o ");
}

export function targetText(exercise: Exercise, sets = exercise.sets) {
  const [low, high] = exercise.range;
  return `${sets} × ${low === high ? low : `${low}–${high}`} ${exercise.unit === "reps" ? "rep." : "s"}${exercise.unilateral ? " por lado" : ""}`;
}

/** Ficha técnica completa de un ejercicio. */
export function ExerciseTechnique({ exercise, showVisual = true }: { exercise: Exercise; showVisual?: boolean }) {
  return (
    <div className="exercise-technique">
      {showVisual && <ExerciseVisual exercise={exercise} size="hero" />}
      <section className="technique-map">
        <MuscleMap primary={exercise.primary} secondary={exercise.secondary} captions={false} label={`Músculos trabajados: ${exercise.muscle}`} />
        <div className="technique-muscles">
          <p className="eyebrow">Músculos que trabajas</p>
          {exercise.primary.map((muscle) => <span key={muscle} className="badge">{muscleLabels[muscle]}</span>)}
          {exercise.secondary.map((muscle) => <span key={muscle} className="badge badge-muted">{muscleLabels[muscle]}</span>)}
        </div>
      </section>
      <section className="technique-block">
        <p className="eyebrow">Para qué sirve</p>
        <p>{exercise.benefit}</p>
      </section>
      <section className="technique-block">
        <p className="eyebrow">Preparación</p>
        <p>{exercise.setup}</p>
      </section>
      <section className="technique-block">
        <p className="eyebrow">En tres pasos</p>
        <ol className="technique-steps">{exercise.phases.map((phase, index) => <li key={phase}><i className="num">{index + 1}</i><span>{phase}</span></li>)}</ol>
        <p className="technique-key"><MoveDown size={16} /><span><b>Clave:</b> {exercise.cue}</span></p>
      </section>
      <div className="technique-grid">
        <section><Wind size={18} /><p className="eyebrow">Respiración</p><p>{exercise.breathing}</p></section>
        <section><Gauge size={18} /><p className="eyebrow">Versión más fácil</p><p>{exercise.adaptation}</p></section>
      </div>
      <aside className="notice warn"><CircleAlert size={18} /><div><strong>Evita este error</strong><p>{exercise.avoid}</p><small className="muted">Detente si aparece dolor agudo, mareo o pérdida de equilibrio.</small></div></aside>
    </div>
  );
}
