"use client";

import { Activity, ArrowDownRight, Gauge, TriangleAlert } from "lucide-react";
import { trainingLoad } from "@/lib/analytics";
import type { WorkoutEntry } from "@/types";

const MAX_RATIO = 2;
const CENTER = 100;
const RADIUS = 78;

const statusCopy = {
  low: { title: "Carga baja: puedes subir de a poco", icon: ArrowDownRight, tone: "low" },
  optimal: { title: "Zona óptima", icon: Activity, tone: "ok" },
  high: { title: "Subida brusca: prioriza recuperar", icon: TriangleAlert, tone: "high" },
  unknown: { title: "Aún faltan datos", icon: Gauge, tone: "unknown" },
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

export function LoadCard({ workouts, now }: { workouts: WorkoutEntry[]; now: number }) {
  const load = trainingLoad(workouts, now);
  const copy = statusCopy[load.status];
  const Icon = copy.icon;
  const needle = point(load.ratio ?? 0, RADIUS - 20);
  const ratioText = load.ratio === null ? "—" : load.ratio.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <section className="card card-l prog-load" aria-labelledby="prog-load-title">
      <div className="prog-card-head">
        <div>
          <h2 id="prog-load-title">Carga de entrenamiento</h2>
          <p className="muted prog-card-sub">Esfuerzo × minutos de cada sesión</p>
        </div>
        <span className="badge badge-muted">Orientativo</span>
      </div>
      <div className="prog-load-body">
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
            <span>relación 7 d : 28 d</span>
          </div>
        </div>
        <div className="prog-load-info">
          <p className={`prog-load-status ${copy.tone}`}>
            <Icon size={18} aria-hidden="true" />
            <span>{copy.title}</span>
          </p>
          <dl className="prog-load-stats">
            <div>
              <dt>Aguda · 7 días</dt>
              <dd className="num">{load.acute.toLocaleString("es-CL")}</dd>
            </div>
            <div>
              <dt>Crónica · media semanal 28 días</dt>
              <dd className="num">{load.chronic.toLocaleString("es-CL")}</dd>
            </div>
          </dl>
          <p className="subtle prog-load-note">
            {load.status === "unknown"
              ? "Registra algunas semanas para comparar tu carga reciente con tu base."
              : "Compara tu última semana con tu promedio del último mes. Es una guía, no un diagnóstico: escucha también cómo te sientes."}
          </p>
        </div>
      </div>
    </section>
  );
}
