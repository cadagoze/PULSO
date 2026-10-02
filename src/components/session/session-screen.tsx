"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode, RefObject } from "react";
import { cn } from "@/lib/utils";

/**
 * Mientras la pantalla está montada, la barra del sistema (`theme-color`) usa el fondo oscuro
 * de la sesión, para que la barra de estado del iPhone no rompa la inmersión. Se restaura al salir.
 */
function useDarkStatusBar(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const color = getComputedStyle(node).getPropertyValue("--bg").trim();
    const metas = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));
    if (!color || !metas.length) return;
    const previous = metas.map((meta) => meta.content);
    for (const meta of metas) meta.content = color;
    return () => metas.forEach((meta, index) => { meta.content = previous[index]; });
  }, [ref]);
}

/** Zona oscura a pantalla completa (sesión, resumen e intervalos), sea cual sea el tema de la app. */
export function SessionScreen({ className, children, label }: { className?: string; children: ReactNode; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useDarkStatusBar(ref);
  return <div ref={ref} className={cn("ses-screen on-dark", className)} aria-label={label}>{children}</div>;
}

const subscribeResize = (notify: () => void) => {
  window.addEventListener("resize", notify);
  return () => window.removeEventListener("resize", notify);
};
const viewportSnapshot = () => `${window.innerWidth}x${window.innerHeight}`;

/** Tamaño de la ventana (390×844 en el servidor), para dimensionar relojes y anillos. */
export function useViewport() {
  const snapshot = useSyncExternalStore(subscribeResize, viewportSnapshot, () => "390x844");
  const [width, height] = snapshot.split("x").map(Number);
  return { width, height };
}

/** Medida real de un elemento (ResizeObserver): así el CSS (svh, áreas seguras, escritorio) decide el tamaño. */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((current) => (current && Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1 ? current : { width, height }));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

/** Respeta «reducir movimiento» también en desplazamientos y animaciones hechas con JavaScript. */
export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
