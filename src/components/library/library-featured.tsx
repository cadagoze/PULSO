import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { exercises } from "@/data/mock-data";
import { exercisePhoto } from "@/components/exercises/exercise-visual";
import type { Exercise } from "@/types";

/** Los ejercicios con fotografía real: los básicos para empezar. */
const featured = exercises
  .map((exercise) => ({ exercise, photo: exercisePhoto(exercise, "end") }))
  .filter((item): item is { exercise: Exercise; photo: string } => item.photo !== null);

/** Fila destacada con fotografía: rompe la cuadrícula y lleva a los básicos de la biblioteca. */
export function LibraryFeatured() {
  if (!featured.length) return null;
  return (
    <section className="lib-featured rise" style={{ "--i": 2 } as CSSProperties} aria-labelledby="lib-featured-title">
      <div className="lib-section-head">
        <h2 id="lib-featured-title" className="meta">Para empezar</h2>
        <span className="meta lib-section-note">{featured.length} con foto</span>
      </div>
      <div className="scroll-x lib-featured-row">
        {featured.map(({ exercise, photo }, index) => (
          <Link key={exercise.id} href={`/ejercicios/${exercise.id}`} className="lib-feature photo grain on-dark">
            <Image
              src={photo}
              alt=""
              fill
              sizes="(max-width: 720px) 46vw, 240px"
              className="photo-img"
              preload={index < 2}
              loading={index < 2 ? "eager" : undefined}
            />
            <span className="lib-feature-num num photo-content" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <span className="lib-feature-body photo-content">
              <strong>{exercise.name}</strong>
              <small>{exercise.muscle}</small>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
