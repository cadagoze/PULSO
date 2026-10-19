"use client";

import { TrendChart } from "@/components/ui/trend-chart";
import { integerTicks } from "@/lib/chart";
import { formatNumber } from "@/lib/utils";

export interface ChartPoint {
  label: string;
  value: number;
}

/**
 * Evolución por sesión de una sola métrica (1RM estimado, repeticiones o segundos): curva con área
 * que se dibuja una vez al montarse (respeta «reducir movimiento») y el valor de cada sesión al tocar.
 */
export function ProgressChart({ data, unit, metric }: { data: ChartPoint[]; unit: string; metric: string }) {
  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(1, (max - min) * 0.2);
  const domain: [number, number] = [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)];

  return (
    <TrendChart
      className="lib-chart"
      labels={data.map((point) => point.label)}
      series={[{ values, kind: "line", area: true, dots: true }]}
      domain={domain}
      ticks={integerTicks(domain)}
      height={200}
      formatY={(value) => formatNumber(value, 0)}
      label={`${metric}: de ${formatNumber(values[0])} a ${formatNumber(values[values.length - 1])} ${unit} en ${data.length} sesiones`}
      tooltip={(index) => (
        <>
          <span>{data[index].label}</span>
          <strong className="num">{formatNumber(values[index])} {unit}</strong>
          <span>{metric}</span>
        </>
      )}
    />
  );
}
