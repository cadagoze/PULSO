"use client";

import Link from "next/link";
import { ArrowRight, Scale } from "lucide-react";
import { NumberMetric } from "@/components/ui";
import { signed, weightLabel } from "@/components/progress/format";
import type { Period } from "@/components/progress/period";
import { markFromSummary, subviewHref } from "@/components/progress/progress-nav";
import { Sparkline } from "@/components/progress/sparkline";
import { WeightLogButton } from "@/components/progress/weight-sheet";
import { useSettings, useWeights } from "@/lib/store";
import { formatShortDate, localDateKey, toDisplayWeight } from "@/lib/utils";

/**
 * Último peso, su tendencia y una línea mínima. El peso cambia despacio: la ventana es de al menos 30 días
 * (12 meses en «Año») y la variación se ancla a una fecha concreta.
 */
export function WeightSummary({ period, nowMs }: { period: Period; nowMs: number }) {
  const [entries] = useWeights();
  const [settings] = useSettings();
  const unit = settings.unit;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted.at(-1);
  const now = new Date(nowMs);
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (period === "ano" ? 365 : 30), 12);
  const fromKey = localDateKey(from);
  const before = sorted.filter((entry) => entry.date <= fromKey).at(-1);
  const base = before ?? sorted.find((entry) => entry.date > fromKey);
  const points = base ? sorted.filter((entry) => entry.date >= base.date) : [];
  const value = last ? toDisplayWeight(last.weight, unit).toLocaleString("es-CL", { maximumFractionDigits: 1 }) : "";
  const format = (kg: number) => weightLabel(kg, unit);

  return (
    <section className="section prog-weight-summary" aria-labelledby="prog-weight-summary-title">
      <div className="section-head">
        <h2 id="prog-weight-summary-title">Peso</h2>
        <Link href={subviewHref("cuerpo")} onClick={markFromSummary}>Cuerpo<ArrowRight size={15} aria-hidden="true" /></Link>
      </div>
      <div className="card prog-weight-card">
        {last ? (
          <>
            <p className="meta">Último registro · {formatShortDate(last.date)}</p>
            <div className="prog-weight-top">
              <NumberMetric
                size="m"
                value={value}
                unit={unit}
                label={base && points.length > 1 ? `${signed(last.weight - base.weight, format)} desde el ${formatShortDate(base.date)}` : "Registra otro día para ver tu tendencia."}
              />
              {points.length > 1 && (
                <Sparkline
                  values={points.map((entry) => toDisplayWeight(entry.weight, unit))}
                  label={`Tendencia de peso desde el ${formatShortDate(points[0].date)}: de ${format(points[0].weight)} a ${format(last.weight)}`}
                  revealKey={`weight-${period === "ano" ? "ano" : "mes"}`}
                />
              )}
            </div>
            <WeightLogButton />
          </>
        ) : (
          <div className="prog-weight-empty">
            <span className="icon-tile muted" aria-hidden="true"><Scale size={18} /></span>
            <p>
              <strong>Sin registros de peso</strong>
              <small>Pésate cuando quieras, en condiciones parecidas, y verás tu tendencia.</small>
            </p>
            <WeightLogButton />
          </div>
        )}
      </div>
    </section>
  );
}
