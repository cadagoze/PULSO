import Image from "next/image";
import { CircleAlert, Feather, Wind } from "lucide-react";
import { equipmentLabels, muscleLabels } from "@/data/catalog";
import { ExerciseVisual, exercisePhoto } from "@/components/exercises/exercise-visual";
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

/** Inicio y final del movimiento: los dos recortes de la foto, o la ilustración en dos pasos. */
function TechniqueVisual({ exercise }: { exercise: Exercise }) {
  const start = exercisePhoto(exercise, "start");
  const end = exercisePhoto(exercise, "end");
  if (!start || !end) return <ExerciseVisual exercise={exercise} size="hero" />;
  return (
    <div className="lib-tq-pair">
      {[{ src: start, label: "Inicio" }, { src: end, label: "Final" }].map((photo) => (
        <figure key={photo.label} className="lib-tq-photo photo on-dark">
          <Image src={photo.src} alt={`${exercise.name}: posición ${photo.label.toLowerCase()}`} fill sizes="(max-width: 720px) 50vw, 300px" className="photo-img" />
          <figcaption className="photo-tag glass photo-content">{photo.label}</figcaption>
        </figure>
      ))}
    </div>
  );
}

/**
 * Ficha técnica completa de un ejercicio, en tono editorial: pasos numerados, la clave,
 * errores comunes, músculos, respiración y versión más fácil.
 * `showBenefit={false}` omite «Para qué sirve» cuando la pantalla ya lo muestra.
 */
export function ExerciseTechnique({ exercise, showVisual = true, showBenefit = true }: { exercise: Exercise; showVisual?: boolean; showBenefit?: boolean }) {
  const id = `tq-${exercise.id}`;
  return (
    <div className="exercise-technique lib-tq">
      {showVisual && <TechniqueVisual exercise={exercise} />}

      {showBenefit && (
        <section className="lib-tq-block" aria-labelledby={`${id}-benefit`}>
          <h3 id={`${id}-benefit`} className="meta">Para qué sirve</h3>
          <p className="lib-tq-lead">{exercise.benefit}</p>
        </section>
      )}

      <section className="lib-tq-block" aria-labelledby={`${id}-how`}>
        <h3 id={`${id}-how`} className="meta">Cómo se hace</h3>
        <p className="lib-tq-setup">{exercise.setup}</p>
        <ol className="lib-tq-steps">
          {exercise.phases.map((phase, index) => (
            <li key={phase}>
              <span className="lib-tq-step-num num-display" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span className="lib-tq-step-text">{phase}</span>
            </li>
          ))}
        </ol>
      </section>

      <figure className="lib-tq-cue">
        <figcaption className="meta">La clave</figcaption>
        <blockquote><p>{exercise.cue}</p></blockquote>
      </figure>

      <section className="lib-tq-mistakes" aria-labelledby={`${id}-avoid`}>
        <h3 id={`${id}-avoid`} className="lib-tq-mistakes-title">
          <CircleAlert size={17} aria-hidden="true" />
          Errores comunes
        </h3>
        <p>{exercise.avoid}</p>
        <small>Detente si aparece dolor agudo, mareo o pérdida de equilibrio.</small>
      </section>

      <section className="lib-tq-muscles" aria-labelledby={`${id}-muscles`}>
        <h3 id={`${id}-muscles`} className="meta lib-tq-muscles-title">Músculos que trabajas</h3>
        <MuscleMap primary={exercise.primary} secondary={exercise.secondary} className="lib-tq-map" label={`Músculos trabajados: ${exercise.muscle}`} />
        <div className="lib-tq-muscle-list">
          <div>
            <p className="lib-tq-key"><i className="lib-tq-key-primary" aria-hidden="true" />Principales</p>
            <p className="lib-tq-muscle-names">{exercise.primary.map((muscle) => muscleLabels[muscle]).join(" · ")}</p>
          </div>
          {exercise.secondary.length > 0 && (
            <div>
              <p className="lib-tq-key"><i className="lib-tq-key-secondary" aria-hidden="true" />De apoyo</p>
              <p className="lib-tq-muscle-names is-secondary">{exercise.secondary.map((muscle) => muscleLabels[muscle]).join(" · ")}</p>
            </div>
          )}
        </div>
      </section>

      <div className="list lib-tq-notes">
        <section className="lib-tq-note" aria-labelledby={`${id}-breath`}>
          <span className="icon-tile" aria-hidden="true"><Wind size={18} /></span>
          <div>
            <h3 id={`${id}-breath`}>Respiración</h3>
            <p>{exercise.breathing}</p>
          </div>
        </section>
        <section className="lib-tq-note" aria-labelledby={`${id}-easier`}>
          <span className="icon-tile" aria-hidden="true"><Feather size={18} /></span>
          <div>
            <h3 id={`${id}-easier`}>Versión más fácil</h3>
            <p>{exercise.adaptation}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
