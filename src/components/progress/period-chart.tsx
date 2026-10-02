"use client";

import { useId, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { minutesLabel, minutesParts, sessionsLabel, volumeLabel, volumeParts, type Unit } from "@/components/progress/format";
import { useRevealOnView } from "@/components/progress/motion";
import type { Bucket, PeriodSummary } from "@/components/progress/period";
import { cn, formatNumber } from "@/lib/utils";

export type ChartMetric = "volume" | "minutes" | "sets";

const metricOptions: Array<{ value: ChartMetric; label: string }> = [
  { value: "volume", label: "Volumen" },
  { value: "minutes", label: "Tiempo" },
  { value: "sets", label: "Series" },
];

/** Volumen por defecto; si el periodo no tiene carga externa (peso corporal, intervalos), tiempo. */
export function defaultMetric(summary: PeriodSummary): ChartMetric {
  return summary.totals.volume > 0 || summary.totals.minutes === 0 ? "volume" : "minutes";
}

function parts(metric: ChartMetric, value: number, unit: Unit) {
  if (metric === "volume") return volumeParts(value, unit);
  if (metric === "minutes") return minutesParts(value);
  return { value: formatNumber(value), unit: value === 1 ? "serie" : "series" };
}

function text(metric: ChartMetric, value: number, unit: Unit) {
  const { value: number, unit: suffix } = parts(metric, value, unit);
  return `${number} ${suffix}`;
}

function bucketContext(bucket: Bucket, metric: ChartMetric, grain: PeriodSummary["grain"], unit: Unit) {
  if (bucket.future) return "Por venir";
  if (!bucket.sessions) return grain === "día" ? "Descanso" : "Sin entrenamientos";
  const other = metric === "volume" ? minutesLabel(bucket.minutes) : bucket.volume > 0 ? volumeLabel(bucket.volume, unit) : minutesLabel(bucket.minutes);
  return `${sessionsLabel(bucket.sessions)} · ${other}`;
}

const emptyCopy: Record<PeriodSummary["period"], string> = {
  semana: "Aún no entrenas esta semana.",
  mes: "Nada registrado en los últimos 30 días.",
  ano: "Nada registrado en los últimos 12 meses.",
};

const emptyMetric: Record<ChartMetric, string> = {
  volume: "Sin series con carga en este periodo.",
  minutes: "Sin tiempo registrado en este periodo.",
  sets: "Sin series registradas en este periodo.",
};

/**
 * Un gráfico simple por periodo: barras por día o por mes sobre fondo carbón.
 * Las barras crecen desde la base la primera vez que el gráfico de cada periodo entra en pantalla; al cambiar de métrica se transforman.
 * Tocar, pasar el puntero o usar las flechas muestra el detalle de una barra.
 */
export function PeriodChart({ summary, metric, onMetric, unit }: { summary: PeriodSummary; metric: ChartMetric; onMetric: (metric: ChartMetric) => void; unit: Unit }) {
  const plotRef = useRef<HTMLDivElement>(null);
  useRevealOnView(`chart-${summary.period}`, plotRef);
  const readoutId = useId();
  const [pinned, setPinned] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const { buckets, totals, grain } = summary;
  const active = hover ?? pinned;
  const bucket = active === null ? null : buckets[active];
  const max = Math.max(0, ...buckets.map((item) => item[metric]));
  const lastPast = buckets.reduce((last, item, index) => (item.future ? last : index), 0);
  const metricLabel = metricOptions.find((option) => option.value === metric)?.label ?? "";
  const title = `${metricLabel} por ${grain}`;

  const readout = bucket
    ? { label: bucket.long, ...parts(metric, bucket[metric], unit), context: bucketContext(bucket, metric, grain, unit) }
    : totals.sessions
      ? { label: "Media por sesión", ...parts(metric, totals[metric] / totals.sessions, unit), context: `${text(metric, totals[metric], unit)} en ${sessionsLabel(totals.sessions)}` }
      : { label: "Sin entrenamientos", ...parts(metric, 0, unit), context: emptyCopy[summary.period] };

  function indexAt(event: MouseEvent<HTMLDivElement> | PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / Math.max(1, rect.width);
    return Math.max(0, Math.min(buckets.length - 1, Math.floor(ratio * buckets.length)));
  }

  function onClick(event: MouseEvent<HTMLDivElement>) {
    const index = indexAt(event);
    setPinned((current) => (current === index ? null : index));
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") setHover(indexAt(event));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, (current: number) => number> = {
      ArrowRight: (current) => Math.min(lastPast, current + 1),
      ArrowLeft: (current) => Math.max(0, current - 1),
      Home: () => 0,
      End: () => lastPast,
    };
    if (event.key === "Escape") { setPinned(null); return; }
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setHover(null);
    setPinned((current) => move(current ?? lastPast));
  }

  return (
    <section className="card card-l card-carbon on-dark prog-chart-card" aria-labelledby={`${readoutId}-title`}>
      <h2 id={`${readoutId}-title`} className="sr-only">{title}</h2>
      <div className="chips prog-chart-metrics" role="group" aria-label="Métrica del gráfico">
        {metricOptions.map((option) => (
          <button key={option.value} type="button" className="chip" aria-pressed={metric === option.value} onClick={() => onMetric(option.value)}>
            {option.label}
          </button>
        ))}
      </div>

      <div className="prog-readout" id={readoutId} aria-live="polite">
        <p className="meta">{readout.label}</p>
        <p className="prog-readout-value"><span className="num">{readout.value}</span> <span className="prog-readout-unit">{readout.unit}</span></p>
        <p className="prog-readout-context">{readout.context}</p>
      </div>

      <div ref={plotRef} className={cn("prog-plot", grain === "día" && buckets.length > 7 && "is-dense")} style={{ "--count": buckets.length, "--stagger": `${Math.round(320 / buckets.length)}ms` } as CSSProperties}>
        {max > 0 && <p className="prog-plot-max" aria-hidden="true"><span className="num">{text(metric, max, unit)}</span></p>}
        <div
          className="prog-bars"
          role="group"
          tabIndex={0}
          aria-label={`${title}. Toca una barra o usa las flechas para ver el detalle.`}
          aria-describedby={readoutId}
          onClick={onClick}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKeyDown}
          onBlur={() => setHover(null)}
        >
          {buckets.map((item, index) => {
            const value = item[metric];
            const scaled = max > 0 && value > 0 ? Math.max(0.035, value / max) : 0;
            return (
              <span
                key={item.key}
                className={cn("prog-col", item.future && "is-future", !value && "is-empty", active === index && "is-active", active !== null && active !== index && "is-dim")}
                style={{ "--v": scaled, "--i": index } as CSSProperties}
                aria-hidden="true"
              >
                <span className="prog-bar" />
              </span>
            );
          })}
        </div>
        <div className="prog-axis" aria-hidden="true">
          {buckets.map((item, index) => (
            <span key={item.key} className={cn(item.current && "is-current", item.future && "is-future", active === index && "is-active")}>{item.short}</span>
          ))}
        </div>
        {max === 0 && <p className="prog-plot-empty">{totals.sessions ? emptyMetric[metric] : emptyCopy[summary.period]}</p>}
      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr><th scope="col">{grain === "día" ? "Día" : "Mes"}</th><th scope="col">{metricLabel}</th><th scope="col">Sesiones</th></tr>
        </thead>
        <tbody>
          {buckets.filter((item) => !item.future).map((item) => (
            <tr key={item.key}><th scope="row">{item.long}</th><td>{text(metric, item[metric], unit)}</td><td>{item.sessions}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
