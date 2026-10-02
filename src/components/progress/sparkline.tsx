"use client";

import { useRef } from "react";
import { useRevealOnView } from "@/components/progress/motion";

const WIDTH = 132;
const HEIGHT = 52;
const PAD = 6;

/** Línea de tendencia mínima (sin ejes): se dibuja de izquierda a derecha la primera vez que se ve y marca el último valor. */
export function Sparkline({ values, label, revealKey }: { values: number[]; label: string; revealKey: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useRevealOnView(revealKey, ref);
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.5, max - min);
  const points = values.map((value, index) => ({
    x: PAD + (index / (values.length - 1)) * (WIDTH - PAD * 2),
    y: PAD + (1 - (value - min) / span) * (HEIGHT - PAD * 2),
  }));
  const d = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1];

  return (
    <svg ref={ref} className="prog-spark" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} role="img" aria-label={label}>
      <path d={d} pathLength={1} className="prog-spark-line" />
      <circle cx={last.x} cy={last.y} r={4.5} className="prog-spark-dot" />
    </svg>
  );
}
