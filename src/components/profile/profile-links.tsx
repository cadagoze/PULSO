"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { BookOpen, ChevronRight, ClipboardCheck, DatabaseBackup, RotateCcw, Settings, Utensils } from "lucide-react";

function RowBody({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <>
      <span className="icon-tile" aria-hidden="true">{icon}</span>
      <span className="grow">
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <ChevronRight size={18} className="subtle" aria-hidden="true" />
    </>
  );
}

/** Accesos ligeros bajo el plan: ajustes, nutrición, guía, evaluación y respaldo. */
export function ProfileLinks({ hasProfile, onAssess }: { hasProfile: boolean; onAssess: () => void }) {
  return (
    <section className="prof-links rise" style={{ "--i": 2 } as CSSProperties} aria-labelledby="prof-links-title">
      <h2 id="prof-links-title" className="meta">Ajustes y más</h2>
      <div className="list">
        <Link href="/ajustes" className="list-row">
          <RowBody icon={<Settings size={19} />} title="Ajustes" detail="Tema, unidades, descanso, sonido y racha." />
        </Link>
        <Link href="/comidas" className="list-row">
          <RowBody icon={<Utensils size={19} />} title="Nutrición" detail="Calorías, agua, comidas y hábitos del día." />
        </Link>
        <Link href="/guia" className="list-row">
          <RowBody icon={<BookOpen size={19} />} title="Guía" detail="Lecturas breves sobre fuerza, descanso y alimentación." />
        </Link>
        <button type="button" className="list-row" onClick={onAssess}>
          <RowBody
            icon={hasProfile ? <RotateCcw size={19} /> : <ClipboardCheck size={19} />}
            title={hasProfile ? "Rehacer evaluación" : "Hacer evaluación"}
            detail="Toma unos dos minutos. Tus entrenamientos se conservan."
          />
        </button>
        <Link href="/ajustes#datos" className="list-row">
          <RowBody icon={<DatabaseBackup size={19} />} title="Respaldo de datos" detail="Exporta o importa todo lo que has registrado." />
        </Link>
      </div>
    </section>
  );
}
