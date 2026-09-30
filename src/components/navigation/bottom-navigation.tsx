"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesCombined, House, Dumbbell, Sparkles, Utensils, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; primary?: boolean };

const items: NavItem[] = [
  { href: "/", label: "Hoy", icon: House },
  { href: "/entrenar", label: "Entrenar", icon: Dumbbell, primary: true },
  { href: "/progreso", label: "Historial", icon: ChartNoAxesCombined },
  { href: "/guia", label: "Guía", icon: Sparkles },
  { href: "/comidas", label: "Comidas", icon: Utensils },
];

export function BottomNavigation() {
  const pathname = usePathname();
  if (pathname === "/entrenar/sesion") return null;

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      <Link href="/" className="nav-brand">PULSO<span>.</span><small>Tu salud en movimiento.</small></Link>
      <div className="bottom-nav-inner">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("nav-item", item.primary && "nav-item-primary", active && "nav-item-active")}>
              <span className="nav-icon"><Icon size={item.primary ? 23 : 21} strokeWidth={item.primary || active ? 2.5 : 1.8} /></span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
