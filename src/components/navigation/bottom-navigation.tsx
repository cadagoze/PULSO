"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesCombined, Dumbbell, House, Sparkles, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Hoy", icon: House },
  { href: "/entrenar", label: "Entrenar", icon: Dumbbell },
  { href: "/comidas", label: "Comidas", icon: Utensils },
  { href: "/progreso", label: "Progreso", icon: ChartNoAxesCombined },
  { href: "/guia", label: "Guía", icon: Sparkles },
];

export function BottomNavigation() {
  const pathname = usePathname();
  if (pathname === "/entrenar/sesion") return null;

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      <div className="bottom-nav-inner">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("nav-item", active && "nav-item-active")}>
              <span className="nav-icon"><Icon size={21} strokeWidth={active ? 2.5 : 1.8} /></span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
