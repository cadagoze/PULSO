"use client";

import Link from "@/components/ui/app-link";
import { usePathname } from "next/navigation";
import { ChartNoAxesColumn, Dumbbell, House, Pause, Play, Salad, Square, UserRound, type LucideIcon } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { clockLabel, completedSets, durationSeconds, totalSets } from "@/lib/training";
import { DraftEndSheet, useDraftControls } from "@/components/session/draft-controls";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; match?: string[] };

const items: NavItem[] = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/entrenar", label: "Entrenar", icon: Dumbbell, match: ["/entrenar", "/ejercicios"] },
  { href: "/comidas", label: "Nutrición", icon: Salad },
  { href: "/progreso", label: "Progreso", icon: ChartNoAxesColumn },
  { href: "/perfil", label: "Perfil", icon: UserRound, match: ["/perfil", "/ajustes", "/guia"] },
];

/** Pantallas a pantalla completa, sin navegación. */
export const focusRoutes = ["/entrenar/sesion", "/entrenar/intervalos"];

function activeIndex(pathname: string) {
  return items.findIndex((item) => item.href === "/" ? pathname === "/" : (item.match ?? [item.href]).some((href) => pathname.startsWith(href)));
}

export function BottomNavigation() {
  const pathname = usePathname();
  if (focusRoutes.some((route) => pathname.startsWith(route))) return null;
  const active = activeIndex(pathname);

  return (
    <>
      <ResumeBanner />
      <nav className="bottom-nav on-dark" aria-label="Navegación principal">
        <div className="bottom-nav-inner" style={{ "--index": Math.max(0, active) } as CSSProperties}>
          <span className={cn("nav-indicator", active < 0 && "is-hidden")} aria-hidden="true" />
          {items.map((item, index) => {
            const current = index === active;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} aria-current={current ? "page" : undefined} className={cn("nav-item", current && "nav-item-active")}>
                <span className="nav-icon"><Icon size={21} strokeWidth={current ? 2.2 : 1.8} /></span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

/**
 * Acceso permanente al entrenamiento en curso, como un mini reproductor: tocarlo vuelve a la sesión;
 * los botones pausan o reanudan el reloj y abren las opciones para terminar o descartar.
 */
function ResumeBanner() {
  const { draft, paused, togglePause } = useDraftControls();
  const [ending, setEnding] = useState(false);
  const now = useNow(1000);
  if (!draft) return null;
  const elapsed = now ? durationSeconds(draft, now) : draft.elapsedSeconds;
  return (
    <>
      <div className={cn("nav-resume", paused && "is-paused")}>
        <Link href="/entrenar/sesion" className="nav-resume-link" aria-label={`Volver al entrenamiento en curso: ${draft.name}`}>
          <span className="pulse-dot" aria-hidden="true" />
          <span className="grow">
            <strong>{draft.name}</strong>
            <small><span className="num">{clockLabel(elapsed)}</span> · {completedSets(draft.records)}/{totalSets(draft.records)} series{paused ? " · En pausa" : ""}</small>
          </span>
        </Link>
        <button type="button" className="resume-btn resume-go" onClick={togglePause} aria-label={paused ? "Reanudar el reloj" : "Pausar el reloj"}>
          {paused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
        </button>
        <button type="button" className="resume-btn resume-end" onClick={() => setEnding(true)} aria-label="Terminar o descartar el entrenamiento">
          <Square size={14} fill="currentColor" />
        </button>
      </div>
      <DraftEndSheet open={ending} onClose={() => setEnding(false)} />
    </>
  );
}
