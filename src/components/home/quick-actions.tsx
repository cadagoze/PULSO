"use client";

import Link from "@/components/ui/app-link";
import { Armchair, BookOpen, Scale, Utensils, type LucideIcon } from "lucide-react";

const actions: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/comidas?registrar=1", label: "Añadir comida", icon: Utensils },
  { href: "/pausas", label: "Pausa activa", icon: Armchair },
  { href: "/ejercicios", label: "Ejercicios", icon: BookOpen },
  { href: "/progreso?tab=cuerpo", label: "Registrar peso", icon: Scale },
];

/** Accesos rápidos de Inicio: lo que se hace a diario, a un toque. */
export function QuickActions() {
  return (
    <nav className="home-quick" aria-labelledby="home-quick-title">
      <h2 id="home-quick-title" className="meta">Accesos rápidos</h2>
      <ul>
        {actions.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="home-quick-item">
              <span className="home-quick-icon" aria-hidden="true"><Icon size={20} /></span>
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
