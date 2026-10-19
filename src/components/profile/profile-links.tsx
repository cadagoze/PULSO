"use client";

import Link from "@/components/ui/app-link";
import type { CSSProperties, ReactNode } from "react";
import { ChevronRight, HeartPulse, Settings } from "lucide-react";

function Row({ href, icon, title, detail }: { href: string; icon: ReactNode; title: string; detail: string }) {
  return (
    <Link href={href} className="list-row">
      <span className="icon-tile" aria-hidden="true">{icon}</span>
      <span className="grow">
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <ChevronRight size={18} className="subtle" aria-hidden="true" />
    </Link>
  );
}

/** Al final de Perfil: tu bienestar (lo que ajusta tu sesión) y Ajustes (apariencia, avisos, cuenta y datos). */
export function ProfileLinks() {
  return (
    <nav className="prof-links rise" style={{ "--i": 3 } as CSSProperties} aria-label="Más de tu perfil">
      <div className="list">
        <Row href="/bienestar" icon={<HeartPulse size={19} />} title="Bienestar" detail="Energía, molestias, sueño y recuperación." />
        <Row href="/ajustes" icon={<Settings size={19} />} title="Ajustes" detail="Apariencia, entrenamiento, avisos, cuenta y datos." />
      </div>
    </nav>
  );
}
