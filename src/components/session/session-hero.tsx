"use client";

import { useRef } from "react";
import type { MouseEvent, PointerEvent, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ExerciseVisual } from "@/components/exercises/exercise-visual";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/types";
import { useElementSize } from "./session-screen";

/** Distancia horizontal mínima (px) para cambiar de ejercicio deslizando sobre la imagen. */
const SWIPE = 56;

/**
 * Imagen grande del ejercicio (foto o ilustración sobre atmósfera) que se funde con el fondo.
 * Encima: la barra superior, el descanso y las flechas para pasar de ejercicio (también deslizando).
 */
export function SessionHero({ exercise, mediaKey, direction, prev, next, onPrev, onNext, onTechnique, topBar, overlay }: {
  exercise?: Exercise;
  /** Abrir la técnica completa (al tocar la imagen o el botón). */
  onTechnique?: () => void;
  mediaKey: string;
  direction: 1 | -1;
  prev?: string;
  next?: string;
  onPrev: () => void;
  onNext: () => void;
  topBar: ReactNode;
  /** Capa sobre la imagen (el descanso), con el tamaño de anillo que cabe en su hueco. */
  overlay?: (ringSize: number) => ReactNode;
}) {
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  // Hueco libre entre la barra superior y el nombre (deja sitio a las flechas laterales).
  const [slotRef, slot] = useElementSize<HTMLSpanElement>();
  const ringSize = slot ? Math.round(Math.max(120, Math.min(320, slot.height - 14, slot.width - 120))) : 200;

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    swiped.current = false;
    if (event.pointerType === "mouse" || (event.target as HTMLElement).closest("button, a, input")) return;
    swipe.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    swiped.current = true;
    if (dx < 0 && next) onNext();
    if (dx > 0 && prev) onPrev();
  };
  // Un toque o clic sobre la imagen (no un deslizamiento ni un botón) abre la técnica completa.
  const onClick = (event: MouseEvent<HTMLElement>) => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    if ((event.target as HTMLElement).closest("button, a, input")) return;
    onTechnique?.();
  };

  return (
    <section
      className="ses-hero"
      aria-label={exercise ? `Ejercicio actual: ${exercise.name}` : "Entrenamiento"}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { swipe.current = null; }}
      onClick={onClick}
    >
      <div key={mediaKey} className={cn("ses-hero-media", direction < 0 && "from-prev")}>
        {exercise ? (
          <ExerciseVisual exercise={exercise} size="immersive" eager />
        ) : (
          <div className="ses-hero-cover atmosphere grain" aria-hidden="true">
            <span className="num-display">00</span>
            <span className="meta">Ejercicios</span>
          </div>
        )}
      </div>
      <span className="ses-hero-shade" aria-hidden="true" />

      <span ref={slotRef} className="ses-rest-slot" aria-hidden="true" />
      {overlay?.(ringSize)}
      {topBar}
      {prev && (
        <button type="button" className="ses-glass ses-round ses-hero-nav is-prev" onClick={onPrev} aria-label={`Ejercicio anterior: ${prev}`}>
          <ChevronLeft size={22} />
        </button>
      )}
      {next && (
        <button type="button" className="ses-glass ses-round ses-hero-nav is-next" onClick={onNext} aria-label={`Siguiente ejercicio: ${next}`}>
          <ChevronRight size={22} />
        </button>
      )}
    </section>
  );
}
