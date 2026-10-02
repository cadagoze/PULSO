"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/utils";

export interface ChartPoint {
  label: string;
  value: number;
}

const axisTick = { fill: "var(--ink-3)", fontSize: 11, fontFamily: "var(--font-mono)" };

/**
 * Evolución por sesión de una sola métrica (1RM estimado, repeticiones o segundos).
 * La curva crece desde la base una sola vez al montarse (animación CSS, respeta «reducir movimiento»).
 */
export function ProgressChart({ data, unit, metric }: { data: ChartPoint[]; unit: string; metric: string }) {
  const gradientId = `lib-grad-${useId().replace(/:/g, "")}`;
  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(1, (max - min) * 0.2);

  return (
    <div className="lib-chart" role="img" aria-label={`${metric}: de ${formatNumber(values[0])} a ${formatNumber(values[values.length - 1])} ${unit} en ${data.length} sesiones`}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 200 }}>
        <AreaChart data={data} margin={{ top: 12, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--lime-text)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--lime-text)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={axisTick}
            minTickGap={18}
            tickMargin={10}
          />
          <YAxis
            domain={[Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)]}
            axisLine={false}
            tickLine={false}
            tick={axisTick}
            width={34}
            tickCount={4}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: "var(--line-strong)" }}
            contentStyle={{ background: "var(--surface)", border: 0, borderRadius: 14, boxShadow: "var(--shadow-float)", fontSize: 13, padding: "8px 12px" }}
            labelStyle={{ color: "var(--ink-3)", marginBottom: 2 }}
            itemStyle={{ color: "var(--ink)", padding: 0 }}
            separator=": "
            formatter={(value) => [`${formatNumber(Number(value))} ${unit}`, metric]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--lime-text)"
            strokeWidth={2.25}
            fill={`url(#${gradientId})`}
            dot={{ r: 3.25, fill: "var(--surface)", stroke: "var(--lime-text)", strokeWidth: 2 }}
            activeDot={{ r: 5.5, fill: "var(--lime-text)", stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
