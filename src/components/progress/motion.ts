"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

/** Entradas que ya se animaron en esta sesión: nada repite su animación al volver a verlo. */
const played = new Set<string>();

/** `true` sólo la primera vez que se monta algo con esta clave (pequeños detalles que aparecen al montar). */
export function useFirstReveal(key: string) {
  const [first] = useState(() => !played.has(key));
  useEffect(() => {
    played.add(key);
  }, [key]);
  return first;
}

/**
 * Entrada de un gráfico la primera vez que se ve, una sola vez por sesión (no al hacer scroll otra vez).
 * Si al montar ya está en pantalla, anima de inmediato; si no, queda en espera con `data-reveal="armed"`
 * (el CSS lo oculta) y pasa a `data-reveal="playing"` al entrar en la zona visible. Con «reducir movimiento», nada.
 */
export function useRevealOnView(key: string, ref: RefObject<HTMLElement | SVGSVGElement | null>) {
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || played.has(key)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      played.add(key);
      return;
    }
    const play = () => {
      node.dataset.reveal = "playing";
      played.add(key);
    };
    const rect = node.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < window.innerHeight * 0.7) {
      play();
      return;
    }
    node.dataset.reveal = "armed";
    // La barra de navegación flota abajo: se espera a que el gráfico suba por encima de ella.
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      play();
    }, { rootMargin: "0px 0px -30% 0px" });
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (node.dataset.reveal === "armed") delete node.dataset.reveal;
    };
  }, [key, ref]);
}
