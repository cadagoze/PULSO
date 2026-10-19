"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { labelIndexes, monotonePath } from "@/lib/chart";
import { cn } from "@/lib/utils";

export interface TrendSeries {
  values: number[];
  /** "line": curva suave (con área y puntos opcionales); "dots": sólo puntos (registros sueltos). */
  kind: "line" | "dots";
  area?: boolean;
  dots?: boolean;
}

const PAD = { top: 12, right: 10, bottom: 26, left: 42 };

/**
 * Gráfico de línea propio, liviano y sin librería: rejilla, ejes, curva que se dibuja una vez al aparecer
 * (respeta «reducir movimiento») y el detalle del punto al tocar, pasar el mouse o usar las flechas.
 */
export function TrendChart({ labels, series, domain, ticks, height, formatY, formatX = (label) => label, tooltip, label, className }: {
  labels: string[];
  series: TrendSeries[];
  domain: [number, number];
  ticks: number[];
  height: number;
  formatY: (value: number) => string;
  formatX?: (label: string) => string;
  tooltip: (index: number) => ReactNode;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const [active, setActive] = useState<number | null>(null);
  const gradient = `trend-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(200, Math.round(entry.contentRect.width))));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const count = labels.length;
  const plotWidth = width - PAD.left - PAD.right;
  const plotHeight = height - PAD.top - PAD.bottom;
  const [low, high] = domain;
  const x = (index: number) => PAD.left + (count === 1 ? plotWidth / 2 : (index * plotWidth) / (count - 1));
  const y = (value: number) => PAD.top + (1 - (value - low) / (high - low || 1)) * plotHeight;
  const shown = labelIndexes(count, plotWidth);

  function pick(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const offset = event.clientX - box.left - PAD.left;
    setActive(count === 1 ? 0 : Math.max(0, Math.min(count - 1, Math.round((offset / plotWidth) * (count - 1)))));
  }

  function move(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setActive((current) => Math.max(0, Math.min(count - 1, (current ?? count - 1) + (event.key === "ArrowLeft" ? -1 : 1))));
  }

  return (
    <div
      ref={ref}
      className={cn("trend", className)}
      style={{ height }}
      role="img"
      aria-label={label}
      tabIndex={0}
      onPointerMove={pick}
      onPointerDown={pick}
      onPointerLeave={(event) => { if (event.pointerType === "mouse") setActive(null); }}
      onKeyDown={move}
      onBlur={() => setActive(null)}
    >
      <svg width={width} height={height} aria-hidden="true">
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-text)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--accent-text)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} className="trend-grid" />
            <text x={PAD.left - 8} y={y(tick)} className="trend-label" textAnchor="end" dominantBaseline="middle">{formatY(tick)}</text>
          </g>
        ))}
        {shown.map((index) => (
          <text key={index} x={x(index)} y={height - 6} className="trend-label" textAnchor={index === count - 1 && count > 1 ? "end" : index === 0 && count > 1 ? "start" : "middle"}>{formatX(labels[index])}</text>
        ))}
        {active !== null && <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotHeight} className="trend-cursor" />}
        {series.map((item, seriesIndex) => {
          // Un valor ilegible no rompe el gráfico: ese punto simplemente no se dibuja.
          const points = item.values.flatMap((value, index) => (Number.isFinite(value) ? [[x(index), y(value)] as [number, number]] : []));
          const path = monotonePath(points);
          return (
            <g key={seriesIndex}>
              {item.kind === "line" && item.area && points.length > 1 && (
                <path d={`${path}L${points[points.length - 1][0]},${PAD.top + plotHeight}L${points[0][0]},${PAD.top + plotHeight}Z`} fill={`url(#${gradient})`} className="trend-area" />
              )}
              {item.kind === "line" && <path d={path} pathLength={1} className="trend-line" />}
              {(item.kind === "dots" || item.dots) && item.values.map((value, index) => Number.isFinite(value) && (
                <circle key={index} cx={x(index)} cy={y(value)} r={active === index ? 5.5 : item.kind === "dots" ? 4 : 3.25} className={cn("trend-dot", item.kind === "dots" && "is-plain", active === index && "is-active")} />
              ))}
            </g>
          );
        })}
      </svg>
      {active !== null && (
        <div className="trend-tooltip" style={{ left: Math.max(70, Math.min(width - 70, x(active))) }}>{tooltip(active)}</div>
      )}
    </div>
  );
}
