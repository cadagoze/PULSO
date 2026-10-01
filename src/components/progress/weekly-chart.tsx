"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { weeklySeries } from "@/lib/analytics";
import { volumeLabel, type Unit } from "@/components/progress/format";
import type { WorkoutEntry } from "@/types";

type Metric = "sessions" | "sets" | "volume";

const initialSize = { width: 320, height: 210 };

const metrics: Array<{ value: Metric; label: string }> = [
  { value: "sessions", label: "Sesiones" },
  { value: "sets", label: "Series" },
  { value: "volume", label: "Volumen" },
];

interface WeeklyChartProps {
  workouts: WorkoutEntry[];
  now: Date;
  goal: number;
  unit: Unit;
}

function shortWeek(start: string) {
  const [, month, day] = start.split("-");
  return `${Number(day)}/${Number(month)}`;
}

type TooltipPoint = { label: string; value: number };

export function WeeklyChart({ workouts, now, goal, unit }: WeeklyChartProps) {
  const [metric, setMetric] = useState<Metric>("sessions");
  const time = now.getTime();
  const series = useMemo(() => weeklySeries(workouts, 8, new Date(time)), [workouts, time]);
  const format = (value: number) => metric === "volume" ? volumeLabel(value, unit) : Math.round(value).toLocaleString("es-CL");
  const data = useMemo(() => series.map((week) => ({ label: shortWeek(week.start), value: week[metric] })), [series, metric]);
  const average = data.slice(0, -1).reduce((sum, item) => sum + item.value, 0) / Math.max(1, data.length - 1);
  const compactTick = (value: number) => {
    if (metric !== "volume") return value.toLocaleString("es-CL");
    const shown = unit === "lb" ? value * 2.20462 : value;
    return shown >= 1000 ? `${(shown / 1000).toLocaleString("es-CL", { maximumFractionDigits: 1 })}k` : String(Math.round(shown));
  };

  return (
    <section className="card prog-chart-card" aria-labelledby="prog-weekly-title">
      <div className="prog-card-head">
        <div>
          <h2 id="prog-weekly-title">Últimas 8 semanas</h2>
          <p className="muted prog-card-sub">
            Promedio <span className="num">{format(average)}</span> por semana
          </p>
        </div>
      </div>
      <div className="chips prog-metric-toggle" role="group" aria-label="Métrica del gráfico">
        {metrics.map((item) => (
          <button
            key={item.value}
            type="button"
            className="chip"
            aria-pressed={metric === item.value}
            onClick={() => setMetric(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="prog-chart" style={{ height: 210 }} role="img" aria-label={`${metrics.find((item) => item.value === metric)?.label} por semana: ${data.map((item) => `${item.label} ${format(item.value)}`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={initialSize}>
          <BarChart data={data} margin={{ top: 12, right: 4, left: -16, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--ink-3)", fontSize: 11 }} interval={0} />
            <YAxis
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={44}
              tick={{ fill: "var(--ink-3)", fontSize: 11 }}
              tickFormatter={compactTick}
              domain={metric === "sessions" ? [0, Math.max(goal + 1, ...data.map((item) => item.value))] : [0, "auto"]}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              content={({ active, payload }) => {
                const item = payload?.[0]?.payload as TooltipPoint | undefined;
                if (!active || !item) return null;
                return (
                  <div className="prog-tooltip">
                    <span>Semana del {item.label}</span>
                    <strong className="num">{format(item.value)}</strong>
                  </div>
                );
              }}
            />
            {metric === "sessions" && (
              <ReferenceLine
                y={goal}
                stroke="var(--ink-3)"
                strokeDasharray="4 4"
                label={{ value: `Meta ${goal}`, position: "insideTopRight", fill: "var(--ink-2)", fontSize: 11 }}
              />
            )}
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
              {data.map((item, index) => (
                <Cell
                  key={item.label}
                  fill={index === data.length - 1 ? "var(--lime)" : "var(--lime-text)"}
                  fillOpacity={index === data.length - 1 ? 1 : 0.55}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="prog-chart-note subtle">La barra brillante es la semana en curso.</p>
    </section>
  );
}
