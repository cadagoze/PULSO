"use client";

import Link from "next/link";
import { ArrowLeft, Dumbbell, Plus, Timer } from "lucide-react";
import { useStartWorkout } from "@/lib/session";

export function NoSession() {
  const start = useStartWorkout();
  return (
    <div className="ses-empty">
      <Link href="/entrenar" className="btn-icon ses-empty-back" aria-label="Volver a Entrenar"><ArrowLeft size={20} /></Link>
      <div className="ses-empty-body">
        <span className="ses-empty-mark" aria-hidden="true"><Dumbbell size={30} /></span>
        <p className="eyebrow">Registro de entrenamiento</p>
        <h1>No hay entrenamiento en curso</h1>
        <p className="muted">
          Empieza en blanco y agrega ejercicios a medida que avanzas, o elige una sesión preparada para ti.
        </p>
        <div className="ses-empty-actions">
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => start({ name: "Entrenamiento libre", records: [], source: { type: "free" } })}
          >
            <Plus size={18} /> Empezar entrenamiento libre
          </button>
          <Link href="/entrenar" className="btn btn-secondary btn-block">Elegir entrenamiento</Link>
          <Link href="/entrenar/intervalos" className="btn btn-ghost btn-block"><Timer size={17} /> Temporizador de intervalos</Link>
        </div>
      </div>
    </div>
  );
}

export function SessionSkeleton() {
  return (
    <div className="ses-skeleton" aria-busy="true" aria-label="Cargando entrenamiento">
      <span />
      <span />
      <span />
    </div>
  );
}
