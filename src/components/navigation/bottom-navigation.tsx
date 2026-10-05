"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesColumn, Dumbbell, House, Play, Salad, UserRound, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { clockLabel, completedSets, durationSeconds, totalSets } from "@/lib/training";
import { useDraft } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; match?: string[] };

const items: NavItem[] = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/entrenar", label: "Entrenar", icon: Dumbbell, match: ["/entrenar", "/ejercicios"] },
  { href: "/comidas", label: "Alimentación", icon: Salad },
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
              <Link key={item.href} href={item.href} aria-current={current ? "page" : undefined} className={cn("nav-item", current && "nav-item-active", item.label.length > 9 && "nav-item-long")}>
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

/** Acceso permanente al entrenamiento en curso, como un mini reproductor. */
function ResumeBanner() {
  const [draft] = useDraft();
  const now = useNow(1000);
  if (!draft) return null;
  const elapsed = now ? durationSeconds(draft, now) : draft.elapsedSeconds;
  return (
    <Link href="/entrenar/sesion" className="nav-resume" aria-label={`Volver al entrenamiento en curso: ${draft.name}`}>
      <span className="pulse-dot" aria-hidden="true" />
      <span className="grow">
        <strong>{draft.name}</strong>
        <small><span className="num">{clockLabel(elapsed)}</span> · {completedSets(draft.records)}/{totalSets(draft.records)} series{draft.runningSince === null ? " · En pausa" : ""}</small>
      </span>
      <span className="resume-go" aria-hidden="true"><Play size={16} fill="currentColor" /></span>
    </Link>
  );
}
