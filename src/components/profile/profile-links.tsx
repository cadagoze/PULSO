"use client";

import Link from "@/components/ui/app-link";
import type { CSSProperties, ReactNode } from "react";
import { Bell, BookOpen, ChevronRight, ClipboardCheck, Dumbbell, Palette, RotateCcw, ShieldCheck, Smartphone } from "lucide-react";

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

/** Preferencias agrupadas (entrenamiento, apariencia, datos y privacidad) y, debajo, lo demás. */
export function ProfileLinks({ hasProfile, onAssess, onInstall }: { hasProfile: boolean; onAssess: () => void; onInstall?: () => void }) {
  return (
    <>
      <section className="prof-links rise" style={{ "--i": 3 } as CSSProperties} aria-labelledby="prof-links-title">
        <h2 id="prof-links-title" className="meta">Preferencias</h2>
        <div className="list">
          <Link href="/ajustes#entrenamiento" className="list-row">
            <RowBody icon={<Dumbbell size={19} />} title="Entrenamiento" detail="Lugar, equipamiento, descanso, sonido y pantalla." />
          </Link>
          <Link href="/ajustes#apariencia" className="list-row">
            <RowBody icon={<Palette size={19} />} title="Apariencia" detail="Tema, color y fotos." />
          </Link>
          <Link href="/ajustes#avisos" className="list-row">
            <RowBody icon={<Bell size={19} />} title="Notificaciones" detail="Hora de entrenar, racha, comidas y agua." />
          </Link>
          <Link href="/ajustes#datos" className="list-row">
            <RowBody icon={<ShieldCheck size={19} />} title="Datos y privacidad" detail="Respaldo, exportación y cómo cuidamos tus datos." />
          </Link>
        </div>
      </section>
      <section className="prof-links rise" style={{ "--i": 4 } as CSSProperties} aria-labelledby="prof-more-title">
        <h2 id="prof-more-title" className="meta">Más</h2>
        <div className="list">
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
          {onInstall && (
            <button type="button" className="list-row" onClick={onInstall}>
              <RowBody icon={<Smartphone size={19} />} title="Instalar en tu teléfono" detail="Ábrela con un toque desde tu pantalla de inicio." />
            </button>
          )}
        </div>
      </section>
    </>
  );
}
