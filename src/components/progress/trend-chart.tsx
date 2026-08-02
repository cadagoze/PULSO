"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WeightEntry } from "@/types";
import { formatWeight } from "@/lib/utils";

export function TrendChart({ data, compact = false }: { data: WeightEntry[]; compact?: boolean }) {
  return (
    <div className={compact ? "chart-compact" : "chart-large"} aria-label="Tendencia descendente del peso">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: compact ? 0 : 8, left: compact ? 0 : -20, bottom: 0 }}>
          <defs><linearGradient id={`weight-${compact}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c7f432" stopOpacity={0.28} /><stop offset="100%" stopColor="#c7f432" stopOpacity={0} /></linearGradient></defs>
          {!compact && <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#737b77", fontSize: 11 }} interval={1} />}
          <YAxis domain={[81.8, 84.4]} hide={compact} axisLine={false} tickLine={false} tick={{ fill: "#737b77", fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "#181d1e", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12 }} formatter={(value) => [`${formatWeight(Number(value))} kg`, "Peso"]} labelStyle={{ color: "#969e9a" }} />
          <Area type="monotone" dataKey="weight" stroke="#c7f432" strokeWidth={compact ? 2 : 3} fill={`url(#weight-${compact})`} dot={false} activeDot={{ r: 4, fill: "#c7f432", stroke: "#07090a", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
