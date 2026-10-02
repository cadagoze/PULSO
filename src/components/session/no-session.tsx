"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Plus, Timer } from "lucide-react";
import { useStartWorkout } from "@/lib/session";

/** Sin entrenamiento en curso: un estado tranquilo, en el mismo lenguaje oscuro, con caminos claros para empezar. */
export function NoSession() {
  const start = useStartWorkout();
  return (
    <div className="ses-empty">
      <Link href="/entrenar" className="ses-glass ses-round ses-empty-back" aria-label="Volver a Entrenar"><ArrowLeft size={20} /></Link>
      <div className="ses-empty-body">
        <p className="ses-empty-clock num-display" aria-hidden="true">00:00</p>
        <p className="meta">Sin entrenamiento en curso</p>
        <h1>Listo cuando tú lo estés</h1>
        <p className="ses-empty-text">Empieza en blanco y agrega ejercicios a medida que avanzas, o elige una sesión preparada para ti.</p>
        <div className="ses-empty-actions">
          <button
            type="button"
            className="btn btn-primary btn-large btn-block"
            onClick={() => start({ name: "Entrenamiento libre", records: [], source: { type: "free" } })}
          >
            <Plus size={19} /> Empezar entrenamiento libre
          </button>
          <Link href="/entrenar" className="btn btn-secondary btn-block">Elegir entrenamiento <ArrowRight size={17} /></Link>
          <Link href="/entrenar/intervalos" className="btn btn-ghost btn-block"><Timer size={17} /> Temporizador de intervalos</Link>
        </div>
      </div>
    </div>
  );
}

export function SessionSkeleton() {
  return (
    <div className="ses-skeleton" aria-busy="true" aria-label="Cargando entrenamiento">
      <span className="ses-skeleton-hero" />
      <span className="ses-skeleton-line" />
      <span className="ses-skeleton-block" />
    </div>
  );
}
