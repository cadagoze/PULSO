"use client";

import { useMemo } from "react";
import { TrendChart } from "@/components/ui/trend-chart";
import type { Unit } from "@/components/progress/format";
import { formatShortDate, toDisplayWeight } from "@/lib/utils";
import type { WeightEntry } from "@/types";

const WINDOW = 7;

interface Point {
  date: string;
  weight: number;
  average: number;
}

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
  const data = useMemo(() => series(entries, unit), [entries, unit]);
  const domain = paddedDomain(data);
  const number = (value: number) => value.toLocaleString("es-CL", { maximumFractionDigits: 1 });
  const latest = data.at(-1);

  return (
    <figure className="prog-weight-chart">
      <TrendChart
        labels={data.map((point) => point.date)}
        series={[{ values: data.map((point) => point.average), kind: "line" }, { values: data.map((point) => point.weight), kind: "dots" }]}
        domain={domain}
        ticks={ticksFor(domain)}
        height={220}
        formatY={number}
        formatX={formatShortDate}
        label={`Peso en ${entries.length} registros. Media actual ${latest ? number(latest.average) : "—"} ${unit}.`}
        tooltip={(index) => (
          <>
            <span>{formatShortDate(data[index].date)}</span>
            <strong className="num">{number(data[index].weight)} {unit}</strong>
            <span className="num">Media {number(data[index].average)} {unit}</span>
          </>
        )}
      />
      <figcaption className="prog-weight-legend">
        <span><i className="dot" aria-hidden="true" />Registro</span>
        <span><i className="line" aria-hidden="true" />Media de {WINDOW} registros</span>
      </figcaption>
    </figure>
  );
}
