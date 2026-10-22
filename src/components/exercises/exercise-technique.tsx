import Image from "next/image";
import { ChevronDown, CircleAlert, Feather, Timer, Wind } from "lucide-react";
import { equipmentLabels, muscleLabels } from "@/data/catalog";
import { normalEffort, rangeOfMotion, stopSigns, tempoCue } from "@/data/technique";
import { ExerciseVisual, exercisePhoto } from "@/components/exercises/exercise-visual";
import { MuscleMap } from "@/components/ui/muscle-map";
import type { ExerciseWhy } from "@/lib/selection";
import { joinList } from "@/lib/utils";
import type { Exercise } from "@/types";

export function equipmentText(exercise: Exercise) {
  if (!exercise.equipment.length) return "Peso corporal";
  return exercise.equipment.map((option) => option.map((item) => equipmentLabels[item]).join(" + ")).join(" o ");
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
 * Cómo hacer un ejercicio, de lo esencial a lo completo: por qué está en tu sesión (si se sabe), los
 * tres pasos, el recorrido de inicio a final con su ritmo, qué debes sentir y cuándo detenerte. La clave,
 * los errores comunes, los músculos, la respiración y la versión más fácil quedan en «Ver técnica completa».
 * `showBenefit={false}` omite «Para qué sirve» cuando la pantalla ya lo muestra.
 */
export function ExerciseTechnique({ exercise, why, showBenefit = true }: { exercise: Exercise; why?: ExerciseWhy | null; showBenefit?: boolean }) {
  const id = `tq-${exercise.id}`;
  const tempo = tempoCue(exercise);
  const muscles = joinList(exercise.primary.map((muscle) => muscleLabels[muscle].toLowerCase()));
  const feel = exercise.category === "cardio" ? null : exercise.category === "mobility" ? `Estiramiento en ${muscles}.` : `Trabajo en ${muscles}.`;
  return (
    <div className="exercise-technique lib-tq">
      {why && (
        <section className="lib-tq-block" aria-labelledby={`${id}-why`}>
          <h3 id={`${id}-why`} className="meta">Por qué está aquí</h3>
          <p className="lib-tq-lead">{why.role}</p>
          <p className="lib-tq-setup">{why.variant}</p>
        </section>
      )}

      <section className="lib-tq-block" aria-labelledby={`${id}-how`}>
        <h3 id={`${id}-how`} className="meta">Hazlo así</h3>
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

      <section className="lib-tq-block" aria-labelledby={`${id}-rom`}>
        <h3 id={`${id}-rom`} className="meta">Recorrido</h3>
        <TechniqueVisual exercise={exercise} />
        <p className="lib-tq-setup">{rangeOfMotion[exercise.pattern]}</p>
        {tempo && <p className="lib-tq-tempo"><Timer size={16} aria-hidden="true" />{tempo}</p>}
      </section>

      <section className="lib-tq-block" aria-labelledby={`${id}-feel`}>
        <h3 id={`${id}-feel`} className="meta">Debes sentir</h3>
        {feel && <p className="lib-tq-lead">{feel}</p>}
        <p className="lib-tq-setup">{normalEffort(exercise)}</p>
      </section>

      <section className="lib-tq-mistakes" aria-labelledby={`${id}-stop`}>
        <h3 id={`${id}-stop`} className="lib-tq-mistakes-title">
          <CircleAlert size={17} aria-hidden="true" />
          Detente si aparece
        </h3>
        <ul className="lib-tq-stop">
          {stopSigns.map((sign) => <li key={sign}>{sign}</li>)}
        </ul>
        <small>Si no se va al detenerte, consulta a un profesional de salud.</small>
      </section>

      <details className="lib-tq-more">
        <summary>Ver técnica completa <ChevronDown size={17} aria-hidden="true" /></summary>
        <div className="lib-tq-more-body">
          {showBenefit && (
            <section className="lib-tq-block" aria-labelledby={`${id}-benefit`}>
              <h3 id={`${id}-benefit`} className="meta">Para qué sirve</h3>
              <p className="lib-tq-lead">{exercise.benefit}</p>
            </section>
          )}

          <figure className="lib-tq-cue">
            <figcaption className="meta">La clave</figcaption>
            <blockquote><p>{exercise.cue}</p></blockquote>
          </figure>

          <section className="lib-tq-block" aria-labelledby={`${id}-avoid`}>
            <h3 id={`${id}-avoid`} className="meta">Errores comunes</h3>
            <p className="lib-tq-setup">{exercise.avoid}</p>
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
      </details>
    </div>
  );
}
