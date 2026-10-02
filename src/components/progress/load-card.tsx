"use client";

import { Activity, ArrowDownRight, Gauge, TriangleAlert } from "lucide-react";
import { trainingLoad } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { WorkoutEntry } from "@/types";

const MAX_RATIO = 2;
const CENTER = 100;
const RADIUS = 78;

export const loadStatusCopy = {
  low: { title: "Carga baja: puedes subir de a poco", short: "Carga baja", icon: ArrowDownRight, tone: "low" },
  optimal: { title: "Zona óptima", short: "Zona óptima", icon: Activity, tone: "ok" },
  high: { title: "Subida brusca: prioriza recuperar", short: "Subida brusca", icon: TriangleAlert, tone: "high" },
  unknown: { title: "Aún faltan datos", short: "Aún faltan datos", icon: Gauge, tone: "unknown" },
} as const;

function point(ratio: number, radius = RADIUS) {
  const angle = Math.PI * (1 - Math.min(MAX_RATIO, Math.max(0, ratio)) / MAX_RATIO);
  return { x: CENTER + radius * Math.cos(angle), y: CENTER - radius * Math.sin(angle) };
}

function arc(from: number, to: number) {
  const start = point(from);
  const end = point(to);
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${RADIUS} ${RADIUS} 0 0 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export function ratioLabel(ratio: number | null) {
  return ratio === null ? "—" : ratio.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Carga de entrenamiento (relación 7 días : media de 28 días) con su medidor. Se muestra en una hoja. */
export function LoadDetails({ workouts, now }: { workouts: WorkoutEntry[]; now: number }) {
  const load = trainingLoad(workouts, now);
  const copy = loadStatusCopy[load.status];
  const Icon = copy.icon;
  const needle = point(load.ratio ?? 0, RADIUS - 20);
  const ratioText = ratioLabel(load.ratio);

  return (
    <div className="prog-load">
      <div className="prog-gauge">
        <svg viewBox="0 0 200 116" role="img" aria-label={`Relación de carga ${ratioText}. ${copy.title}`}>
          <path d={arc(0, 0.8)} className="prog-gauge-zone low" />
          <path d={arc(0.8, 1.3)} className="prog-gauge-zone ok" />
          <path d={arc(1.3, MAX_RATIO)} className="prog-gauge-zone high" />
          {load.ratio !== null && (
            <>
              <line x1={CENTER} y1={CENTER} x2={needle.x} y2={needle.y} className="prog-gauge-needle" />
              <circle cx={CENTER} cy={CENTER} r={6} className="prog-gauge-hub" />
            </>
          )}
        </svg>
        <div className="prog-gauge-value">
          <strong className="num">{ratioText}</strong>
          <span className="meta">Relación 7 d : 28 d</span>
        </div>
      </div>
      <p className={cn("prog-load-status", copy.tone)}>
        <Icon size={18} aria-hidden="true" />
        <span>{copy.title}</span>
      </p>
      <dl className="prog-load-stats">
        <div>
          <dt>Aguda · 7 días</dt>
          <dd className="num">{load.acute.toLocaleString("es-CL")}</dd>
        </div>
        <div>
          <dt>Crónica · media semanal de 28 días</dt>
          <dd className="num">{load.chronic.toLocaleString("es-CL")}</dd>
        </div>
      </dl>
      <p className="subtle prog-load-note">
        {load.status === "unknown"
          ? "Registra algunas semanas para comparar tu carga reciente con tu base."
          : "Carga = esfuerzo × minutos de cada sesión. Compara tu última semana con tu promedio del último mes. Es una guía, no un diagnóstico: escucha también cómo te sientes."}
      </p>
    </div>
  );
}
