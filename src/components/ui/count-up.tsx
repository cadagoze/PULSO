"use client";

import { useEffect, useRef, useState } from "react";
import { formatCount, parseCount } from "@/lib/count";

/** Sólo cuenta al entrar a la pantalla (o cuando llega el dato guardado, justo después): nunca en cada cambio ni al hacer scroll. */
const ENTRY_WINDOW_MS = 1500;
const DURATION_MS = 650;

/**
 * Número que sube desde cero al aparecer (breve, con frenado suave). Con «reducir movimiento», o si el
 * texto no es un número, se muestra tal cual. Los lectores de pantalla leen sólo el valor final.
 */
export function CountUp({ value }: { value: string | number }) {
  const text = typeof value === "number" ? value.toLocaleString("es-CL") : value;
  const [frame, setFrame] = useState<string | null>(null);
  const mountedAt = useRef(0);

  useEffect(() => {
    mountedAt.current = performance.now();
  }, []);

  useEffect(() => {
    const parsed = parseCount(text);
    if (!parsed || parsed.value === 0) return;
    if (performance.now() - mountedAt.current > ENTRY_WINDOW_MS) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - (1 - progress) ** 3;
      if (progress < 1) {
        setFrame(formatCount(parsed.value * eased, parsed.digits, parsed.pad));
        raf = requestAnimationFrame(tick);
      } else {
        setFrame(null);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      setFrame(null);
    };
  }, [text]);

  if (frame === null) return <>{text}</>;
  return (
    <>
      <span aria-hidden="true">{frame}</span>
      <span className="sr-only">{text}</span>
    </>
  );
}
