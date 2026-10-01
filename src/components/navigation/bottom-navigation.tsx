"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesCombined, ChevronRight, Dumbbell, House, Library, UserRound, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { clockLabel, completedSets, durationSeconds, totalSets } from "@/lib/training";
import { useDraft } from "@/lib/store";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; primary?: boolean; match?: string[] };

const items: NavItem[] = [
  { href: "/", label: "Hoy", icon: House },
  { href: "/ejercicios", label: "Ejercicios", icon: Library },
  { href: "/entrenar", label: "Entrenar", icon: Dumbbell, primary: true },
  { href: "/progreso", label: "Progreso", icon: ChartNoAxesCombined },
  { href: "/perfil", label: "Perfil", icon: UserRound, match: ["/perfil", "/guia", "/comidas"] },
];

/** Pantallas a pantalla completa, sin navegación. */
export const focusRoutes = ["/entrenar/sesion", "/entrenar/intervalos"];

export function BottomNavigation() {
  const pathname = usePathname();
  if (focusRoutes.some((route) => pathname.startsWith(route))) return null;

  return (
    <>
      <ResumeBanner />
      <nav className="bottom-nav" aria-label="Navegación principal">
        <Link href="/" className="nav-brand">PULSO<span>.</span><small>Tu salud en movimiento.</small></Link>
        <div className="bottom-nav-inner">
          {items.map((item) => {
            const active = item.href === "/" ? pathname === "/" : (item.match ?? [item.href]).some((href) => pathname.startsWith(href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("nav-item", item.primary && "nav-item-primary", active && "nav-item-active")}>
                <span className="nav-icon"><Icon size={item.primary ? 22 : 20} strokeWidth={item.primary || active ? 2.4 : 1.9} /></span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

/** Acceso permanente al entrenamiento en curso, como los mini reproductores de las apps líderes. */
function ResumeBanner() {
  const [draft] = useDraft();
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!draft) return;
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 1000);
    return () => { window.clearTimeout(first); window.clearInterval(interval); };
  }, [draft]);
  if (!draft) return null;
  const elapsed = now ? durationSeconds(draft, now) : draft.elapsedSeconds;
  return (
    <Link href="/entrenar/sesion" className="nav-resume" aria-label={`Volver al entrenamiento en curso: ${draft.name}`}>
      <span className="pulse-dot" aria-hidden="true" />
      <span className="grow">
        <strong>{draft.name}</strong>
        <small><span className="num">{clockLabel(elapsed)}</span> · {completedSets(draft.records)}/{totalSets(draft.records)} series{draft.runningSince === null ? " · En pausa" : ""}</small>
      </span>
      <ChevronRight size={20} />
    </Link>
  );
}
