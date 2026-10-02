"use client";

import { useMemo } from "react";
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Unit } from "@/components/progress/format";
import { formatShortDate, toDisplayWeight } from "@/lib/utils";
import type { WeightEntry } from "@/types";

const WINDOW = 7;
const initialSize = { width: 320, height: 220 };

interface Point {
  date: string;
  weight: number;
  average: number;
}

type TooltipPoint = Point;

function series(entries: WeightEntry[], unit: Unit): Point[] {
  return entries.map((entry, index) => {
    const slice = entries.slice(Math.max(0, index - WINDOW + 1), index + 1);
    const average = slice.reduce((sum, item) => sum + item.weight, 0) / slice.length;
    return { date: entry.date, weight: toDisplayWeight(entry.weight, unit), average: toDisplayWeight(average, unit) };
  });
}

function paddedDomain(points: Point[]): [number, number] {
  const values = points.flatMap((point) => [point.weight, point.average]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(0.5, (max - min) * 0.2);
  return [Math.floor((min - pad) * 2) / 2, Math.ceil((max + pad) * 2) / 2];
}

function ticksFor([low, high]: [number, number]) {
  const range = high - low;
  const step = range <= 3 ? 0.5 : range <= 6 ? 1 : range <= 12 ? 2 : 5;
  const ticks: number[] = [];
  for (let value = Math.ceil(low / step) * step; value <= high + 0.001; value += step) ticks.push(Math.round(value * 10) / 10);
  return ticks;
}

/** Registros (puntos) y media de 7 registros (línea, que se dibuja una vez al aparecer; respeta «reducir movimiento»). */
export function WeightChart({ entries, unit }: { entries: WeightEntry[]; unit: Unit }) {
  // Datos estables entre renders: la línea sólo vuelve a dibujarse si cambian los registros.
  const data = useMemo(() => series(entries, unit), [entries, unit]);
  const domain = paddedDomain(data);
  const ticks = ticksFor(domain);
  const number = (value: number) => value.toLocaleString("es-CL", { maximumFractionDigits: 1 });
  const latest = data.at(-1);

  return (
    <figure className="prog-weight-chart">
      <div
        style={{ height: 220 }}
        role="img"
        aria-label={`Peso en ${entries.length} registros. Media actual ${latest ? number(latest.average) : "—"} ${unit}.`}
      >
        <ResponsiveContainer width="100%" height="100%" initialDimension={initialSize}>
          <ComposedChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--ink-3)", fontSize: 11 }}
              tickFormatter={formatShortDate}
              minTickGap={24}
            />
            <YAxis
              domain={domain}
              axisLine={false}
              tickLine={false}
              width={44}
              tick={{ fill: "var(--ink-3)", fontSize: 11 }}
              tickFormatter={number}
              ticks={ticks}
              interval={0}
            />
            <Tooltip
              cursor={{ stroke: "var(--line-strong)" }}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as TooltipPoint | undefined;
                if (!active || !point) return null;
                return (
                  <div className="prog-tooltip">
                    <span>{formatShortDate(point.date)}</span>
                    <strong className="num">{number(point.weight)} {unit}</strong>
                    <span className="num">Media {number(point.average)} {unit}</span>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="average"
              stroke="var(--lime-text)"
              strokeWidth={2.5}
              dot={false}
              activeDot={false}
              isAnimationActive="auto"
              animationDuration={700}
              animationEasing="ease-out"
            />
            <Line
              type="linear"
              dataKey="weight"
              stroke="transparent"
              dot={{ r: 4, fill: "var(--surface)", stroke: "var(--ink-3)", strokeWidth: 2 }}
              activeDot={{ r: 5, fill: "var(--lime)", stroke: "var(--surface)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="prog-weight-legend">
        <span><i className="dot" aria-hidden="true" />Registro</span>
        <span><i className="line" aria-hidden="true" />Media de {WINDOW} registros</span>
      </figcaption>
    </figure>
  );
}
